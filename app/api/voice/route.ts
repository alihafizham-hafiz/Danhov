import { NextRequest, NextResponse } from 'next/server';
import { bufferToPart, describeMedia } from '@/lib/gemini';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Paid tier — Gemini inline parts allow up to 20 MB.
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
]);

const SessionFields = z.object({
  session_id: z.string().min(1).max(120).optional(),
  context: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 'voice', 10, 24 * 60 * 60 * 1000); // 10 per 24hr
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }

  const file = form.get('audio');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'audio file missing' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Audio must be 1 B – ${MAX_BYTES} bytes` },
      { status: 413 }
    );
  }

  // Browsers append codec info (e.g. "audio/webm;codecs=opus"). Strip it.
  const rawMime = file.type || 'audio/webm';
  const mime = rawMime.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${mime}` },
      { status: 415 }
    );
  }

  const parsed = SessionFields.safeParse({
    session_id: form.get('session_id')?.toString(),
    context: form.get('context')?.toString(),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid session fields' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let reply: string;
  try {
    reply = await describeMedia(
      [bufferToPart(buffer, mime)],
      `The customer just spoke this audio. Listen carefully — register tone (excited, hesitant, reverent), pace, any background cues, and the literal words. Transcribe what they said silently to yourself (do NOT include the transcription in your reply), then respond as their DANHOV advisor.

Rules for the spoken reply:
- Open by acknowledging the *substance* of what they said — show you actually listened (e.g. "An anniversary band in 18k rose — what a beautiful intention"). Never start with "I heard you say…".
- Match depth of reply to depth of question. A casual "hi" gets one warm sentence. A real inquiry deserves 3-6 sentences with specifics — a named collection (Abbraccio / Voltaggio / Classico / Carezza / Per Lei / Petalo / Solo Filo / Eleganza / Norme de DANHOV / Couture / Unito), a metal recommendation, lead time, what to expect.
- Spoken English: short sentences, plain words, gentle rhythm. No bullet lists. No SKU codes spoken aloud — name pieces by their collection.
- If you couldn't make out the audio clearly, say so warmly once and invite them to try again or type instead.`,
      parsed.data.context,
      { maxOutputTokens: 1200, temperature: 0.65 }
    );
  } catch (err) {
    console.error('voice/gemini error:', err);
    return NextResponse.json(
      { error: 'Voice service unavailable. Please try again or message us at care@danhov.com.' },
      { status: 503 }
    );
  }

  // Best-effort persistence (don't block the response on this)
  void persistVoice(
    parsed.data.session_id ?? cryptoRandomId(),
    parsed.data.context ?? null,
    mime,
    file.size,
    reply
  ).catch((e) => console.error('voice/persist error:', e));

  return NextResponse.json({ reply });
}

function cryptoRandomId(): string {
  // Lightweight session id when the client didn't send one
  return 'sess_' + Math.random().toString(36).slice(2, 12);
}

async function persistVoice(
  sessionId: string,
  context: string | null,
  mime: string,
  bytes: number,
  reply: string
) {
  const client = createServiceClient();

  // Upsert a conversation row for this session (modality bumps to 'voice')
  const { data: conv } = await client
    .from('conversations')
    .upsert(
      {
        session_id: sessionId,
        context,
        modality: 'voice',
        messages: [{ role: 'assistant', content: reply }],
      },
      { onConflict: 'session_id' }
    )
    .select('id')
    .single();

  if (!conv) return;

  await client.from('media_uploads').insert({
    conversation_id: conv.id,
    kind: 'audio',
    blob_url: '(not stored)',
    mime_type: mime,
    size_bytes: bytes,
    processed_at: new Date().toISOString(),
    vision_analysis: { reply },
  });
}
