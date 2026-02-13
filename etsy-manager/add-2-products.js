const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

const STORE_ID = '3b91cdbe-8f49-4cf7-85a9-78d2e4093ff3';

const products = [
  {
    product: {
      store_id: STORE_ID,
      name: 'Blue Speckled Ceramic Teapot with Woven Handle - Japanese Style Stoneware Tea Kettle with Brass Accents - Zen Tea Gift',
      product_status: 'active',
      is_active: true,
      subcategory: 'Teapots',
      store_link: 'https://www.etsy.com/shop/TeaCeremonyArt?ref=shop-header-name&listing_id=4424429539&from_page=listing',
      store_name: 'TeaCeremonyArt',
      weekly_monthly_sales: 'שבועי - 7',
      store_age: '1',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4424429539/blue-speckled-ceramic-teapot-with-woven',
      ali_link: 'https://www.aliexpress.us/item/3256805125216530.html',
      supplier_link: 'https://detail.1688.com/offer/685514991370.html',
      competitor_price: 44.90,
      competitor_shipment: 0.00,
      etsy_full_price: 60.00,
      sale_percent: 35,
      supplier_price: 17.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'KEER', price: 20.40, is_selected: false },
      { name: 'Sain', price: 17.00, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Vintage Japanese Ceramic Soup Bowl With Lid, Noodle Soup Rice Kitchen Tableware, Ceramic Ramen Bowl And Lid, Udon Bowl',
      product_status: 'active',
      is_active: true,
      subcategory: 'Bowls',
      store_link: 'https://www.etsy.com/shop/ayakanakaw?ref=shop-header-name&listing_id=4366826290&from_page=listing',
      store_name: 'ayakanakaw',
      weekly_monthly_sales: 'חודשי - 25',
      store_age: '11',
      competitors: '0',
      product_link: 'https://www.etsy.com/listing/4366826290/vintage-japanese-ceramic-soup-bowl-with',
      ali_link: 'https://he.aliexpress.com/item/1005009318246469.html',
      supplier_link: 'https://detail.1688.com/offer/622906358690.html',
      competitor_price: 27.00,
      competitor_shipment: 14.00,
      etsy_full_price: 56.00,
      sale_percent: 35,
      supplier_price: 19.50,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Wyatt', price: 24.00, is_selected: false },
      { name: 'Sain', price: 19.50, is_selected: true },
    ],
  },
];

async function addProducts() {
  for (const { product, suppliers } of products) {
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

    // Add suppliers
    const supplierRows = suppliers.map(s => ({
      product_id: data.id,
      name: s.name,
      price: s.price,
      is_selected: s.is_selected,
    }));

    const { error: supErr } = await supabase.from('product_suppliers').insert(supplierRows);
    if (supErr) {
      console.error(`  Supplier error:`, supErr.message);
    } else {
      console.log(`  Suppliers: ${suppliers.map(s => `${s.is_selected ? '●' : '○'} ${s.name} ($${s.price})`).join(', ')}`);
    }
  }

  console.log('\nDone!');
}

addProducts();
