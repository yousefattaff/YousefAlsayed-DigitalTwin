'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const primaryUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const fallbackUrl = process.env.NEXT_PUBLIC_API_URL_FALLBACK;

      let response: Response | null = null;
      try {
        response = await fetch(`${primaryUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            session_id: sessionId || undefined,
          }),
        });
        if (!response.ok) throw new Error('Primary API failed');
      } catch {
        if (fallbackUrl) {
          response = await fetch(`${fallbackUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: query,
              session_id: sessionId || undefined,
            }),
          });
        } else {
          throw new Error('API unavailable');
        }
      }

      if (!response || !response.ok) throw new Error('Failed to send message');
      const data = await response.json();

      if (!sessionId && data.session_id) {
        setSessionId(data.session_id);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm having trouble connecting to my brain right now. Please ensure the backend server is running or try again shortly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="items-container" id="twin">
      <h1>AI Digital Twin</h1>
      <p style={{ maxWidth: '800px', lineHeight: 1.6 }}>
        Chat directly with my interactive AI twin. Trained on my career milestones, technical skills, and research background.
      </p>

      <div className="twin-chat-box">
        {/* Header */}
        <div className="twin-chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/yousef.jpg"
              alt="Yousef"
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Yousef&apos;s Digital Twin</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>● Online</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMessages([])}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#8b949e',
            }}
          >
            Clear chat
          </button>
        </div>

        {/* Messages */}
        <div className="twin-chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '20px 0' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>👋 Hello! I am Yousef&apos;s AI Digital Twin.</p>
              <p style={{ fontSize: '0.95rem', color: '#8b949e', marginBottom: '20px' }}>
                Ask me anything about my projects, my experience at Arche Robotics, or my technical stack.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                {[
                  'What is your experience at Arche Robotics?',
                  'Tell me about your AI projects',
                  'What are your primary technical skills?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="chip"
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === 'user' ? 'twin-msg-user' : 'twin-msg-assistant'}
            >
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.95rem' }}>
                {msg.content}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  opacity: 0.7,
                  marginTop: '4px',
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                }}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="twin-msg-assistant">
              <span style={{ fontSize: '0.9rem' }}>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="twin-chat-input-area">
          <input
            ref={inputRef}
            type="text"
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
