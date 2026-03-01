import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fix() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, product_name, quantity, customer_name')
    .eq('etsy_order_no', '3987487890');

  if (error) { console.error('Error:', error); return; }
  console.log('Belinda rows found:', data?.length);
  console.log(JSON.stringify(data, null, 2));

  if (!data || data.length < 2) {
    console.log('Nothing to fix.');
    return;
  }

  const keepId = data[0].id;
  const deleteId = data[1].id;

  const { error: updateErr } = await supabase
    .from('orders').update({ quantity: 2 }).eq('id', keepId);
  console.log('Update qty:', updateErr ? updateErr.message : 'OK');

  const { error: deleteErr } = await supabase
    .from('orders').delete().eq('id', deleteId);
  console.log('Delete duplicate:', deleteErr ? deleteErr.message : 'OK');

  console.log('Done — Belinda now 1 row with qty 2');
}

fix().catch(console.error);
