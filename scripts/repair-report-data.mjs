import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
config({ path: '.env.production.local', override: false, quiet: true });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const PRICE_ON_REQUEST = [
  'RE530UQ', 'RE535UH', 'RE589UQ', 'RE592P', 'SORE569UH', 'TE116',
  'VE502P', 'VE506P', 'VE509VH', 'VE511VH', 'VE511VH-14B', 'VE522P',
  'VE523P', 'VE524P', 'VE525LR', 'VE526P', 'VE527R', 'VE528P', 'VE529UH',
  'VE530VQ', 'VE531UH', 'VE533GL', 'VE535P', 'VE536LR', 'VE537P',
  'VE539LR', 'VE539P', 'VE539VH', 'VE540P',
];

const VOLTAGGIO = [
  'VE502P', 'VE505P', 'VE506P', 'VE507P', 'VE508P', 'VE509VH', 'VE512P',
  'VE522P', 'VE523P', 'VE524P', 'VE525LR', 'VE526P', 'VE527R', 'VE528P',
  'VE529UH', 'VE530VQ', 'VE531UH', 'VE532P', 'VE533GL', 'VE534VZ',
  'VE535P', 'VE536LR', 'VE537P', 'VE539LR', 'VE539P', 'VE539VH', 'VE540P',
];

const NORME_DE_DANHOV = ['RE503VQS', 'RE650P', 'RE651CH', 'RE651CLR', 'RE651P', 'RE651VH'];

async function updateSkus(skus, changes) {
  for (const sku of skus) {
    const { error } = await client.from('products').update(changes).eq('sku', sku);
    if (error) throw new Error(`${sku}: ${error.message}`);
  }
}

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('Dry run. Re-run with --apply to update production product records.');
    console.log(`Price-on-request: ${PRICE_ON_REQUEST.length}`);
    console.log(`Voltaggio collection: ${VOLTAGGIO.length}`);
    console.log(`Norme de Danhov collection: ${NORME_DE_DANHOV.length}`);
    return;
  }

  await updateSkus(PRICE_ON_REQUEST, { price_display: 'Price on request' });
  await updateSkus(VOLTAGGIO, { collection: 'Voltaggio' });
  await updateSkus(NORME_DE_DANHOV, { collection: 'Norme de Danhov' });
  await updateSkus(['HE500P'], { collection: 'Diamante' });
  await updateSkus(
    ['RE650P', 'RE651CH', 'RE651CLR', 'RE651P', 'RE651VH'],
    { name: 'Norme de Tension Style Engagement Ring' },
  );

  // The space is a source-data typo that breaks URLs and downstream handles.
  const { error } = await client.from('products').update({ sku: 'TRH100Y' }).eq('sku', 'TRH100 Y');
  if (error) throw new Error(`TRH100 Y: ${error.message}`);

  console.log('Product data report repairs applied.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
