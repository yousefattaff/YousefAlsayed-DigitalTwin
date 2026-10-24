import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
}

const transportCode = compile('../lib/chat.ts');
const widgetCode = compile('../components/ChatWidget.tsx');
const markdownCode = compile('../components/MarkdownMessage.tsx');

const markdown = {};
vm.runInNewContext(markdownCode, {
  exports: markdown,
  require(id) {
    if (id === 'react') return React;
    if (id === 'react/jsx-runtime') return { jsx, jsxs };
    throw new Error(`Unexpected markdown dependency: ${id}`);
  },
  URL,
});

function renderMarkdown(content) {
  return renderToStaticMarkup(React.createElement(markdown.MarkdownMessage, { content }));
}

function loadTransport(fetch, env = {}, timers = {}) {
  const exports = {};
  vm.runInNewContext(transportCode, {
    exports,
    process: {
      env: { NODE_ENV: 'production', NEXT_PUBLIC_DEPLOY_TARGET: 'aws', NEXT_PUBLIC_API_URL: 'https://api.example.test', ...env },
    },
    fetch,
    AbortController,
    DOMException,
    URL,
    setTimeout: timers.setTimeout ?? setTimeout,
    clearTimeout: timers.clearTimeout ?? clearTimeout,
  });
  return exports;
}

function pendingRequest() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function loadWidget(requestChat, { effects = false, checkChatConnection = async () => {} } = {}) {
  const slots = [];
  const pendingEffects = [];
  const intervals = new Map();
  const listeners = new Map();
  let cursor = 0;
  let mounted = true;
  let updatesAfterUnmount = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => {
        if (!mounted) updatesAfterUnmount++;
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!effects) return;
      const previous = slots[index];
      if (previous && dependencies.every((value, position) => Object.is(value, previous.dependencies[position]))) return;
      previous?.cleanup?.();
      const effect = { dependencies, cleanup: undefined };
      slots[index] = effect;
      pendingEffects.push(() => { effect.cleanup = callback(); });
    },
  };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/image': { default: () => null, __esModule: true },
    '@/lib/chat': {
      requestChat,
      checkChatConnection,
      getChatErrorMessage: () => 'Service unavailable.',
      ChatRequestError: class extends Error {},
    },
    '@/lib/useReducedMotion': { useReducedMotion: () => true },
    './MarkdownMessage': markdown,
  };
  vm.runInNewContext(widgetCode, {
    exports,
    require: (id) => {
      assert.ok(id in modules, `Unexpected dependency: ${id}`);
      return modules[id];
    },
    AbortController,
    crypto: globalThis.crypto,
    Date,
    setInterval(callback) {
      const id = intervals.size + 1;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) { intervals.delete(id); },
    window: {
      addEventListener(type, callback) { listeners.set(type, callback); },
      removeEventListener(type, callback) {
        if (listeners.get(type) === callback) listeners.delete(type);
      },
    },
  });
  const render = () => {
    cursor = 0;
    const tree = exports.default();
    for (const runEffect of pendingEffects.splice(0)) runEffect();
    return tree;
  };
  return {
    render,
    intervals,
    listeners,
    unmount() {
      mounted = false;
      for (const slot of slots) slot?.cleanup?.();
    },
    get updatesAfterUnmount() { return updatesAfterUnmount; },
  };
}

function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return undefined;
  }
  if (predicate(node)) return node;
  return findElement(node.props?.children, predicate);
}

function send(widget, text) {
  const input = findElement(widget.render(), (node) => node.props?.id === 'twin-chat-input');
  input.props.onChange({ target: { value: text } });
  const button = findElement(widget.render(), (node) => node.props?.children === 'Send');
  return button.props.onClick();
}

test('chat preserves real response text and carries the returned session into follow-up requests', async () => {
  const bodies = [];
  const transport = loadTransport(async (url, options) => {
    assert.equal(url, 'https://api.example.test/chat');
    bodies.push(JSON.parse(options.body));
    return Response.json({ response: 'Verified response.', session_id: 'conversation-1' });
  });
  const first = await transport.requestChat('First question');
  const second = await transport.requestChat('Follow-up', first.session_id);
  assert.equal(first.response, 'Verified response.');
  assert.equal(second.session_id, 'conversation-1');
  assert.deepEqual(bodies, [
    { message: 'First question' },
    { message: 'Follow-up', session_id: 'conversation-1' },
  ]);
});

test('an unavailable primary fails over to the configured secondary without changing the request', async () => {
  const calls = [];
  const transport = loadTransport(async (url, options) => {
    calls.push({ url, body: options.body });
    if (calls.length === 1) throw new TypeError('Network unavailable');
    return Response.json({ response: 'Live secondary reply.', session_id: 'conversation-2' });
  }, {
    NEXT_PUBLIC_API_URL: ' https://primary.example.test/// ',
    NEXT_PUBLIC_API_URL_FALLBACK: ' https://secondary.example.test/ ',
  });
  const result = await transport.requestChat('Question', 'existing-session');
  assert.equal(result.response, 'Live secondary reply.');
  assert.deepEqual(calls.map((call) => call.url), [
    'https://primary.example.test/chat', 'https://secondary.example.test/chat',
  ]);
  assert.equal(calls[0].body, calls[1].body);
});

test('a missing production API reports configuration failure and never calls localhost', async () => {
  let calls = 0;
  const transport = loadTransport(async () => { calls++; }, {
    NEXT_PUBLIC_API_URL: ' ', NEXT_PUBLIC_API_URL_FALLBACK: undefined,
  });
  await assert.rejects(transport.requestChat('Question'), (error) => error.code === 'configuration');
  assert.equal(calls, 0);
});

test('the Vercel target uses its native same-origin API even when stale external URLs exist', async () => {
  const calls = [];
  const transport = loadTransport(async (url) => {
    calls.push(url);
    return url.endsWith('/health')
      ? Response.json({ status: 'healthy', llm_configured: true })
      : Response.json({ response: 'Native reply.', session_id: 'native-session', topic: 'AI solutions' });
  }, { NEXT_PUBLIC_DEPLOY_TARGET: 'vercel', NEXT_PUBLIC_API_URL: 'http://localhost:8000', NEXT_PUBLIC_API_URL_FALLBACK: 'https://retired.example.test' });
  await transport.checkChatConnection();
  const reply = await transport.requestChat('Question');
  assert.equal(reply.response, 'Native reply.');
  assert.equal(reply.topic, 'AI solutions');
  assert.deepEqual(calls, ['/api/health', '/api/chat']);
});

test('native mode is the default and an unknown deployment target fails safely', async () => {
  const calls = [];
  const fetch = async (url) => { calls.push(url); return Response.json({ response: 'Native reply.' }); };
  await loadTransport(fetch, { NEXT_PUBLIC_DEPLOY_TARGET: undefined }).requestChat('Question');
  assert.deepEqual(calls, ['/api/chat']);
  await assert.rejects(loadTransport(fetch, { NEXT_PUBLIC_DEPLOY_TARGET: 'typo' }).requestChat('Question'), error => error.code === 'configuration');
  assert.equal(calls.length, 1);
});

test('stateless native requests preserve conversation history and the resolved topic', async () => {
  const context = { history: [{ role: 'user', content: 'Tell me about Arche Robotics' }, { role: 'assistant', content: 'I joined in July 2026.' }], topic: 'Arche Robotics' };
  const transport = loadTransport(async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { message: 'Can you elaborate?', session_id: 'native-session', ...context });
    return Response.json({ response: 'More details.', session_id: 'native-session', topic: 'Arche Robotics' });
  }, { NEXT_PUBLIC_DEPLOY_TARGET: 'vercel' });
  assert.equal((await transport.requestChat('Can you elaborate?', 'native-session', undefined, context)).topic, 'Arche Robotics');
});

test('development retains its local API default and hosted API stage paths remain usable', async () => {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    return Response.json({ response: 'Reply.' });
  };
  await loadTransport(fetch, { NODE_ENV: 'development', NEXT_PUBLIC_API_URL: undefined })
    .requestChat('Local question');
  await loadTransport(fetch, { NEXT_PUBLIC_API_URL: 'https://api.example.test/prod/' }).requestChat('Hosted question');
  assert.deepEqual(calls, ['http://localhost:8000/chat', 'https://api.example.test/prod/chat']);
});

test('unsafe or unsupported production URLs report configuration without making requests', async () => {
  let calls = 0;
  for (const endpoint of [
    'http://localhost:8000', 'https://localhost:8000', 'https://127.0.0.1:8000',
    'https://127.0.0.2:8000', 'https://[::1]:8000', 'https://dev.localhost:8000',
    'http://api.example.test', '/api', 'not-a-url', 'javascript:alert(1)',
    'https://user:secret@api.example.test', 'https://api.example.test?key=secret',
    'https://api.example.test#fragment',
  ]) {
    const transport = loadTransport(async () => { calls++; }, { NEXT_PUBLIC_API_URL: endpoint });
    await assert.rejects(transport.requestChat('Question'), (error) => error.code === 'configuration');
  }
  assert.equal(calls, 0);
});

test('an invalid primary still permits an explicitly configured hosted fallback', async () => {
  const calls = [];
  const transport = loadTransport(async (url) => {
    calls.push(url);
    return Response.json({ response: 'Live fallback response.' });
  }, { NEXT_PUBLIC_API_URL: 'http://localhost:8000', NEXT_PUBLIC_API_URL_FALLBACK: 'https://api.example.test' });
  assert.equal((await transport.requestChat('Question')).response, 'Live fallback response.');
  assert.deepEqual(calls, ['https://api.example.test/chat']);
});

test('clearing or unmounting aborts pending transport and prevents fallback calls', async () => {
  const controller = new AbortController();
  let calls = 0;
  const transport = loadTransport(async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  }, { NEXT_PUBLIC_API_URL_FALLBACK: 'https://secondary.example.test' });
  const request = transport.requestChat('Question', undefined, controller.signal);
  controller.abort();
  await assert.rejects(request, (error) => error.name === 'AbortError');
  assert.equal(calls, 1);
});

test('the chat deadline allows 45 seconds and returns a recoverable timeout', async () => {
  const callbacks = new Map();
  let delay;
  const transport = loadTransport(async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }), {}, {
    setTimeout(callback, timeout) {
      delay = timeout;
      callbacks.set(1, callback);
      return 1;
    },
    clearTimeout(id) { callbacks.delete(id); },
  });
  const request = transport.requestChat('Question');
  assert.equal(delay, 45_000);
  callbacks.get(1)();
  await assert.rejects(request, (error) => error.code === 'timeout');
  assert.equal(callbacks.size, 0);
});

test('provider rate limits and timeouts stay actionable without echoing raw server details', async () => {
  for (const [status, expectedCode] of [[429, 'rate_limit'], [504, 'timeout']]) {
    const transport = loadTransport(async () => Response.json({ detail: 'Internal diagnostic text' }, { status }));
    await assert.rejects(transport.requestChat('Question'), (error) => {
      assert.equal(error.code, expectedCode);
      assert.ok(!transport.getChatErrorMessage(error).includes('Internal diagnostic'));
      return true;
    });
  }
});

test('native API configuration failures use safe client messages without echoing diagnostics', async () => {
  const transport = loadTransport(async () => Response.json({ code: 'configuration', error: 'private diagnostic marker' }, { status: 503 }), { NEXT_PUBLIC_DEPLOY_TARGET: 'vercel' });
  await assert.rejects(transport.requestChat('Question'), error => {
    assert.equal(error.code, 'configuration');
    assert.ok(!transport.getChatErrorMessage(error).includes('private diagnostic'));
    return true;
  });
});

test('an empty or malformed chat result is an error, not a fabricated AI reply', async () => {
  for (const body of [{ response: '' }, { response: '   ' }, { detail: 'No response' }]) {
    const transport = loadTransport(async () => Response.json(body));
    await assert.rejects(transport.requestChat('Question'), (error) => error.code === 'invalid_response');
  }
});

test('connection checks require healthy API and honor an explicitly unconfigured model', async () => {
  const healthy = loadTransport(async (url, options) => {
    assert.equal(url, 'https://api.example.test/health');
    assert.equal(options.cache, 'no-store');
    return Response.json({ status: 'healthy', llm_configured: true });
  });
  await healthy.checkChatConnection();
  const unconfigured = loadTransport(async () => Response.json({ status: 'healthy', llm_configured: false }));
  await assert.rejects(unconfigured.checkChatConnection(), (error) => error.code === 'configuration');
});

test('Clear chat starts a new backend conversation after a successful exchange', async () => {
  const sessions = [];
  const widget = loadWidget(async (_message, session) => {
    sessions.push(session);
    return { response: 'Real reply.', session_id: 'previous-conversation' };
  });
  await send(widget, 'First question');
  await send(widget, 'Follow-up');
  const clear = findElement(widget.render(), (node) => node.props?.children === 'Clear chat');
  clear.props.onClick();
  await send(widget, 'New conversation');
  assert.deepEqual(sessions, [undefined, 'previous-conversation', undefined]);
});

test('the widget sends stateless context on follow-up and clearing also clears its topic', async () => {
  const contexts = [];
  const widget = loadWidget(async (_message, _session, _signal, context) => {
    contexts.push(context);
    return { response: 'I build AI solutions.', session_id: 'native-session', topic: 'AI solutions' };
  });
  await send(widget, 'How do you build AI solutions?');
  await send(widget, 'Can you elaborate?');
  assert.equal(contexts[1].topic, 'AI solutions');
  assert.deepEqual(JSON.parse(JSON.stringify(contexts[1].history)), [{ role: 'user', content: 'How do you build AI solutions?' }, { role: 'assistant', content: 'I build AI solutions.' }]);
  findElement(widget.render(), (node) => node.props?.children === 'Clear chat').props.onClick();
  await send(widget, 'New conversation');
  assert.equal(contexts[2].topic, undefined);
  assert.equal(contexts[2].history.length, 0);
});

test('a late response cannot repopulate a cleared chat or overwrite its new session', async () => {
  const late = pendingRequest();
  const sessions = [];
  const signals = [];
  const widget = loadWidget(async (message, session, signal) => {
    sessions.push(session);
    signals.push(signal);
    if (message === 'Old question') return late.promise;
    return { response: 'New reply.', session_id: 'new-conversation' };
  });
  const oldRequest = send(widget, 'Old question');
  findElement(widget.render(), (node) => node.props?.children === 'Clear chat').props.onClick();
  assert.equal(signals[0].aborted, true);
  await send(widget, 'New question');
  late.resolve({ response: 'Stale reply.', session_id: 'old-conversation' });
  await oldRequest;
  const staleMessage = findElement(widget.render(), (node) => node.props?.children === 'Stale reply.');
  assert.equal(staleMessage, undefined);
  await send(widget, 'New follow-up');
  assert.deepEqual(sessions, [undefined, undefined, 'new-conversation']);
});

test('markdown preserves heading, list, emphasis, and code structure without rendering raw HTML', () => {
  const html = renderMarkdown('# AI **work**\n## Tools\n### Stack\n- *Python*\n- `FastAPI`\n1. Grounded\n2. Verified\n\n<img src=x onerror=alert(1)>');
  assert.match(html, /<h2[^>]*>AI <strong[^>]*>work<\/strong><\/h2>/);
  assert.match(html, /<h3[^>]*>Tools<\/h3>/);
  assert.match(html, /<h4[^>]*>Stack<\/h4>/);
  assert.equal((html.match(/<ul\b/g) || []).length, 1);
  assert.equal((html.match(/<ol\b/g) || []).length, 1);
  assert.equal((html.match(/<li\b/g) || []).length, 4);
  assert.match(html, /<em[^>]*>Python<\/em>/);
  assert.match(html, /<code[^>]*>FastAPI<\/code>/);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
});

test('closed and unfinished code fences preserve whitespace and escape code content', () => {
  for (const ending of ['\n```', '']) {
    const html = renderMarkdown('```ts\n  const html = "<b>";' + ending);
    assert.equal((html.match(/<pre\b/g) || []).length, 1);
    assert.ok(html.includes('  const html = &quot;&lt;b&gt;&quot;;'));
    assert.ok(!html.includes('<b>'));
  }
});

test('markdown keeps portfolio and contact links clickable while rejecting active or credential URLs', () => {
  const html = renderMarkdown('[Profile](https://yousefalsayed.me/) [CV](/resume.pdf) [Skills](#skills) [Contact](mailto:yousef@example.com)');
  for (const href of ['https://yousefalsayed.me/', '/resume.pdf', '#skills', 'mailto:yousef@example.com']) {
    assert.ok(html.includes(`href="${href}"`));
  }
  for (const href of ['javascript:alert(1)', 'data:text/html,hello', 'vbscript:run', 'https://user:password@example.com/']) {
    const unsafe = renderMarkdown(`[Link](${href})`);
    assert.ok(!unsafe.includes('<a '));
  }
});

test('unmount cancels health and chat requests and removes polling and online subscriptions', async () => {
  const health = pendingRequest();
  const chat = pendingRequest();
  let healthSignal;
  let chatSignal;
  const widget = loadWidget(async (_message, _session, signal) => {
    chatSignal = signal;
    return chat.promise;
  }, {
    effects: true,
    checkChatConnection: signal => { healthSignal = signal; return health.promise; },
  });
  widget.render();
  assert.equal(widget.intervals.size, 1);
  assert.equal(widget.listeners.size, 1);
  const request = send(widget, 'A pending question');
  assert.equal(healthSignal.aborted, true, 'Sending a message cancels an older health check.');
  widget.unmount();
  assert.equal(chatSignal.aborted, true);
  assert.equal(widget.intervals.size, 0);
  assert.equal(widget.listeners.size, 0);
  health.resolve();
  chat.resolve({ response: 'Late reply.', session_id: 'late-session' });
  await request;
  await Promise.resolve();
  assert.equal(widget.updatesAfterUnmount, 0);
});

test('an older health failure cannot replace the status of a successful chat request', async () => {
  const health = pendingRequest();
  const widget = loadWidget(async () => ({ response: 'Verified reply.', session_id: 'new-session' }), {
    effects: true,
    checkChatConnection: () => health.promise,
  });
  widget.render();
  await send(widget, 'Question');
  health.reject(new Error('An older failed check'));
  await Promise.resolve();
  const status = findElement(widget.render(), node => node.props?.role === 'status');
  assert.equal(status.props.children.join(''), '● Connected');
  widget.unmount();
});

test('Enter during composition does not submit a partially composed message', async () => {
  let calls = 0;
  let prevented = 0;
  const widget = loadWidget(async () => { calls++; return { response: 'Reply.' }; });
  findElement(widget.render(), node => node.props?.id === 'twin-chat-input').props.onChange({ target: { value: 'Question' } });
  const input = findElement(widget.render(), node => node.props?.id === 'twin-chat-input');
  input.props.onKeyDown({ key: 'Enter', shiftKey: false, nativeEvent: { isComposing: true }, preventDefault() { prevented++; } });
  assert.equal(calls, 0);
  assert.equal(prevented, 0);
  input.props.onKeyDown({ key: 'Enter', shiftKey: false, nativeEvent: { isComposing: false }, preventDefault() { prevented++; } });
  assert.equal(calls, 1);
  assert.equal(prevented, 1);
  await Promise.resolve();
});
