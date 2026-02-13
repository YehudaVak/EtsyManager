const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

const STORE_ID = '3b91cdbe-8f49-4cf7-85a9-78d2e4093ff3'; // TerraLoomz

async function updateProducts() {
  // First, find the existing products
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name')
    .eq('store_id', STORE_ID);

  if (fetchError) {
    console.error('Failed to fetch products:', fetchError.message);
    return;
  }

  console.log('Found products:', products.map(p => `${p.name} (${p.id})`));

  const oilDispenser = products.find(p => p.name.includes('Oil Dispenser'));
  const soyDispenser = products.find(p => p.name.includes('Soy Sauce'));

  if (!oilDispenser || !soyDispenser) {
    console.error('Could not find one or both products!');
    return;
  }

  // Update Product 1: Japanese Ceramic Oil Dispenser
  const { error: err1 } = await supabase
    .from('products')
    .update({
      product_status: 'active',
      subcategory: 'Gravy Boats',
      store_link: 'https://www.etsy.com/shop/Silenza?ref=shop-header-name&listing_id=4355445312&from_page=listing',
      store_name: 'Silenza',
      weekly_monthly_sales: 'חודשי - 10',
      store_age: '7',
      competitors: '5',
      product_link: 'https://www.etsy.com/listing/4355445312/japanese-ceramic-oil-dispenser-rustic',
      ali_link: 'https://he.aliexpress.com/item/1005004354185456.html',
      supplier_link: 'https://detail.1688.com/offer/658649521223.html',
      competitor_price: 34.15,
      competitor_shipment: 0.00,
      etsy_full_price: 44.00,
      sale_percent: 35,
      supplier_price: 13.14,
      supplier_name: 'KEER',
      remarks: 'KEER - 13.14\nSain - 11',
    })
    .eq('id', oilDispenser.id);

  if (err1) {
    console.error('Failed to update Oil Dispenser:', err1.message);
  } else {
    console.log('Updated: Japanese Ceramic Oil Dispenser');
    console.log('  - etsy_full_price: $44.00');
    console.log('  - sale_percent: 35%');
    console.log('  - supplier_price: $13.14 (KEER)');
  }

  // Update Product 2: Japanese Ceramic Soy Sauce Dispenser
  const { error: err2 } = await supabase
    .from('products')
    .update({
      product_status: 'active',
      subcategory: 'Jars & Containers',
      store_link: 'https://www.etsy.com/shop/AlmaHomestuff?ref=shop-header-name&listing_id=4422195399&from_page=listing',
      store_name: 'AlmaHomestuff',
      weekly_monthly_sales: 'חודשי - 2',
      store_age: '2',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4422195399/japanese-ceramic-soy-sauce-dispenser',
      ali_link: 'https://he.aliexpress.com/item/1005008812037203.html',
      supplier_link: 'https://detail.1688.com/offer/984837206217.html',
      competitor_price: 49.24,
      competitor_shipment: 0.00,
      etsy_full_price: 50.00,
      sale_percent: 35,
      supplier_price: 10.00,
      supplier_name: 'Sain',
      remarks: 'Wyatt - 14\nSain - 10',
    })
    .eq('id', soyDispenser.id);

  if (err2) {
    console.error('Failed to update Soy Sauce Dispenser:', err2.message);
  } else {
    console.log('Updated: Japanese Ceramic Soy Sauce Dispenser');
    console.log('  - etsy_full_price: $50.00');
    console.log('  - sale_percent: 35%');
    console.log('  - supplier_price: $10.00 (Sain)');
  }

  console.log('\nDone!');
}

updateProducts();
