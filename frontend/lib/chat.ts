export interface ChatResponse {
  response: string;
  session_id?: string;
  topic?: string;
}

export interface ChatContext {
  history: { role: 'user' | 'assistant'; content: string }[];
  topic?: string;
}

export type ChatErrorCode =
  | 'configuration'
  | 'unavailable'
  | 'timeout'
  | 'rate_limit'
  | 'invalid_response';

const errorMessages: Record<ChatErrorCode, string> = {
  configuration: 'The AI service is not configured yet. Please try again later.',
  unavailable: 'The AI service is temporarily unavailable. Please try again shortly.',
  timeout: 'The AI service took too long to respond. Please try again.',
  rate_limit: 'The AI service is busy. Please wait a moment and try again.',
  invalid_response: 'The AI service returned an unreadable response. Please try again.',
};

export class ChatRequestError extends Error {
  readonly code: ChatErrorCode;

  constructor(code: ChatErrorCode) {
    super(errorMessages[code]);
    this.name = 'ChatRequestError';
    this.code = code;
  }
}

export function getChatErrorMessage(error: unknown): string {
  return error instanceof ChatRequestError ? error.message : errorMessages.unavailable;
}

function normalizeEndpoint(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    const loopback = /^(localhost|0\.0\.0\.0|127(?:\.\d+){3}|\[::1?\])$/i.test(url.hostname)
      || url.hostname.toLowerCase().endsWith('.localhost');
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username || url.password || url.search || url.hash
      || (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || loopback))) {
      return undefined;
    }
    return url.href.replace(/\/+$/, '');
  } catch {
    return undefined;
  }
}

function getEndpoints(): string[] {
  const target = process.env.NEXT_PUBLIC_DEPLOY_TARGET?.trim().toLowerCase() || 'vercel';
  if (target === 'vercel') return ['/api'];
  if (target !== 'aws') throw new ChatRequestError('configuration');
  const primary = process.env.NEXT_PUBLIC_API_URL?.trim()
    || (process.env.NODE_ENV !== 'production' ? 'http://localhost:8000' : undefined);
  const endpoints = [...new Set([
    primary,
    process.env.NEXT_PUBLIC_API_URL_FALLBACK?.trim(),
  ].filter((url): url is string => Boolean(url))
    .map(normalizeEndpoint).filter((url): url is string => Boolean(url)))];

  if (!endpoints.length) throw new ChatRequestError('configuration');
  return endpoints;
}

function canceledRequest(): DOMException {
  return new DOMException('Chat request canceled', 'AbortError');
}

async function requestJson(
  endpoint: string,
  path: string,
  options: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<unknown> {
  if (signal?.aborted) throw canceledRequest();
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timedOut = false;
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${endpoint}${path}`, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 429) throw new ChatRequestError('rate_limit');
      if (response.status === 504) throw new ChatRequestError('timeout');
      const data = await response.json().catch(() => null);
      if (data && typeof data === 'object' && 'code' in data
        && typeof data.code === 'string' && Object.hasOwn(errorMessages, data.code)) {
        throw new ChatRequestError(data.code as ChatErrorCode);
      }
      throw new ChatRequestError('unavailable');
    }

    try {
      return await response.json();
    } catch {
      if (signal?.aborted) throw canceledRequest();
      if (timedOut) throw new ChatRequestError('timeout');
      throw new ChatRequestError('invalid_response');
    }
  } catch (error) {
    if (signal?.aborted) throw canceledRequest();
    if (timedOut) throw new ChatRequestError('timeout');
    if (error instanceof ChatRequestError) throw error;
    throw new ChatRequestError('unavailable');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

async function withFallback<T>(
  operation: (endpoint: string) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const endpoints = getEndpoints();
  for (const [index, endpoint] of endpoints.entries()) {
    if (signal?.aborted) throw canceledRequest();
    try {
      const result = await operation(endpoint);
      if (signal?.aborted) throw canceledRequest();
      return result;
    } catch (error) {
      if (signal?.aborted || index === endpoints.length - 1) throw error;
    }
  }
  throw new ChatRequestError('unavailable');
}

export async function checkChatConnection(signal?: AbortSignal): Promise<void> {
  return withFallback(async (endpoint) => {
    const data = await requestJson(endpoint, '/health', { method: 'GET', cache: 'no-store' }, 5_000, signal);
    if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'healthy') {
      throw new ChatRequestError('invalid_response');
    }
    if ('llm_configured' in data && data.llm_configured === false) {
      throw new ChatRequestError('configuration');
    }
  }, signal);
}

export async function requestChat(
  message: string,
  sessionId?: string,
  signal?: AbortSignal,
  context?: ChatContext,
): Promise<ChatResponse> {
  const body = JSON.stringify({
    message, session_id: sessionId, history: context?.history, topic: context?.topic,
  });
  return withFallback(async (endpoint) => {
    const data = await requestJson(endpoint, '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }, 45_000, signal);
    if (!data || typeof data !== 'object' || !('response' in data)
      || typeof data.response !== 'string' || !data.response.trim()) {
      throw new ChatRequestError('invalid_response');
    }
    return {
      response: data.response,
      session_id: 'session_id' in data && typeof data.session_id === 'string' && data.session_id
        ? data.session_id
        : undefined,
      topic: 'topic' in data && typeof data.topic === 'string' && data.topic.trim()
        ? data.topic.trim().slice(0, 300)
        : undefined,
    };
  }, signal);
}
