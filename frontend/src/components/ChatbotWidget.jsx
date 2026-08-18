import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

// Rule-based FAQ assistant for the public landing page - no API key, no
// backend call, no LLM. Answers come from a fixed topic list matched by
// keyword; anything unmatched gets an honest "I don't have an answer for
// that" instead of a fabricated response.
const TOPICS = [
  {
    id: 'traffic',
    question: 'How do I check live traffic?',
    keywords: ['traffic', 'route', 'jam', 'congestion', 'road'],
    answer: (
      <>
        Use <Link to="/route">Check Live Traffic</Link> — no login required. Enter an origin and destination and it'll compare real routes with live delay estimates.
      </>
    ),
  },
  {
    id: 'about',
    question: 'What is TrafficVision AI?',
    keywords: ['what is', 'about', 'trafficvision', 'platform'],
    answer: (
      <>
        An AI-driven traffic prediction and congestion management demonstration platform for Bengaluru. It's a student/demo project —
        not an official government service (see the footer for the full disclosure).
      </>
    ),
  },
  {
    id: 'helpline',
    question: 'Emergency & helpline numbers',
    keywords: ['helpline', 'emergency', 'police', 'women', 'sos', 'help'],
    answer: (
      <>
        Traffic Police: <strong>103</strong> · Emergency: <strong>112</strong> · Women Helpline: <strong>181</strong> / <strong>1091</strong>.
        For a life-threatening emergency, always call 112 directly.
      </>
    ),
  },
  {
    id: 'account',
    question: 'How do I sign in or register?',
    keywords: ['sign in', 'login', 'log in', 'register', 'account', 'password'],
    answer: (
      <>
        Use <Link to="/login">Portal Sign In</Link> if you already have an account, or <Link to="/register">Register New Account</Link> to create a commuter account.
      </>
    ),
  },
  {
    id: 'safety',
    question: 'What safety features does it have?',
    keywords: ['safety', 'safe', 'secure', 'security', 'data'],
    answer: (
      <>
        A one-tap SOS button (shares your live location with the traffic control room), an emergency contact you can save once, and direct
        women's helpline dialing — all described in the Safety section above.
      </>
    ),
  },
];

const GREETING = "Hi! I'm a simple FAQ assistant — I can answer questions about this platform from a fixed list of topics below. Ask me something or tap a topic.";
const FALLBACK = "I don't have an answer for that in my topic list. Try one of the topics below, or reach the Traffic Police helpline at 103 for anything urgent.";

function matchTopic(text) {
  const lower = text.toLowerCase();
  return TOPICS.find((t) => t.keywords.some((k) => lower.includes(k)));
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: 'bot', content: GREETING }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const askTopic = (topic) => {
    setMessages((prev) => [...prev, { from: 'user', content: topic.question }, { from: 'bot', content: topic.answer }]);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const matched = matchTopic(text);
    setMessages((prev) => [
      ...prev,
      { from: 'user', content: text },
      { from: 'bot', content: matched ? matched.answer : FALLBACK },
    ]);
    setInput('');
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1500 }}>
      {open && (
        <div
          role="dialog"
          aria-label="Frequently asked questions assistant"
          style={{
            position: 'absolute', bottom: '68px', right: 0, width: '340px', maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.22)', display: 'flex', flexDirection: 'column',
            maxHeight: '70vh', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0f172a', color: '#fff' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
              <Bot size={16} /> TrafficVision Assistant
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '2px' }}
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                  background: m.from === 'user' ? '#0f172a' : '#ffffff',
                  color: m.from === 'user' ? '#ffffff' : '#0f172a',
                  border: m.from === 'user' ? 'none' : '1px solid #e2e8f0',
                }}
              >
                {m.content}
              </div>
            ))}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => askTopic(t)}
                  style={{
                    fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: '999px',
                    border: '1px solid #fdba8c', background: '#fff7ed', color: '#c2410c', cursor: 'pointer',
                  }}
                >
                  {t.question}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '10px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              aria-label="Type your question"
              style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', outline: 'none' }}
            />
            <button
              type="submit"
              aria-label="Send"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', borderRadius: '8px', border: 'none', background: '#ea580c', color: '#fff', cursor: 'pointer' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        style={{
          width: '52px', height: '52px', borderRadius: '50%', border: 'none',
          background: '#ea580c', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(234, 88, 12, 0.4)',
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
