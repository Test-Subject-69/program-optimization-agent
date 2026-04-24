"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askAiQuestion } from "../lib/ai-api";

const SUGGESTED_PROMPTS = [
  "Which programs need attention this week?",
  "What are the top risks across the portfolio?",
  "Summarize the current delivery performance",
  "What actions should I prioritize?",
  "Are there any data quality issues?"
];

function ChatMessage({ role, content }) {
  if (role === "user") {
    return <div className="chat-message chat-message-user">{content}</div>;
  }
  return (
    <div className="chat-message chat-message-ai">
      {content.split("\n").map((line, i) =>
        line.trim() ? <p key={i}>{line}</p> : null
      )}
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="chat-loading">
      <div className="chat-loading-dots">
        <span />
        <span />
        <span />
      </div>
      <span>Thinking...</span>
    </div>
  );
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function handleSend(question) {
    const q = (question || input).trim();
    if (!q || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const data = await askAiQuestion(q);
      setMessages(prev => [...prev, { role: "ai", content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I couldn't process that request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          className="chat-fab"
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3C7.03 3 3 6.58 3 11c0 2.13 1.02 4.05 2.67 5.43L4.5 21l4.58-1.53A10.9 10.9 0 0012 20c4.97 0 9-3.58 9-8s-4.03-8-9-8z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <circle cx="8.5" cy="11" r="1" fill="currentColor"/>
            <circle cx="12" cy="11" r="1" fill="currentColor"/>
            <circle cx="15.5" cy="11" r="1" fill="currentColor"/>
          </svg>
        </button>
      )}

      {open && (
        <>
          <div className="chat-overlay" onClick={() => setOpen(false)} />
          <div className="chat-panel" role="dialog" aria-label="AI Assistant">
            <div className="chat-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 9.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <strong>AI Assistant</strong>
              </div>
              <button
                type="button"
                className="chat-panel-close"
                onClick={() => setOpen(false)}
                aria-label="Close AI assistant"
              >
                &times;
              </button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && !loading && (
                <div className="chat-suggestions">
                  <span>Ask about your portfolio</span>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="chat-suggestion"
                      onClick={() => handleSend(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {loading && <ChatLoading />}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about programs, risks, actions..."
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
