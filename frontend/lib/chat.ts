export type ChatReplyKind = 'answer' | 'social' | 'insufficient_evidence' | 'declined';

export interface ChatResponse {
  response: string;
  session_id?: string;
  topic?: string;
  reply_kind?: ChatReplyKind;
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
  | 'guardrail'
  | 'invalid_response';

const errorMessages: Record<ChatErrorCode, string> = {
  configuration: "I'm getting set up. Please check back in a little while.",
  unavailable: "I'm having trouble connecting right now. Please try again in a moment.",
  timeout: 'That took a little too long. Give me another try.',
  rate_limit: "I'm getting a few questions at once. Please give me a moment, then try again.",
  invalid_response: "I couldn't finish that reply. Please give me another try.",
  guardrail: "I'm more at home with robots and AI! Happy to chat about my projects or how I build things.",
};

export class ChatRequestError extends Error {
  readonly code: ChatErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: ChatErrorCode, retryAfterMs?: number) {
    super(errorMessages[code]);
    this.name = 'ChatRequestError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function getChatErrorMessage(error: unknown, question = ''): string {
  if (error instanceof ChatRequestError && error.code === 'rate_limit' && /[\u0600-\u06ff]/.test(question)) {
    return 'جايلي كذا سؤال في نفس الوقت. اديني لحظة وجرب تاني.';
  }
  if (error instanceof ChatRequestError && error.code === 'guardrail' && /[\u0600-\u06ff]/.test(question)) {
    return 'دي برة تخصصي شوية! أنا في حتتي مع الروبوتات والذكاء الاصطناعي، وحابب أحكيلك عن مشاريعي.';
  }
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
      if (response.status === 429) {
        const header = response.headers.get('retry-after');
        const seconds = header ? Number(header) : NaN;
        const delay = Number.isFinite(seconds) ? seconds * 1000 : header ? Date.parse(header) - Date.now() : NaN;
        throw new ChatRequestError('rate_limit', Number.isFinite(delay) ? Math.max(0, delay) : undefined);
      }
      if (response.status === 504) throw new ChatRequestError('timeout');
      const data = await response.json().catch(() => null);
      const errorBody = data && typeof data === 'object' && 'detail' in data ? data.detail : data;
      if (errorBody && typeof errorBody === 'object' && 'code' in errorBody
        && typeof errorBody.code === 'string' && Object.hasOwn(errorMessages, errorBody.code)) {
        throw new ChatRequestError(errorBody.code as ChatErrorCode);
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

function retryDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(canceledRequest());
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(canceledRequest()); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
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
      if (error instanceof ChatRequestError && ['guardrail', 'rate_limit'].includes(error.code)) throw error;
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
    let data: unknown;
    for (let attempt = 0; ; attempt++) {
      try {
        data = await requestJson(endpoint, '/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
        }, 45_000, signal);
        break;
      } catch (error) {
        if (!(error instanceof ChatRequestError) || error.code !== 'rate_limit' || attempt === 1) throw error;
        // Never retry earlier than Retry-After. Long cooldowns return a gentle message.
        const delay = Math.max(1_200 * 2 ** attempt, error.retryAfterMs ?? 0);
        if (delay > 5_000) throw error;
        await retryDelay(delay, signal);
      }
    }
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
      reply_kind: 'reply_kind' in data && ['answer', 'social', 'insufficient_evidence', 'declined'].includes(data.reply_kind as string)
        ? data.reply_kind as ChatReplyKind
        : undefined,
    };
  }, signal);
}
