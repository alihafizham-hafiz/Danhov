/**
 * Gemini-backed text + voice + multimodal helpers.
 *
 * Used by /api/chat, /api/voice, /api/vision, /api/image-generate.
 * Server-only — never import in client code (the API key must not leak).
 *
 * Paid-tier active (Google Cloud billing connected): we pick the richest
 * model for the modality.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Part,
} from '@google/generative-ai';
import { knowledgeWithContext } from '@/lib/danhov-knowledge';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV !== 'production') {
  console.warn('GEMINI_API_KEY missing — Gemini-backed endpoints will return 503');
}

// ── Models ────────────────────────────────────────────────────────────
export const CHAT_MODEL_PRIMARY = 'gemini-2.5-flash';
export const CHAT_MODEL_FALLBACK = ['gemini-2.0-flash-001', 'gemini-2.0-flash-lite'];

export const VISION_MODEL_PRIMARY = 'gemini-2.5-flash';
export const VISION_MODEL_FALLBACK = ['gemini-2.0-flash-001', 'gemini-2.0-flash-lite'];

export const IMAGE_MODEL_PRIMARY = 'gemini-3.1-flash-image';
export const IMAGE_MODEL_FALLBACK = ['gemini-2.5-flash-image', 'gemini-3-pro-image'];

// Casual jewelry advisor — don't let default safety filters block benign
// content (e.g. "hello", "wedding", "couple").
export const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export function getGenAI(): GoogleGenerativeAI {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Turn a Buffer into a Gemini inline-data Part. Use for image / audio /
 * video bodies up to ~20MB. For larger files, use the Files API.
 */
export function bufferToPart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

/**
 * One-shot multimodal call: send media + prompt → text reply. Uses the
 * 2.5 Pro model for the deepest understanding of image and audio nuance.
 * Falls back to Flash class if Pro is briefly unavailable.
 */
export async function describeMedia(
  parts: Part[],
  promptHint: string,
  context?: string | null,
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const genAI = getGenAI();
  const models = [VISION_MODEL_PRIMARY, ...VISION_MODEL_FALLBACK];

  let lastError: unknown = null;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: knowledgeWithContext(context),
        generationConfig: {
          maxOutputTokens: opts?.maxOutputTokens ?? 1400,
          temperature: opts?.temperature ?? 0.65,
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent([...parts, { text: promptHint }]);
      const text = safeReadText(result);
      if (text) return text;

      lastError = new Error(`${modelName}: empty response`);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Only fall through on transient errors
      if (!/429|503|404|quota|exceeded|unavailable/i.test(msg)) throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All Gemini multimodal models failed');
}

function safeReadText(result: Awaited<ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>>): string {
  try {
    const t = result.response.text();
    return t?.trim() ?? '';
  } catch {
    return '';
  }
}
