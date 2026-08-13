'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const WELCOME: ChatMsg = {
  role: 'assistant',
  content: `Welcome. I'm your DANHOV design guide — powered by Gemini AI.\n\nClose your eyes for a moment. What do you see? A feeling, a colour, a shape, a stone? Describe anything — even just a word — and together we'll find the form of your ring.`,
};

const STARTERS = [
  'I see something delicate, with a small diamond',
  'I want something bold and unusual',
  'Rose gold, warm, meant for everyday wear',
  'An engagement ring that feels timeless',
];

export default function DesignInSilenceCard() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'panels' | 'chat'>('panels');
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      setView('panels');
      setMessages([WELCOME]);
      setInput('');
      setThinking(false);
    }
  }, [open]);

  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleBrowseCollection = (e: React.MouseEvent) => {
    setOpen(false);
    if (pathname === '/') {
      e.preventDefault();
      setTimeout(() => {
        document.getElementById('engagement-rings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  async function send(text: string) {
    const userMsg = text.trim();
    if (!userMsg || thinking) return;

    const next: ChatMsg[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(next);
    setInput('');
    setThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          context: 'ring-design-guide',
        }),
      });

      if (!res.ok || !res.body) throw new Error('Chat unavailable');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let reply = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            if (parsed.text) {
              reply += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: reply };
                return updated;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having a moment of quiet — try again in a second.',
      }]);
    } finally {
      setThinking(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      <button
        type="button"
        className="invmore-card invmore-card--btn"
        onClick={() => setOpen(true)}
      >
        <div className="invmore-icon">
          <svg width="58" height="58" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L13.4 8.4L20 10L13.4 11.6L12 18L10.6 11.6L4 10L10.6 8.4L12 2Z" fill="currentColor"/>
            <circle cx="19" cy="19" r="1.8" fill="currentColor" opacity="0.7"/>
            <circle cx="5.5" cy="17" r="1.1" fill="currentColor" opacity="0.5"/>
          </svg>
        </div>
        <span className="invmore-label">Guided Ring Creator</span>
        <h3 className="invmore-name">Design in <em>Silence</em></h3>
        <p className="invmore-body">
          Describe the ring you see within. Our guided creator shapes your vision — Jack&apos;s workshop brings it to life.
        </p>
        <span className="invmore-link">Begin &rarr;</span>
      </button>

      {open && (
        <div
          className="dis-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Design in Silence"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className={`dis-modal${view === 'chat' ? ' dis-modal--chat' : ''}`}>
            <button className="dis-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>

            {/* ── Panel chooser ── */}
            {view === 'panels' && (
              <>
                <div className="dis-modal-header">
                  <p className="dis-modal-sub">Choose your path</p>
                  <h2 className="dis-modal-title">Design in <em>Silence</em></h2>
                  <p className="dis-modal-tagline">
                    Two ways to find your form — create something entirely your own, or discover the one that already speaks to you.
                  </p>
                </div>

                <div className="dis-panels">
                  {/* Panel 1 — Create Your Own → opens chat */}
                  <div className="dis-panel">
                    <div className="dis-panel-icon">✦</div>
                    <span className="dis-panel-label">Guided Creator</span>
                    <h3 className="dis-panel-title">Create<br />Your Own</h3>
                    <p className="dis-panel-body">
                      Describe the ring you see within — a feeling, a word, a shape. Our AI design guide helps you find the form. Jack&apos;s Los Angeles workshop brings it into gold.
                    </p>
                    <button
                      type="button"
                      className="dis-panel-cta"
                      onClick={() => setView('chat')}
                    >
                      Start Designing with AI &rarr;
                    </button>
                  </div>

                  {/* Panel 2 — From Our Collection */}
                  <div className="dis-panel">
                    <div className="dis-panel-icon">◇</div>
                    <span className="dis-panel-label">Our Collections</span>
                    <h3 className="dis-panel-title">Choose from<br />Our Collection</h3>
                    <p className="dis-panel-body">
                      Eleven collections. Four decades of craft. Each piece begins with a name given in intention — find the form that already speaks to you.
                    </p>
                    <Link
                      href="/#engagement-rings"
                      className="dis-panel-cta"
                      onClick={handleBrowseCollection}
                    >
                      Browse All Collections &rarr;
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* ── AI Chat ── */}
            {view === 'chat' && (
              <div className="dis-chat">
                <div className="dis-chat-header">
                  <button
                    type="button"
                    className="dis-chat-back"
                    onClick={() => setView('panels')}
                    aria-label="Back"
                  >
                    ← Back
                  </button>
                  <div className="dis-chat-title-wrap">
                    <span className="dis-chat-gem">✦</span>
                    <span className="dis-chat-title">Design with AI</span>
                  </div>
                  <span className="dis-chat-powered">Gemini</span>
                </div>

                <div className="dis-chat-messages">
                  {messages.map((m, i) => (
                    <div key={i} className={`dis-msg dis-msg--${m.role}`}>
                      {m.role === 'assistant' && <span className="dis-msg-gem">✦</span>}
                      <div className="dis-msg-bubble">
                        {m.content.split('\n').map((line, j) => (
                          <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="dis-msg dis-msg--assistant">
                      <span className="dis-msg-gem">✦</span>
                      <div className="dis-msg-bubble dis-msg-thinking">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {messages.length === 1 && (
                  <div className="dis-starters">
                    {STARTERS.map(s => (
                      <button key={s} type="button" className="dis-starter" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div className="dis-chat-input-row">
                  <textarea
                    ref={inputRef}
                    className="dis-chat-input"
                    placeholder="Describe what you see…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    rows={2}
                    disabled={thinking}
                  />
                  <button
                    type="button"
                    className="dis-chat-send"
                    onClick={() => send(input)}
                    disabled={thinking || !input.trim()}
                    aria-label="Send"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10L18 2L10 18L9 11L2 10Z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>

                <p className="dis-chat-foot">
                  Powered by Gemini · When ready,{' '}
                  <Link href="/ring-builder" onClick={() => setOpen(false)}>open the ring builder</Link>
                  {' '}or{' '}
                  <button type="button" className="dis-chat-foot-btn" onClick={() => setOpen(false)}>
                    book a consultation
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
