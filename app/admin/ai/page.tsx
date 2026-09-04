'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

type ToolCall = { tool: string; args: unknown; result: unknown };

const WELCOME: Msg = {
  role: 'assistant',
  content: `**Welcome to the AI Product Assistant.**

I can help you modify any product in the DANHOV catalog using plain English. Here are some examples:

- *"Find the Abbraccio Swirl Band and update its main image to [URL]"*
- *"Change the name of product AE520 to 'DANHOV Abbraccio Solitaire'"*
- *"Search for Per Lei rings and show me their details"*
- *"Set the description of the Voltaggio ring to: ..."*
- *"Mark SKU XY123 as inactive"*

I'll always confirm what I found before making any change. What would you like to do?`,
};

export default function AdminAIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolLog, setToolLog] = useState<ToolCall[]>([]);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, loading]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setInput('');

    const next: Msg[] = [...msgs, { role: 'user', content: trimmed }];
    const assistantIdx = next.length;
    setMsgs([...next, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/admin/products/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m.role !== 'system') }),
      });

      const data = await res.json();
      const content = data.content || data.error || 'No response from AI.';
      if (data.toolCalls?.length) setToolLog((prev) => [...prev, ...data.toolCalls]);

      setMsgs((prev) => {
        const copy = [...prev];
        copy[assistantIdx] = { role: 'assistant', content };
        return copy;
      });
    } catch {
      setMsgs((prev) => {
        const copy = [...prev];
        copy[assistantIdx] = {
          role: 'assistant',
          content: 'Connection error. Please check your network and try again.',
        };
        return copy;
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function renderContent(text: string) {
    // Simple markdown-ish rendering: bold, italic, code, line breaks
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#f0e8e2;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div className="adm-page">
      <div className="adm-page-head adm-page-head--with-actions">
        <div>
          <h1 className="adm-h1">AI Product Assistant</h1>
          <p className="adm-page-sub">
            Use natural language to search and modify products in the catalog.
          </p>
        </div>
        <button
          type="button"
          className="adm-btn"
          onClick={() => { setMsgs([WELCOME]); setToolLog([]); }}
        >
          Clear Chat
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Chat panel */}
        <div className="adm-card" style={{ padding: 0, gap: 0 }}>
          {/* Messages */}
          <div
            ref={msgsRef}
            style={{
              height: 520,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '12px 16px',
                    borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.role === 'user' ? 'var(--adm-accent)' : '#fbf7f4',
                    color: m.role === 'user' ? '#fff' : 'var(--adm-text)',
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    border: m.role === 'user' ? 'none' : '1px solid var(--adm-line)',
                  }}
                  dangerouslySetInnerHTML={{ __html: renderContent(m.content) || (loading && i === msgs.length - 1 ? '<span style="opacity:.5">Thinking…</span>' : '') }}
                />
              </div>
            ))}

            {loading && msgs[msgs.length - 1]?.content === '' && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px 12px 12px 2px',
                    background: '#fbf7f4',
                    border: '1px solid var(--adm-line)',
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--adm-accent)',
                        opacity: 0.6,
                        animation: `adm-dot-bounce 1.2s ${d * 0.2}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                  <style>{`@keyframes adm-dot-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              borderTop: '1px solid var(--adm-line)',
              padding: '12px 16px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a command — e.g. 'Find the Abbraccio Swirl Band and update its image to…'"
              disabled={loading}
              rows={2}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--adm-line)',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 13.5,
                fontFamily: 'inherit',
                color: 'var(--adm-text)',
                background: 'var(--adm-surface)',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              onClick={send}
              disabled={loading || !input.trim()}
              style={{ padding: '10px 20px', flexShrink: 0, alignSelf: 'flex-end' }}
            >
              {loading ? 'Working…' : 'Send'}
            </button>
          </div>
        </div>

        {/* Tool activity log */}
        <div className="adm-card" style={{ maxHeight: 580, overflowY: 'auto' }}>
          <div className="adm-card-head">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--adm-mute)' }}>
              Tool Activity
            </span>
            {toolLog.length > 0 && (
              <button
                type="button"
                className="adm-btn adm-btn--sm"
                onClick={() => setToolLog([])}
              >
                Clear
              </button>
            )}
          </div>
          {toolLog.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--adm-mute)', padding: '8px 0' }}>
              Tool calls will appear here as the AI works.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {toolLog.map((t, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fbf7f4',
                    border: '1px solid var(--adm-line)',
                    borderRadius: 4,
                    padding: '10px 12px',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--adm-accent)', marginBottom: 4 }}>
                    {t.tool}
                  </div>
                  <div style={{ color: 'var(--adm-mute)', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: 11 }}>
                    {JSON.stringify(t.result, null, 2).slice(0, 300)}
                    {JSON.stringify(t.result).length > 300 ? '…' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick command suggestions */}
      <div className="adm-card">
        <div className="adm-card-head">
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--adm-mute)' }}>
            Example Commands
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            'Search for all Abbraccio rings',
            'Show me details for SKU AE520',
            'Find engagement rings in the Voltaggio collection',
            'Search for Per Lei and show images',
            'Update the name of [Product] to...',
            'Set the description of [Product] to...',
            'Change the main image of [Product] to [URL]',
            'Mark [Product] as inactive',
          ].map((cmd) => (
            <button
              key={cmd}
              type="button"
              className="adm-btn adm-btn--sm"
              onClick={() => setInput(cmd)}
              style={{ fontSize: 12 }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
