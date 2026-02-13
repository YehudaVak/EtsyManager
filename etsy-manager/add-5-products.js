const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

const STORE_ID = '3b91cdbe-8f49-4cf7-85a9-78d2e4093ff3';

// 4 NEW products
const newProducts = [
  {
    product: {
      store_id: STORE_ID,
      name: 'Cloud Design Tissue Box – Modern Tissue Dispenser, Home Decor for Living Room, Bedroom & Office',
      product_status: 'active',
      is_active: true,
      subcategory: 'Teapots',
      store_link: 'https://www.etsy.com/shop/DanielleLuxe?ref=condensed_trust_header_title_sold',
      store_name: 'DanielleLuxe',
      weekly_monthly_sales: 'שבועי - 9',
      store_age: '2',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4414886045/clay-tea-kettle-rustic-japanese-style',
      ali_link: 'https://www.aliexpress.us/item/3256806570344370.html',
      supplier_link: 'https://detail.1688.com/offer/635790714643.html',
      competitor_price: 60.00,
      competitor_shipment: 0.00,
      etsy_full_price: 81.00,
      sale_percent: 35,
      supplier_price: 23.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 23.00, is_selected: true },
      { name: 'KEER', price: 27.00, is_selected: false },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Large Ceramic Ramen Bowl Set 900ml: Japanese Noodle Bowl with Spoon & Chopsticks',
      product_status: 'active',
      is_active: true,
      subcategory: 'Bowls',
      store_link: 'https://www.etsy.com/shop/Bowltiful?ref=condensed_trust_header_title_sold',
      store_name: 'Bowltiful',
      weekly_monthly_sales: 'חודשי - 700',
      store_age: '9 שנים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/1188824902/large-ceramic-ramen-bowl-set-900ml',
      ali_link: 'https://www.aliexpress.us/item/3256809327726704.html',
      supplier_link: 'https://detail.1688.com/offer/680134034101.html',
      competitor_price: 42.23,
      competitor_shipment: 0.00,
      etsy_full_price: 56.00,
      sale_percent: 35,
      supplier_price: 20.00,
      supplier_name: 'Sain',
      remarks: 'Bowl + Chopstick and Bowl:\nhttps://detail.1688.com/offer/596028383348.html',
    },
    suppliers: [
      { name: 'Sain', price: 20.00, is_selected: true },
      { name: 'KEER', price: 17.57, is_selected: false },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Ceramic Bowl for Ramen or Pho, Soup Dish, 750 ml',
      product_status: 'active',
      is_active: true,
      subcategory: 'Bowls',
      store_link: 'https://www.etsy.com/shop/HanamiLiving?ref=shop-header-name&listing_id=4372983080&from_page=listing',
      store_name: 'HanamiLiving',
      weekly_monthly_sales: 'חודשי - 25',
      store_age: '3',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4372983080/ceramic-bowl-for-ramen-or-pho-soup-dish',
      ali_link: 'https://he.aliexpress.com/item/1005009318246469.html',
      supplier_link: 'https://detail.1688.com/offer/622906358690.html',
      competitor_price: 40.50,
      competitor_shipment: 0.00,
      etsy_full_price: 55.00,
      sale_percent: 35,
      supplier_price: 17.34,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Wyatt', price: 24.00, is_selected: false },
      { name: 'Sain', price: 17.34, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Stainless Steel Chopsticks Set 5 Pairs Reusable Non-Slip Metal Chopsticks with Engraved Design – Durable 304 Steel Sushi',
      product_status: 'active',
      is_active: true,
      subcategory: 'Cutlery',
      store_link: 'https://www.etsy.com/shop/NamiBowls?ref=condensed_trust_header_title_sold',
      store_name: 'NamiBowls',
      weekly_monthly_sales: 'שבועי - 5',
      store_age: '3',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4420020417/japanese-stainless-steel-chopsticks-set',
      ali_link: 'https://www.aliexpress.us/item/3256809059387928.html',
      supplier_link: 'https://detail.1688.com/offer/658929624083.html',
      competitor_price: 36.47,
      competitor_shipment: 0.00,
      etsy_full_price: 42.00,
      sale_percent: 35,
      supplier_price: 10.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 10.00, is_selected: true },
      { name: 'KEER', price: 11.23, is_selected: false },
    ],
  },
];

async function run() {
  // ── 1. Add 4 new products ──
  for (const { product, suppliers } of newProducts) {
    console.log(`Adding: ${product.name.substring(0, 60)}...`);

    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select('id, name')
      .single();

    if (error) {
      console.error(`  Error:`, error.message);
      continue;
    }

    console.log(`  ID: ${data.id}`);

    const supplierRows = suppliers.map((s, i) => ({
      product_id: data.id,
      name: s.name,
      price: s.price,
      is_selected: s.is_selected,
      sort_order: i,
    }));

    const { error: supErr } = await supabase.from('product_suppliers').insert(supplierRows);
    if (supErr) {
      console.error(`  Supplier error:`, supErr.message);
    } else {
      console.log(`  Suppliers: ${suppliers.map(s => `${s.is_selected ? '●' : '○'} ${s.name} ($${s.price})`).join(', ')}`);
    }
  }

  // ── 2. Update existing "Vintage Japanese Ceramic Soup Bowl" ──
  console.log('\nUpdating existing Soup Bowl...');

  // Find by product_link
  const { data: existing, error: findErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('product_link', 'https://www.etsy.com/listing/4366826290/vintage-japanese-ceramic-soup-bowl-with')
    .single();

  if (findErr || !existing) {
    console.error('  Could not find existing Soup Bowl:', findErr?.message);
  } else {
    console.log(`  Found: ${existing.name} (${existing.id})`);

    // Update competitor_price (changed from 27 to 36)
    const { error: updErr } = await supabase
      .from('products')
      .update({ competitor_price: 36.00 })
      .eq('id', existing.id);

    if (updErr) {
      console.error('  Update error:', updErr.message);
    } else {
      console.log('  Updated competitor_price: 27 → 36');
    }

    // Check if KEER supplier already exists
    const { data: existingSups } = await supabase
      .from('product_suppliers')
      .select('id, name, sort_order')
      .eq('product_id', existing.id)
      .order('sort_order', { ascending: true });

    const hasKeer = existingSups?.some(s => s.name === 'KEER');
    if (hasKeer) {
      console.log('  KEER supplier already exists, skipping');
    } else {
      const nextOrder = (existingSups?.length || 0);
      const { error: addErr } = await supabase
        .from('product_suppliers')
        .insert({
          product_id: existing.id,
          name: 'KEER',
          price: 19.00,
          is_selected: false,
          sort_order: nextOrder,
        });

      if (addErr) {
        console.error('  Add KEER error:', addErr.message);
      } else {
        console.log('  Added supplier: ○ KEER ($19.00)');
      }
    }
  }

  console.log('\nDone!');
}

run();
