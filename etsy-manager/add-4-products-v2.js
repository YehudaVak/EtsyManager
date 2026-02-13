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
      name: 'Japandi Ceramic Mug with Wooden Saucer, Beige Speckled Mug, Large Handle, Coffee Cup, Minimalist Scandinavian Decoration',
      product_status: 'quotation_received',
      is_active: true,
      subcategory: 'Mugs',
      store_link: 'https://www.etsy.com/shop/AlmaHomestuff?ref=shop-header-name&listing_id=4421064901&from_page=listing',
      store_name: 'AlmaHomestuff',
      weekly_monthly_sales: 'שבועי - 4',
      store_age: '2',
      competitors: '3',
      product_link: 'https://www.etsy.com/listing/4421064901/japandi-ceramic-mug-with-wooden-saucer',
      ali_link: 'https://www.aliexpress.us/item/3256809850258630.html',
      supplier_link: 'https://detail.1688.com/offer/732588966644.html',
      competitor_price: 27.00,
      competitor_shipment: 0.00,
      etsy_full_price: 32.00,
      sale_percent: 35,
      supplier_price: 14.50,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 14.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Retro Ceramic Mug Creative Irregular Coffee Mugs Restaurant Home Breakfast Cup Large Capacity Tea Cup Office Water Cups',
      product_status: 'active',
      is_active: true,
      subcategory: 'Mugs',
      store_link: null,
      store_name: 'NEW',
      weekly_monthly_sales: '8',
      store_age: null,
      competitors: '1',
      product_link: null,
      ali_link: 'https://he.aliexpress.com/item/1005006136606315.html',
      supplier_link: 'https://detail.1688.com/offer/947812134134.html',
      competitor_price: 1.00,
      competitor_shipment: null,
      etsy_full_price: 70.00,
      sale_percent: 35,
      supplier_price: 18.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'KEER', price: 26.50, is_selected: false },
      { name: 'Sain', price: 18.00, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Acacia Wood Salt and Pepper Mill Grinder Set Adjustable Ceramic Core Premium Finish Salt and Pepper Set Luxury Grinder Housewarming Gift',
      product_status: 'quotation_received',
      is_active: true,
      subcategory: 'Salt & Pepper Shakers',
      store_link: 'https://www.etsy.com/shop/EarthWareEco?ref=condensed_trust_header_title_sold',
      store_name: 'EarthWareEco',
      weekly_monthly_sales: 'חודשי - 8',
      store_age: '8',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4301509799/acacia-wood-salt-and-pepper-mill-grinder',
      ali_link: null,
      supplier_link: 'https://detail.1688.com/offer/988696652643.html',
      competitor_price: 35.21,
      competitor_shipment: 4.22,
      etsy_full_price: 47.00,
      sale_percent: 35,
      supplier_price: 12.50,
      supplier_name: 'KEER',
    },
    suppliers: [
      { name: 'KEER', price: 12.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Canister with Attitude',
      product_status: 'active',
      is_active: true,
      subcategory: 'Vases',
      store_link: 'https://www.etsy.com/shop/RockLadyMichelle?ref=condensed_trust_header_title_sold',
      store_name: 'RockLadyMichelle',
      weekly_monthly_sales: 'חודשי - 132',
      store_age: '6 שנים',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/1135361638/canister-with-attitude',
      ali_link: 'https://www.aliexpress.us/item/3256805758709466.html',
      supplier_link: 'https://detail.1688.com/offer/732693514289.html',
      competitor_price: 39.95,
      competitor_shipment: 9.58,
      etsy_full_price: 67.00,
      sale_percent: 35,
      supplier_price: 13.50,
      supplier_name: 'KEER',
      remarks: 'Add spoon and tweezer gift\nhttps://detail.1688.com/offer/828392878990.html',
    },
    suppliers: [
      { name: 'KEER', price: 13.50, is_selected: true },
      { name: 'Sain', price: 10.50, is_selected: false },
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

  console.log('\nDone!');
}

addProducts();
