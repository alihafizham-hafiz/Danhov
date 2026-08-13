/**
 * Chat — Gemini REST API (no SDK dependency).
 *
 * Uses the Gemini v1beta REST endpoint directly via fetch so we are never
 * affected by SDK version changes. Output is SSE in the same
 * event:delta / event:done / event:error format the ChatWidget expects.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { knowledgeWithContext } from '@/lib/danhov-knowledge';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1),
  context: z.string().max(800).optional().default(''),
});

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite'];

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 'chat', 200, 24 * 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[chat] GEMINI_API_KEY not set');
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
  }

  const systemInstruction = knowledgeWithContext(body.context);

  // Build Gemini-format content array.
  // Gemini requires roles 'user'/'model'; history must start with 'user'.
  const recent = body.messages.slice(-60);
  const lastMsg = recent[recent.length - 1];
  const rawHistory: GeminiContent[] = recent
    .slice(0, -1)
    .map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));
  const firstUser = rawHistory.findIndex((m) => m.role === 'user');
  const history = firstUser === -1 ? [] : rawHistory.slice(firstUser);
  const contents: GeminiContent[] = [
    ...history,
    { role: 'user', parts: [{ text: lastMsg.content }] },
  ];

  const reqBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { maxOutputTokens: 1600, temperature: 0.7 },
    safetySettings: SAFETY_SETTINGS,
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      let lastError: unknown = null;

      for (const modelName of MODELS) {
        try {
          const url = `${GEMINI_BASE}/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody),
          });

          if (!res.ok || !res.body) {
            const errText = await res.text().catch(() => '');
            const detail = `HTTP ${res.status} — ${errText.slice(0, 400)}`;
            console.error(`[chat] ${modelName}: ${detail}`);
            if (res.status === 400 || res.status === 403) {
              console.error('[chat] Check GEMINI_API_KEY in Vercel env vars');
            }
            lastError = new Error(detail);
            continue;
          }

          // Parse the Gemini SSE stream and re-emit our own SSE events.
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let any = false;

          outer: while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });

            const lines = buf.split('\n');
            buf = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const raw = line.slice(5).trim();
              if (!raw || raw === '[DONE]') continue;

              let parsed: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }> };
              try {
                parsed = JSON.parse(raw);
              } catch {
                continue;
              }

              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                any = true;
                send('delta', { text });
              }

              // If the candidate has finished and we got content, we can stop.
              const finish = parsed.candidates?.[0]?.finishReason;
              if (finish && finish !== 'STOP' && finish !== 'MAX_TOKENS') {
                // Safety block or other early finish — treat as error
                lastError = new Error(`${modelName}: blocked (${finish})`);
                console.warn(`[chat] ${modelName} blocked: ${finish}`);
                break outer;
              }
            }
          }

          if (!any) {
            lastError = new Error(`${modelName}: empty response`);
            continue;
          }

          send('done', { model: modelName });
          controller.close();
          return;
        } catch (err) {
          lastError = err;
          console.error(`[chat] ${modelName} threw:`, err instanceof Error ? err.message : err);
        }
      }

      // All models failed
      const detail =
        lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
      console.error('[chat] all models failed —', detail);
      send('error', {
        message: 'The advisor is briefly unavailable. Please try again in a moment.',
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
