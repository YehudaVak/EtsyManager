const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

const STORE_ID = '3b91cdbe-8f49-4cf7-85a9-78d2e4093ff3'; // TerraLoomz

const products = [
  {
    store_id: STORE_ID,
    name: 'Japanese Ceramic Oil Dispenser – Rustic Glazed Cruet, 100ml',
    product_status: 'active',
    is_active: true,
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
    etsy_full_price: 44.29,
    sale_percent: 30,
    supplier_price: 11,
    supplier_name: 'Sain',
    remarks: 'KEER - 13.14\nSain - 11',
  },
  {
    store_id: STORE_ID,
    name: 'Japanese Ceramic Soy Sauce Dispenser - Wabi-Sabi Style Stoneware Vinegar & Oil Cruet - Rustic Sauce Pot for Sushi, Table Decor',
    product_status: 'active',
    is_active: true,
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
    sale_percent: 30,
    supplier_price: 10,
    supplier_name: 'Sain',
    remarks: 'Wyatt - 14\nSain - 10',
  },
];

async function importProducts() {
  console.log(`Importing ${products.length} products...`);

  for (const product of products) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select('id, name');

    if (error) {
      console.error(`Failed to insert "${product.name}":`, error.message);
    } else {
      console.log(`Inserted: ${data[0].name} (ID: ${data[0].id})`);
    }
  }

  console.log('Done!');
}

importProducts();
