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
      name: 'Japanese Ceramic Ramen Bowl And Cover Primer Colored Bowl Black Tableware Vintage Noodles Bowl, Bamboo And Wooden Lid And Spoon',
      product_status: 'active',
      is_active: true,
      subcategory: 'Bowls',
      store_link: 'https://www.etsy.com/shop/ayakanakaw?ref=shop-header-name&listing_id=4366826290&from_page=listing',
      store_name: 'ayakanakaw',
      weekly_monthly_sales: 'חודשי - 16',
      store_age: '11',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/1889712282/japanese-ceramic-ramen-bowl-and-cover',
      ali_link: 'https://www.aliexpress.us/item/3256803183427861.html',
      supplier_link: 'https://detail.1688.com/offer/546489688647.html',
      competitor_price: 43.00,
      competitor_shipment: 14.00,
      etsy_full_price: 78.00,
      sale_percent: 35,
      supplier_price: 20.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Wyatt', price: 29.00, is_selected: false },
      { name: 'Sain', price: 20.00, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Ceramic Ramen Bowl, Noodle Soup Bowl, Vintage Noodles Bowl, Noodle, Soup, Rice Bowl, Gift For Food Lovers, Kitchen Tableware Gift',
      product_status: 'active',
      is_active: true,
      subcategory: 'Bowls',
      store_link: 'https://www.etsy.com/shop/ayakanakaw?ref=shop-header-name&listing_id=4366826290&from_page=listing',
      store_name: 'ayakanakaw',
      weekly_monthly_sales: 'חודשי - 10',
      store_age: '11',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4375846168/japanese-ceramic-ramen-bowl-noodle-soup',
      ali_link: 'https://www.aliexpress.us/item/3256810419193574.html',
      supplier_link: 'https://detail.1688.com/offer/645229370718.html',
      competitor_price: 42.00,
      competitor_shipment: 10.00,
      etsy_full_price: 70.00,
      sale_percent: 35,
      supplier_price: 16.50,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Wyatt', price: 20.00, is_selected: false },
      { name: 'Sain', price: 16.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'HandMade 5 inch Pottery Chip And Dip Bowl, Dip Me And Eat Me Chip And Dip Bowl, Ceramic Individual Snack Size Chip And Dip Platter, Unique Gift',
      product_status: 'active',
      is_active: true,
      subcategory: 'Cake Stands',
      store_link: 'https://www.etsy.com/shop/ThebrCrafts?ref=condensed_trust_header_title_sold',
      store_name: 'ThebrCrafts',
      weekly_monthly_sales: 'חודשי - 18',
      store_age: '11',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4391961576/handmade-5-inch-pottery-chip-and-dip',
      ali_link: 'https://www.aliexpress.us/item/3256807684765885.html',
      supplier_link: 'https://detail.1688.com/offer/905555046326.html',
      competitor_price: 28.00,
      competitor_shipment: 0.00,
      etsy_full_price: 38.00,
      sale_percent: 35,
      supplier_price: 11.50,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'KEER', price: 13.20, is_selected: false },
      { name: 'Sain', price: 11.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Ceramic Tea Mug with Wooden Handles Stone Coffee Mug Tea Cup Latte Cup for Hot Drinks Handmade Artisan Vintage Gift Unique Colours',
      product_status: 'active',
      is_active: true,
      subcategory: 'Mugs',
      store_link: 'https://www.etsy.com/shop/EarthWareEco?ref=condensed_trust_header_title_sold',
      store_name: 'EarthWareEco',
      weekly_monthly_sales: 'חודשי - 21',
      store_age: '8',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/1888076922/japanese-ceramic-tea-mug-with-wooden',
      ali_link: 'https://www.aliexpress.us/item/3256803122507703.html',
      supplier_link: 'https://detail.1688.com/offer/636054453768.html',
      competitor_price: 49.35,
      competitor_shipment: 4.22,
      etsy_full_price: 68.00,
      sale_percent: 35,
      supplier_price: 23.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'KEER', price: 25.00, is_selected: false },
      { name: 'Sain', price: 23.00, is_selected: true },
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
