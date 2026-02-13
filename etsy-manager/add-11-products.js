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
      name: 'Vintage Brass Boat Incense Holder with Fisherman, Japanese Zen Decor',
      product_status: 'active',
      is_active: true,
      subcategory: 'Incense Holders',
      store_link: 'https://www.etsy.com/shop/Silenza?ref=shop-header-name&listing_id=4356876931&from_page=listing',
      store_name: 'Silenza',
      weekly_monthly_sales: 'חודשי - 12',
      store_age: '7',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4356876931/vintage-brass-boat-incense-holder-with',
      ali_link: 'https://www.aliexpress.us/item/3256808657345549.html',
      supplier_link: 'https://detail.1688.com/offer/902898086679.html',
      competitor_price: 27.71,
      competitor_shipment: 0.00,
      etsy_full_price: 32.00,
      sale_percent: 35,
      supplier_price: 6.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 6.00, is_selected: true },
      { name: 'KEER', price: 7.72, is_selected: false },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Ceramic Tea Canister with Lid, Handmade Wabi Sabi Storage Jar, Minimal Rustic Kitchen Decor, Tea Storage Container',
      product_status: 'active',
      is_active: true,
      subcategory: 'Jars & Containers',
      store_link: 'https://www.etsy.com/shop/TakumiTable?ref=condensed_trust_header_title_sold',
      store_name: 'TakumiTable',
      weekly_monthly_sales: 'שבועי - 3',
      store_age: '1 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4429823573/japanese-ceramic-tea-canister-with-lid',
      ali_link: 'https://www.aliexpress.us/item/3256808335824415.html',
      supplier_link: 'https://detail.1688.com/offer/853534129648.html',
      competitor_price: 70.00,
      competitor_shipment: 0.00,
      etsy_full_price: 85.00,
      sale_percent: 35,
      supplier_price: 16.60,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 16.60, is_selected: true },
      { name: 'KEER', price: 17.73, is_selected: false },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Minimalist Wooden Tea Tray – Gongfu Style Slatted Drain Board with Water Drip Design',
      product_status: 'active',
      is_active: true,
      subcategory: 'Trays',
      store_link: 'https://www.etsy.com/shop/HomeifyStyle?ref=shop-header-name&listing_id=4419124063&from_page=listing',
      store_name: 'HomeifyStyle',
      weekly_monthly_sales: 'חודשי - 8',
      store_age: '1 חודשים',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4416974491/minimalist-wooden-tea-tray-gongfu-style',
      ali_link: 'https://www.aliexpress.us/item/3256809705585570.html',
      supplier_link: 'https://detail.1688.com/offer/912219661010.html',
      competitor_price: 39.34,
      competitor_shipment: 0.00,
      etsy_full_price: 59.00,
      sale_percent: 35,
      supplier_price: 13.50,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 13.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Handmade Japanese Ceramic Tea Infuser Mug Set – Minimalist Stoneware with Wooden Handle, Loose-Leaf Tea Brewing Cup',
      product_status: 'active',
      is_active: true,
      subcategory: 'Craft Supplies & Tools',
      store_link: 'https://www.etsy.com/shop/ClayoraCeramics?ref=shop-header-name&listing_id=4412012085&from_page=listing',
      store_name: 'ClayoraCeramics',
      weekly_monthly_sales: 'חודשי - 25',
      store_age: '1 חודשים',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4412012085/handmade-japanese-ceramic-tea-infuser',
      ali_link: 'https://www.aliexpress.us/item/3256802912618208.html',
      supplier_link: 'https://detail.1688.com/offer/645395587606.html',
      competitor_price: 38.97,
      competitor_shipment: 0.00,
      etsy_full_price: 57.00,
      sale_percent: 35,
      supplier_price: 22.50,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 22.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Wooden Glass Teapot Set – Minimalist Heat-Resistant Tea Brewer with Infuser and Cup',
      product_status: 'active',
      is_active: true,
      subcategory: 'Mugs',
      store_link: 'https://www.etsy.com/shop/TheCozyAtticShop?ref=condensed_trust_header_title_sold',
      store_name: 'TheCozyAtticShop',
      weekly_monthly_sales: 'חודשי - 30',
      store_age: '3 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4392372422/japanese-wooden-glass-teapot-set',
      ali_link: 'https://www.aliexpress.us/item/3256809961266218.html',
      supplier_link: 'https://detail.1688.com/offer/970035484566.html',
      competitor_price: 37.80,
      competitor_shipment: 4.85,
      etsy_full_price: 44.00,
      sale_percent: 35,
      supplier_price: 9.60,
      supplier_name: 'Sain',
      remarks: 'without tray - 32.83\nwith tray - 38.2\n200ML',
    },
    suppliers: [
      { name: 'Sain', price: 9.60, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Walnut Tea Tray – Elegant Gongfu Ceremony Base for Kung Fu Tea Lovers',
      product_status: 'active',
      is_active: true,
      subcategory: 'Trays',
      store_link: 'https://www.etsy.com/shop/HomeifyStyle?ref=shop-header-name&listing_id=4419124063&from_page=listing',
      store_name: 'HomeifyStyle',
      weekly_monthly_sales: 'חודשי - 24',
      store_age: '1 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4413481313/japanese-walnut-tea-tray-elegant-gongfu',
      ali_link: 'https://www.aliexpress.us/item/3256805217156372.html',
      supplier_link: 'https://detail.1688.com/offer/658725895648.html',
      competitor_price: 60.20,
      competitor_shipment: 0.00,
      etsy_full_price: 75.00,
      sale_percent: 35,
      supplier_price: 13.30,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 13.30, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Flower Ceramic Matcha Whisk Set with Bamboo Whisk, Ceramic Matcha Bowl Set with Spout, Unique Matcha Kit Tea Set, Matcha Gift Set Gift Ideas',
      product_status: 'active',
      is_active: true,
      subcategory: 'Tea Sets',
      store_link: 'https://www.etsy.com/shop/EarthenMuseStudio?ref=shop-header-name&listing_id=1899556159&from_page=listing',
      store_name: 'EarthenMuseStudio',
      weekly_monthly_sales: 'חודשי - 113',
      store_age: '9 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/1899556159/flower-ceramic-matcha-whisk-set-with',
      ali_link: 'https://www.aliexpress.us/item/3256809343232032.html',
      supplier_link: 'https://detail.1688.com/offer/897243239498.html',
      competitor_price: 39.70,
      competitor_shipment: 3.59,
      etsy_full_price: 60.00,
      sale_percent: 35,
      supplier_price: 20.22,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 20.22, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Handcrafted Ceramic Aroma Burner, Custom Engraved Tea Warmer, Personalized Aromatherapy Gift, Relaxation Gift',
      product_status: 'active',
      is_active: true,
      subcategory: 'Home Fragrances',
      store_link: 'https://www.etsy.com/shop/MaisonOrnament?ref=condensed_trust_header_title_sold',
      store_name: 'MaisonOrnament',
      weekly_monthly_sales: 'חודשי - 42',
      store_age: '2 חודשים',
      competitors: '2',
      product_link: 'https://www.etsy.com/listing/4400969513/ceramic-brown-black-melt-diffuser',
      ali_link: 'https://www.aliexpress.us/item/3256807613149082.html',
      supplier_link: 'https://detail.1688.com/offer/971576882293.html',
      competitor_price: 49.82,
      competitor_shipment: 11.97,
      etsy_full_price: 84.00,
      sale_percent: 35,
      supplier_price: 18.50,
      supplier_name: 'Sain',
      remarks: 'Plate only - 9$',
    },
    suppliers: [
      { name: 'Sain', price: 18.50, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Japanese Matcha Set – Ceramic Matcha Bowl & Bamboo Whisk Kit, Handmade Pottery Tea Ceremony Set, Traditional Matcha Gift Set for Tea Lovers',
      product_status: 'active',
      is_active: true,
      subcategory: 'Tea Sets',
      store_link: 'https://www.etsy.com/shop/ClaySipStudios?ref=shop-header-name&listing_id=4384468933&from_page=listing',
      store_name: 'ClaySipStudios',
      weekly_monthly_sales: 'חודשי - 19',
      store_age: '4 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4384468933/japanese-matcha-set-ceramic-matcha-bowl',
      ali_link: 'https://he.aliexpress.com/item/1005009614225214.html',
      supplier_link: 'https://detail.1688.com/offer/955666575873.html',
      competitor_price: 43.57,
      competitor_shipment: 14.07,
      etsy_full_price: 90.00,
      sale_percent: 35,
      supplier_price: 22.00,
      supplier_name: 'Sain',
      remarks: 'Bowl, 4/8 set',
    },
    suppliers: [
      { name: 'Sain', price: 22.00, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Handmade Rustic Ceramic Burner: Aromatherapy Oil Diffuser, Tea & Herb Heater',
      product_status: 'active',
      is_active: true,
      subcategory: 'Incense Holders',
      store_link: 'https://www.etsy.com/shop/EasttreasureCrafts?ref=shop-header-name&listing_id=4391697123&from_page=listing',
      store_name: 'EasttreasureCrafts',
      weekly_monthly_sales: 'חודשי - 12',
      store_age: '8 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4391697123/handmade-rustic-ceramic-burner',
      ali_link: 'https://he.aliexpress.com/item/1005010645026485.html',
      supplier_link: 'https://detail.1688.com/offer/671743830021.html',
      competitor_price: 44.10,
      competitor_shipment: 10.00,
      etsy_full_price: 76.00,
      sale_percent: 35,
      supplier_price: 18.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 18.00, is_selected: true },
    ],
  },
  {
    product: {
      store_id: STORE_ID,
      name: 'Walnut Wood Tea Tray with Built-In Water Storage, Chinese Style Small Gongfu Teapot Holder for Traditional Tea Ceremony Setup',
      product_status: 'active',
      is_active: true,
      subcategory: 'Tea Sets',
      store_link: 'https://www.etsy.com/shop/CupandEase?ref=condensed_trust_header_title_sold',
      store_name: 'CupandEase',
      weekly_monthly_sales: 'חודשי - 3',
      store_age: '4 חודשים',
      competitors: '1',
      product_link: 'https://www.etsy.com/listing/4416735618/walnut-wood-creative-water-storage-tea',
      ali_link: null,
      supplier_link: 'https://detail.1688.com/offer/842376547161.html',
      competitor_price: 48.23,
      competitor_shipment: 0.00,
      etsy_full_price: 67.00,
      sale_percent: 35,
      supplier_price: 16.00,
      supplier_name: 'Sain',
    },
    suppliers: [
      { name: 'Sain', price: 16.00, is_selected: true },
    ],
  },
];

async function addProducts() {
  for (const { product, suppliers } of products) {
    console.log(`Adding: ${product.name.substring(0, 65)}...`);

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
