import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { r2Configured, uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
]);

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: 'Image storage is not configured' }, { status: 503 });
  }

  let form: FormData;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'file missing' }, { status: 400 });

  const mime = (file.type || 'image/jpeg').split(';')[0].toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ error: `Unsupported type: ${mime}` }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Size must be 1 B – ${MAX_BYTES} bytes` }, { status: 413 });
  }

  const ext = mime.split('/')[1].replace(/[^a-z0-9]/gi, '') || 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadToR2(`admin-uploads/${name}`, buf, mime);
    return NextResponse.json({ url, name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 500 });
  }
}
