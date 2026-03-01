import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function findProduct(products: any[], terms: string[]): any | null {
  for (const term of terms) {
    const match = products.find(p => p.name.toLowerCase().includes(term.toLowerCase()));
    if (match) return match;
  }
  return null;
}

function findVariation(variations: any[], terms: string[]): any | null {
  if (!variations?.length || !terms.length) return null;
  for (const term of terms) {
    const match = variations.find(v => v.name.toLowerCase().includes(term.toLowerCase()));
    if (match) return match;
  }
  return null;
}

async function main() {
  // Get store
  const { data: store } = await supabase.from('stores').select('id').eq('name', 'TerraLoomz').single();
  if (!store) { console.error('Store not found'); return; }
  const storeId = store.id;
  console.log(`Store: ${storeId}\n`);

  // Fetch products with variations
  const { data: products } = await supabase
    .from('products')
    .select('*, variations:product_variations(*)')
    .eq('store_id', storeId);
  console.log(`Products loaded: ${products?.length || 0}\n`);

  const baseOrder = (storeId: string) => ({
    first_message_sent: false,
    shipped_message_sent: false,
    review_message_sent: false,
    is_paid: false,
    tracking_added: false,
    is_shipped: false,
    is_delivered: false,
    is_completed_on_etsy: false,
    is_out_of_stock: false,
    supplier_acknowledged: false,
    ship_by: '2026-03-05',
    fees_percent: 12.5,
    store_id: storeId,
  });

  const makeOrder = (
    etsy_order_no: string,
    customer_name: string,
    ordered_date: string,
    address: string,
    sold_for: number,
    productTerms: string[],
    variationTerms: string[],
    color?: string,
    size?: string,
    material?: string,
  ) => {
    const product = findProduct(products || [], productTerms);
    const variation = product ? findVariation(product.variations || [], variationTerms) : null;
    const product_name = product
      ? (variation ? `${product.name} – ${variation.name}` : product.name)
      : productTerms[0];

    return {
      ...baseOrder(storeId),
      etsy_order_no,
      customer_name,
      ordered_date,
      address,
      sold_for,
      product_name,
      product_id: product?.id || null,
      variation_id: variation?.id || null,
      image_url: variation?.image_url || product?.image_url || null,
      order_from: product?.supplier_name || null,
      color: color || null,
      size: size || null,
      material: material || null,
    };
  };

  // ── NEW ORDERS ──────────────────────────────────────────────────────────────
  const newOrders = [
    // Ansley Friday – 2 items (Cream + Brown Oil Dispenser)
    makeOrder('3985944762', 'Ansley Friday', '2026-02-27',
      '7259 borland drive\nfort worth, TX 76123\nUnited States',
      30.96, ['Oil Dispenser', 'Olive Oil'], ['Cream'], 'Cream'),
    makeOrder('3985944762', 'Ansley Friday', '2026-02-27',
      '7259 borland drive\nfort worth, TX 76123\nUnited States',
      30.96, ['Oil Dispenser', 'Olive Oil'], ['Brown'], 'Brown'),

    // Belinda Barlow – qty 2 (same item, 2 rows)
    makeOrder('3987487890', 'Belinda Barlow', '2026-02-28',
      '7 Overlook Court\nAvon, CT 06001\nUnited States',
      33.18, ['Glass Teapot', 'Teapot Set', 'Wooden Handle'], ['Clear Mug', 'Coaster'], undefined, undefined, 'Clear Mug + Coaster'),
    makeOrder('3987487890', 'Belinda Barlow', '2026-02-28',
      '7 Overlook Court\nAvon, CT 06001\nUnited States',
      33.18, ['Glass Teapot', 'Teapot Set', 'Wooden Handle'], ['Clear Mug', 'Coaster'], undefined, undefined, 'Clear Mug + Coaster'),

    // Odette
    makeOrder('3988351680', 'Odette Valero Gomez', '2026-03-01',
      '2207 - 270 Queens Quay West\nToronto ON M5J 2N4\nCanada',
      44.85, ['Gongfu Tea Tray', 'Tea Tray', 'Tea Table'], ['Brown', 'Small'], 'Brown', 'Small (34 cm×12 cm)'),

    // Phoenix Tofaeono
    makeOrder('3988971299', 'Phoenix Tofaeono', '2026-02-27',
      '2B Landette Road\nAuckland 2102\nNew Zealand',
      47.09, ['Ramen Bowl 750', 'Ceramic Ramen Bowl 750'], ['Bowl+Spoon', 'Chopstick', 'Spoon&Chopstick'], undefined, undefined, 'Bowl+Spoon&Chopstick'),

    // Nicole
    makeOrder('3989953613', 'Nicole Leigh Hewitt', '2026-02-28',
      '231 North Ave West\nMissoula, MT 59801\nUnited States',
      50.70, ['Ramen Bowl with Lid', 'Ceramic Ramen Bowl with Lid'], ['Black', 'Style 1'], undefined, undefined, 'Style 1 - Black'),

    // Victoria Day
    makeOrder('3990045761', 'Victoria Day', '2026-02-28',
      '488 Pine Cone Rd\nSkead ON P0M 2Y0\nCanada',
      28.60, ['Oil Dispenser', 'Olive Oil'], ['Cream'], 'Cream'),

    // Janece Fretwell
    makeOrder('3990799145', 'Janece Fretwell', '2026-03-01',
      '26581 Morris Place\nWilder, ID 83676\nUnited States',
      41.34, ['Blue Ceramic Teapot', 'Woven Handle'], []),
  ];

  console.log('── Inserting new orders ──');
  for (const order of newOrders) {
    const { error } = await supabase.from('orders').insert(order);
    if (error) console.error(`  ❌ ${order.etsy_order_no} / ${order.customer_name}:`, error.message);
    else console.log(`  ✅ ${order.etsy_order_no} – ${order.customer_name} (${order.color || order.material || ''})`);
  }

  // ── UPDATE EXISTING ORDERS WITH TRACKING ────────────────────────────────────
  const trackingUpdates = [
    // Shipped Mar 1, 2026
    { no: '3978200938', tracking: 'YT2605400704377610' },
    { no: '3978371882', tracking: 'YT2605400704374427' },
    { no: '3981756423', tracking: 'YT2605400704365870' },
    { no: '3982016985', tracking: 'YT2605400704365862' },
    { no: '3982144313', tracking: 'YT2605400704176723' },
    { no: '3982423249', tracking: 'YT2605400704184255' },
    { no: '3987165379', tracking: 'YT2605800703609949' },
    { no: '3984048816', tracking: 'YT2605700705957645' },
    { no: '3987161347', tracking: 'YT2605700705754364' },
    { no: '3987586163', tracking: 'YT2605700705754356' },
    // Shipped Feb 26, 2026
    { no: '3985662217', tracking: 'YT2605600704360785' },
    { no: '3985257189', tracking: 'YT2605600704360611' },
    { no: '3979890162', tracking: 'YT2605600704168923' },
    { no: '3979755754', tracking: 'YT2605600704360157' },
    { no: '3975977941', tracking: 'YT2605600701286991' },
    { no: '3973120778', tracking: 'YT2605400704174314' },
    { no: '3977459823', tracking: 'YT2605400704390514' },
    { no: '3979089485', tracking: 'YT2605400704184099' },
    { no: '3978963721', tracking: 'YT2605400704513065' },
    { no: '3978140080', tracking: 'YT2605400704175485' },
  ];

  console.log('\n── Updating tracking on existing orders ──');
  for (const u of trackingUpdates) {
    const { error } = await supabase
      .from('orders')
      .update({ tracking_number: u.tracking, tracking_added: true, is_shipped: true })
      .eq('etsy_order_no', u.no)
      .eq('store_id', storeId);
    if (error) console.error(`  ❌ ${u.no}:`, error.message);
    else console.log(`  ✅ ${u.no} → ${u.tracking}`);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
