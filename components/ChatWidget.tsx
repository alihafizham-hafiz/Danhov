'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const VoiceModal = dynamic(() => import('@/components/VoiceModal'), { ssr: false });

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

const WELCOME =
  "Welcome to DANHOV. I'm your personal jewelry advisor — here to help you find a piece that speaks to your soul. What are you looking for today?";

const QUICK_PROMPTS = [
  { q: 'What makes DANHOV rings special?', label: 'What makes DANHOV special?' },
  { q: 'Help me find the perfect engagement ring', label: 'Find an engagement ring' },
  { q: 'What metals are available?', label: 'Available metals' },
  { q: 'Can I get a custom size?', label: 'Custom sizing' },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Gate render until we're past hydration so the floating button doesn't
  // pop in mid-paint and cause the "AI Advisor flash" the client reported.
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 80);
    return () => window.clearTimeout(id);
  }, []);

  function pushAssistant(text: string) {
    setMsgs((prev) => [...prev, { role: 'assistant', content: text }]);
    setShowQuick(false);
  }

  function pushSystemNote(text: string) {
    setMsgs((prev) => [...prev, { role: 'system', content: text }]);
  }

  function getContext(): string {
    const style = searchParams?.get('style');
    if (style) return `Viewing product style: ${style}`;
    if (pathname?.includes('engagement')) return 'Browsing engagement rings';
    if (pathname?.includes('wedding')) return 'Browsing wedding bands';
    if (pathname?.includes('fine')) return 'Browsing fine jewelry';
    if (pathname?.includes('mens')) return "Browsing men's jewelry";
    return 'On the DANHOV homepage';
  }

  function handleOpen(preText?: string) {
    setOpen(true);
    setMsgs((prev) =>
      prev.length === 0 ? [{ role: 'assistant', content: WELCOME }] : prev
    );
    if (preText) setInput(preText);
    setTimeout(() => inputRef.current?.focus(), 280);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setShowQuick(false);
    const next: Msg[] = [...msgs, { role: 'user', content: trimmed }];
    setMsgs(next);
    setInput('');

    // Append an empty assistant message we'll progressively fill from the SSE stream
    const assistantIndex = next.length;
    const working: Msg[] = [...next, { role: 'assistant', content: '' }];
    setMsgs(working);

    try {
      // Strip system-role notes — the chat API only accepts 'user' | 'assistant'.
      const apiMessages = next.filter((m) => m.role === 'user' || m.role === 'assistant');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, context: getContext() }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 429) {
          throw new Error('rate_limit');
        }
        // Try to extract server error message
        let serverMsg = '';
        try { const j = await res.json(); serverMsg = j.error || ''; } catch {}
        throw new Error(serverMsg || `status ${res.status}`);
      }

      const ctype = res.headers.get('content-type') || '';

      // Legacy JSON fallback
      if (!ctype.includes('text/event-stream')) {
        const data = await res.json();
        setMsgs((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = {
            role: 'assistant',
            content:
              data.content ||
              "I'm sorry, I couldn't process that. Please try again.",
          };
          return copy;
        });
        return;
      }

      // Stream: parse SSE chunks of shape  event: delta\ndata: {"text":"..."}\n\n
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let errored = false;
      let firstByte = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split('\n');
          let eventName = 'message';
          let dataRaw = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataRaw += line.slice(5).trim();
          }
          if (!dataRaw) continue;
          let payload: { text?: string; message?: string };
          try {
            payload = JSON.parse(dataRaw);
          } catch {
            continue;
          }

          if (eventName === 'delta' && payload.text) {
            if (firstByte) {
              setLoading(false); // hide the typing dots once tokens start flowing
              firstByte = false;
            }
            accumulated += payload.text;
            setMsgs((prev) => {
              const copy = [...prev];
              copy[assistantIndex] = { role: 'assistant', content: accumulated };
              return copy;
            });
          } else if (eventName === 'error') {
            errored = true;
            const msg =
              payload.message ||
              "I'm sorry, I couldn't process that. Please try again.";
            setMsgs((prev) => {
              const copy = [...prev];
              copy[assistantIndex] = { role: 'assistant', content: msg };
              return copy;
            });
          }
        }
      }

      if (!errored && !accumulated) {
        setMsgs((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = {
            role: 'assistant',
            content: "I'm sorry, I couldn't process that. Please try again.",
          };
          return copy;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const content = msg === 'rate_limit'
        ? "You've sent many messages recently. Please wait a moment before trying again."
        : msg && msg !== `status 500` && !msg.startsWith('status ')
          ? `Advisory note: ${msg}`
          : "I'm having trouble connecting right now. Please contact us at care@danhov.com for assistance.";
      setMsgs((prev) => {
        const copy = [...prev];
        copy[assistantIndex] = { role: 'assistant', content };
        return copy;
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, loading]);

  // Wire up [data-dnh] and [data-dnh-design] triggers across the page
  useEffect(() => {
    function handler(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest('[data-dnh]') as HTMLElement | null;
      if (el) {
        e.preventDefault();
        handleOpen(el.dataset.dnh || '');
      }
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style jsx global>{`
        #dnh-btn {
          position: fixed; bottom: 32px; right: 32px;
          width: 62px; height: 62px; border-radius: 50%;
          background: #AC3438;
          border: 1px solid rgba(172, 52, 56, 0.85);
          cursor: pointer;
          z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          animation: dnh-sacred-pulse 4s ease-in-out infinite, dnh-fade-in 0.5s ease 0.05s forwards;
          /* Continuous red edge halo — breathes via @keyframes below */
          box-shadow:
            0 0 10px rgba(172, 52, 56, 0.75),
            0 0 22px rgba(172, 52, 56, 0.45),
            0 0 44px rgba(172, 52, 56, 0.22),
            0 0 80px rgba(172, 52, 56, 0.1),
            inset 0 0 10px rgba(172, 52, 56, 0.25);
          transition: transform 0.22s ease, box-shadow 0.35s ease, border-color 0.35s ease;
        }
        @keyframes dnh-fade-in {
          to { opacity: 1; }
        }
        #dnh-btn:hover {
          transform: scale(1.1);
          border-color: rgba(200, 70, 74, 0.95);
          box-shadow:
            0 0 14px rgba(200, 70, 74, 0.95),
            0 0 30px rgba(172, 52, 56, 0.6),
            0 0 60px rgba(172, 52, 56, 0.3),
            0 0 110px rgba(172, 52, 56, 0.15),
            inset 0 0 16px rgba(172, 52, 56, 0.35);
        }
        @keyframes dnh-sacred-pulse {
          0%, 100% {
            box-shadow:
              0 0 10px rgba(172, 52, 56, 0.75),
              0 0 22px rgba(172, 52, 56, 0.45),
              0 0 44px rgba(172, 52, 56, 0.22),
              0 0 80px rgba(172, 52, 56, 0.1),
              inset 0 0 10px rgba(172, 52, 56, 0.25);
          }
          50% {
            box-shadow:
              0 0 14px rgba(200, 70, 74, 0.95),
              0 0 28px rgba(172, 52, 56, 0.6),
              0 0 56px rgba(172, 52, 56, 0.3),
              0 0 100px rgba(172, 52, 56, 0.15),
              inset 0 0 14px rgba(172, 52, 56, 0.35);
          }
        }
        #dnh-btn-label {
          position: absolute; bottom: 70px; right: 0;
          background: #1a1410; color: #faf6f1;
          font-family: 'Cormorant Garamond', serif; font-size: 11px;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 5px 10px; border-radius: 4px; white-space: nowrap;
          opacity: 0; pointer-events: none;
          transition: opacity 0.2s; transform: translateY(4px);
        }
        #dnh-btn:hover #dnh-btn-label { opacity: 1; transform: translateY(0); }

        #dnh-win {
          position: fixed; bottom: 108px; right: 32px;
          width: 400px;
          /* Taller advisor panel. Default to a generous 720px on tall
             screens, but never exceed the viewport — clamp leaves room
             above for the floating button. */
          height: min(720px, calc(100vh - 130px));
          height: min(720px, calc(100dvh - 130px));
          max-height: min(720px, calc(100dvh - 130px));
          background: #faf6f1; border-radius: 16px;
          box-shadow: 0 12px 56px rgba(0,0,0,0.18);
          z-index: 99998; display: flex; flex-direction: column;
          overflow: hidden; font-family: 'Cormorant Garamond', serif;
          transform: scale(0.9) translateY(20px); opacity: 0; pointer-events: none;
          transition: transform 0.3s cubic-bezier(0.34,1.3,0.64,1), opacity 0.22s ease;
        }
        #dnh-win.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

        /* Header is flex-shrink: 0 so it always stays visible at the top
           regardless of how long the message list grows. The close button
           sits inside it. */
        .dnh-hdr { background: #1a1410; padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .dnh-hdr-left { display: flex; align-items: center; gap: 10px; }
        .dnh-avatar { width: 34px; height: 34px; border-radius: 50%; background: #AC3438; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #fff; flex-shrink: 0; }
        .dnh-title { display: flex; flex-direction: column; }
        .dnh-title-name { font-family: 'Cormorant Garamond', serif; font-size: 15px; color: #faf6f1; font-weight: 500; letter-spacing: 0.1em; }
        .dnh-title-sub { font-size: 10px; color: #8a7f76; letter-spacing: 0.06em; text-transform: uppercase; }
        .dnh-close {
          background: rgba(255,255,255,0.06);
          border: none; cursor: pointer;
          color: #faf6f1;
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; line-height: 1;
          transition: background 0.15s, color 0.15s;
        }
        .dnh-close:hover { background: #AC3438; color: #fff; }

        .dnh-msgs { flex: 1; overflow-y: auto; padding: 18px 14px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
        .dnh-msgs::-webkit-scrollbar { width: 3px; }
        .dnh-msgs::-webkit-scrollbar-thumb { background: #d4c9c0; border-radius: 2px; }
        .dnh-msg { max-width: 86%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.6; }
        .dnh-msg.ai { background: #fff; color: #1a1410; border-bottom-left-radius: 3px; align-self: flex-start; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
        .dnh-msg.user { background: #AC3438; color: #fff; border-bottom-right-radius: 3px; align-self: flex-end; }

        .dnh-typing { display: flex; align-items: center; gap: 5px; padding: 10px 14px; background: #fff; border-radius: 12px; border-bottom-left-radius: 3px; align-self: flex-start; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
        .dnh-typing span { width: 6px; height: 6px; background: #AC3438; border-radius: 50%; animation: dnh-dot 1.2s infinite; }
        .dnh-typing span:nth-child(2) { animation-delay: 0.2s; }
        .dnh-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dnh-dot { 0%,60%,100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-6px); opacity: 1; } }

        .dnh-quick { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 14px 10px; flex-shrink: 0; }
        .dnh-qbtn { background: none; border: 1px solid #ddd4ca; border-radius: 20px; padding: 5px 11px; font-size: 11.5px; color: #5a4e47; cursor: pointer; font-family: 'Cormorant Garamond', serif; transition: all 0.15s; white-space: nowrap; }
        .dnh-qbtn:hover { border-color: #AC3438; color: #AC3438; background: rgba(172,52,56,0.04); }

        .dnh-foot { padding: 10px 14px; border-top: 1px solid #ece6df; display: flex; gap: 8px; align-items: center; background: #faf6f1; flex-shrink: 0; }
        #dnh-input { flex: 1; border: 1px solid #d4c9c0; border-radius: 22px; padding: 9px 15px; font-size: 13.5px; font-family: 'Cormorant Garamond', serif; background: #fff; color: #1a1410; outline: none; transition: border-color 0.15s; }
        #dnh-input:focus { border-color: #AC3438; }
        #dnh-input::placeholder { color: #b4a89d; }
        #dnh-send { width: 38px; height: 38px; border-radius: 50%; background: #AC3438; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, transform 0.15s; }
        #dnh-send:hover { background: #8B2A2D; transform: scale(1.07); }
        #dnh-send:disabled { background: #ccc4ba; cursor: default; transform: none; }

        .dnh-trigger { display: inline-flex; align-items: center; gap: 8px; background: transparent; border: 1px solid rgba(172,52,56,0.45); color: #AC3438; padding: 11px 22px; border-radius: 2px; font-family: 'Cormorant Garamond', serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; user-select: none; }
        .dnh-trigger:hover { background: #AC3438; color: #fff; border-color: #AC3438; }
        .dnh-trigger svg { flex-shrink: 0; }
        .dnh-panel { display: flex; align-items: center; justify-content: space-between; gap: 20px; background: rgba(172,52,56,0.1); border: 1px solid rgba(172,52,56,0.28); border-radius: 6px; padding: 18px 26px; margin: 16px 0; }
        .dnh-panel-copy { flex: 1; }
        .dnh-panel-copy strong { display: block; font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #AC3438; margin-bottom: 4px; font-style: italic; }
        .dnh-panel-copy span { font-family: 'Cormorant Garamond', serif; font-size: 15px; color: #AC3438; line-height: 1.5; }
        .dnh-inline-link { display: inline-flex; align-items: center; gap: 6px; color: #AC3438; font-family: 'Cormorant Garamond', serif; font-size: 12px; letter-spacing: 0.07em; text-transform: uppercase; cursor: pointer; border: none; background: none; padding: 0; transition: opacity 0.15s; }
        .dnh-inline-link:hover { opacity: 0.7; }

        @media (max-width: 480px) {
          #dnh-win { right: 0; left: 0; bottom: 0; width: 100%; border-radius: 16px 16px 0 0; max-height: 72vh; }
          #dnh-btn { bottom: 20px; right: 20px; }
          .dnh-panel { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
      `}</style>

      <button
        id="dnh-btn"
        aria-label="Open AI Jewelry Advisor"
        onClick={() => (open ? setOpen(false) : handleOpen())}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L13.4 8.4L20 10L13.4 11.6L12 18L10.6 11.6L4 10L10.6 8.4L12 2Z" fill="white"/>
          <circle cx="19" cy="19" r="1.8" fill="white" opacity="0.8"/>
          <circle cx="5.5" cy="17" r="1.1" fill="white" opacity="0.6"/>
        </svg>
        <span id="dnh-btn-label">AI Advisor</span>
      </button>

      <div id="dnh-win" className={open ? 'open' : ''} role="dialog" aria-label="DANHOV AI Jewelry Advisor">
        <div className="dnh-hdr">
          <div className="dnh-hdr-left">
            <div className="dnh-avatar">✦</div>
            <div className="dnh-title">
              <span className="dnh-title-name">DANHOV</span>
              <span className="dnh-title-sub">AI Jewelry Advisor</span>
            </div>
          </div>
          <button className="dnh-close" aria-label="Close chat" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="dnh-msgs" ref={msgsRef}>
          {msgs.map((m, i) => {
            if (m.role === 'system') {
              return (
                <div key={i} className="dnh-msg-system">{m.content}</div>
              );
            }
            return (
              <div key={i} className={`dnh-msg ${m.role === 'user' ? 'user' : 'ai'}`}>{m.content}</div>
            );
          })}
          {loading && (
            <div className="dnh-typing"><span></span><span></span><span></span></div>
          )}
        </div>

        {showQuick && (
          <div className="dnh-quick">
            {QUICK_PROMPTS.map((p) => (
              <button key={p.q} className="dnh-qbtn" onClick={() => send(p.q)}>{p.label}</button>
            ))}
          </div>
        )}

        <div className="dnh-foot">
          <button
            type="button"
            className="dnh-modal-btn"
            aria-label="Talk to the advisor"
            title="Voice message"
            onClick={() => setVoiceOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm5 9a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-3.07A7 7 0 0 1 5 11a1 1 0 1 1 2 0 5 5 0 0 0 10 0Z" fill="currentColor"/>
            </svg>
          </button>
          <input
            id="dnh-input"
            ref={inputRef}
            type="text"
            placeholder="Ask, speak, or show…"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button id="dnh-send" aria-label="Send message" disabled={loading} onClick={() => send(input)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1.5 7.5H13.5M13.5 7.5L8.5 2.5M13.5 7.5L8.5 12.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <VoiceModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onReply={(text) => {
          handleOpen();
          pushAssistant(text);
        }}
        contextHint={getContext()}
      />
    </>
  );
}
