'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { ChatRequestError, checkChatConnection, getChatErrorMessage, requestChat, type ChatContext } from '@/lib/chat';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { MarkdownMessage } from './MarkdownMessage';

export { MarkdownMessage };

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ConnectionState = 'checking' | 'connected' | 'unavailable' | 'unconfigured';

const connectionLabels: Record<ConnectionState, string> = {
  checking: 'Checking connection',
  connected: 'Connected',
  unavailable: 'Unavailable',
  unconfigured: 'Not configured',
};

function createMessage(role: Message['role'], content: string): Message {
  return { id: crypto.randomUUID(), role, content, timestamp: new Date() };
}

function conversationContext(messages: Message[], topic?: string): ChatContext {
  const history: ChatContext['history'] = [];
  let remaining = 3000;
  for (const message of messages.slice(-6).reverse()) {
    if (message.role === 'assistant' && message.content.startsWith('Connection error:')) continue;
    const content = message.content.slice(0, Math.min(2000, remaining));
    if (!content) continue;
    history.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return { history, topic };
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('checking');
  const sessionIdRef = useRef<string | undefined>(undefined);
  const topicRef = useRef<string | undefined>(undefined);
  const requestRef = useRef<AbortController | null>(null);
  const connectionRequestRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const pane = messagesEndRef.current?.parentElement;
    pane?.scrollTo({
      top: pane.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, isLoading, reducedMotion]);

  useEffect(() => {
    const checkConnection = async () => {
      if (requestRef.current) return;
      connectionRequestRef.current?.abort();
      const request = new AbortController();
      connectionRequestRef.current = request;
      try {
        await checkChatConnection(request.signal);
        if (connectionRequestRef.current === request && !request.signal.aborted) {
          setConnection('connected');
        }
      } catch (error) {
        if (connectionRequestRef.current === request && !request.signal.aborted) {
          setConnection(error instanceof ChatRequestError && error.code === 'configuration'
            ? 'unconfigured' : 'unavailable');
        }
      } finally {
        if (connectionRequestRef.current === request) connectionRequestRef.current = null;
      }
    };

    void checkConnection();
    const interval = setInterval(() => void checkConnection(), 30_000);
    const handleOnline = () => void checkConnection();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      connectionRequestRef.current?.abort();
      connectionRequestRef.current = null;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || requestRef.current) return;
    const request = new AbortController();
    requestRef.current = request;
    connectionRequestRef.current?.abort();
    connectionRequestRef.current = null;
    const userMessage = createMessage('user', query);

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await requestChat(
        query, sessionIdRef.current, request.signal, conversationContext(messages, topicRef.current),
      );
      if (request.signal.aborted || requestRef.current !== request) return;
      sessionIdRef.current = data.session_id ?? sessionIdRef.current;
      topicRef.current = data.topic ?? topicRef.current;
      setConnection('connected');
      const assistantMessage = createMessage('assistant', data.response);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if (request.signal.aborted || requestRef.current !== request) return;
      setConnection(error instanceof ChatRequestError && error.code === 'configuration'
        ? 'unconfigured' : 'unavailable');
      const errorMessage = createMessage('assistant',
        `Connection error: ${getChatErrorMessage(error)}`);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const clearChat = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    sessionIdRef.current = undefined;
    topicRef.current = undefined;
    setMessages([]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="items-container" id="twin">
      <h1>AI Digital Twin</h1>
      <p className="twin-intro">
        Ask my AI twin about my solutions, career, projects, and technical skills. Answers draw from my portfolio and LinkedIn profile.
      </p>

      <div className="twin-chat-box">
        {/* Header */}
        <div className="twin-chat-header">
          <div className="twin-chat-profile">
            <Image
              src="/data/profile/yousef.jpg"
              alt="Yousef"
              width={34}
              height={34}
              className="twin-avatar"
            />
            <div>
              <div className="twin-chat-name">Yousef&apos;s Digital Twin</div>
              <div className={`twin-status twin-status-${connection}`} role="status" aria-live="polite">
                ● {connectionLabels[connection]}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="twin-chat-clear"
          >
            Clear chat
          </button>
        </div>

        {/* Messages */}
        <div className="twin-chat-messages" role="log" aria-live="polite" aria-busy={isLoading}>
          {messages.length === 0 && (
            <div className="twin-chat-empty">
              <p className="twin-chat-welcome">👋 Hello! I am Yousef&apos;s AI Digital Twin.</p>
              <p className="twin-help-text">
                Ask about my projects, background in AI &amp; robotics, or engineering work.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === 'user' ? 'twin-msg-user' : 'twin-msg-assistant'}
            >
              <div className="twin-message-content">
                {msg.role === 'assistant' ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
              <div
                className="twin-message-time"
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="twin-msg-assistant">
              <span className="twin-thinking-text">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="twin-chat-input-area">
          <input
            id="twin-chat-input"
            aria-label="Message for Yousef's Digital Twin"
            type="text"
            maxLength={2000}
            className="twin-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your question for Yousef's Twin..."
            disabled={isLoading}
          />
          <button
            type="button"
            className="twin-chat-send"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
