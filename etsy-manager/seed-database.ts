import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use service role key if available, otherwise use anon key (RLS policies allow inserts)
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample pricing data extracted from images
const PRICING_DATA: { [productName: string]: any[] } = {
  'SG-ZXM-XW30000-Yehuda-1001': [
    { country: 'CH', price: 11.25, shipping_time: '6-9days' },
    { country: 'BE', price: 9.91, shipping_time: '6-10days' },
    { country: 'DE', price: 9.39, shipping_time: '6-10days' },
    { country: 'FR', price: 9.38, shipping_time: '6-10days' },
    { country: 'US', price: 10.77, shipping_time: '6-12days' },
  ],
  'SG-ZXM-XW30000-Yehuda-1002': [
    { country: 'CH', price: 9.60, shipping_time: '6-9days' },
    { country: 'BE', price: 8.66, shipping_time: '6-10days' },
    { country: 'DE', price: 7.80, shipping_time: '6-10days' },
    { country: 'FR', price: 7.67, shipping_time: '6-10days' },
    { country: 'US', price: 9.30, shipping_time: '6-12days' },
  ],
  'SG-ZXM-XW30000-Yehuda-1005': [
    { country: 'CH', price: 18.31, shipping_time: '6-9days' },
    { country: 'US', price: 16.33, shipping_time: '6-12days' },
    { country: 'BE', price: 14.49, shipping_time: '6-10days' },
    { country: 'DE', price: 12.94, shipping_time: '6-10days' },
    { country: 'FR', price: 13.45, shipping_time: '6-10days' },
  ],
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // ====================================
    // Step 1: Create Default Store
    // ====================================
    console.log('🏪 Creating default store...');
    let storeId: string;

    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('name', 'TerraLoomz')
      .single();

    if (existingStore) {
      storeId = existingStore.id;
      console.log(`  ✅ Store "TerraLoomz" already exists (${storeId})`);
    } else {
      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: 'TerraLoomz',
          etsy_shop_name: 'TerraLoomz',
          description: 'Main Etsy store',
          is_active: true,
        })
        .select()
        .single();

      if (storeError) throw storeError;
      storeId = newStore!.id;
      console.log(`  ✅ Created store "TerraLoomz" (${storeId})`);
    }

    // ====================================
    // Step 2: Create Default Users
    // ====================================
    console.log('\n👥 Creating default users...');

    const defaultUsers = [
      {
        username: 'admin',
        password: 'Order100!',
        role: 'master_admin',
        full_name: 'Master Administrator',
        email: 'admin@terraloomz.com',
        store_id: null, // Master admin has no specific store
      },
      {
        username: 'Terraloomz',
        password: 'Order100!',
        role: 'store_admin',
        full_name: 'TerraLoomz Admin',
        email: 'terraloomz@example.com',
        store_id: storeId,
      },
      {
        username: 'Supplier',
        password: 'Sain159',
        role: 'supplier',
        full_name: 'Sain (Supplier)',
        email: 'sain@supplier.com',
        store_id: storeId,
      },
    ];

    for (const user of defaultUsers) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .single();

      if (existingUser) {
        console.log(`  ⚠️  User "${user.username}" already exists, skipping...`);
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 10);

      const { error: userError } = await supabase.from('users').insert({
        username: user.username,
        password_hash: passwordHash,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        store_id: user.store_id,
        is_active: true,
      });

      if (userError) {
        console.error(`  ❌ Error creating user "${user.username}":`, userError.message);
      } else {
        console.log(`  ✅ Created user: ${user.username} (${user.role})`);
      }
    }

    // ====================================
    // Step 3: Seed Products
    // ====================================
    console.log('\n📦 Seeding products...');
    const productsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'products-extracted.json'), 'utf-8')
    );

    const productIdMap: { [key: string]: string } = {};

    for (const [index, product] of productsData.products.entries()) {
      const productName = product.name || `Product ${index + 1}`;

      // Insert product with store_id
      const { data: productResult, error: productError } = await supabase
        .from('products')
        .insert({
          name: productName,
          description: product.description || '',
          image_url: product.image_file ? `/whatsapp-images/${product.image_file}` : null,
          product_link: product.product_link || null,
          variants: product.variants || 'UNI',
          supplier_name: product.supplier_name || 'Sain',
          is_active: true,
          is_out_of_stock: false,
          notes: '',
          store_id: storeId, // Assign to default store
        })
        .select()
        .single();

      if (productError) {
        console.error(`  ❌ Error inserting product "${productName}":`, productError.message);
        continue;
      }

      productIdMap[product.product_link] = productResult.id;
      console.log(`  ✅ Inserted: ${productName}`);

      // Insert pricing if available
      const pricingData = PRICING_DATA[productName] || product.pricing || [];

      if (pricingData.length > 0) {
        for (const pricing of pricingData) {
          const { error: pricingError } = await supabase
            .from('product_pricing')
            .insert({
              product_id: productResult.id,
              country: pricing.country,
              price: pricing.price,
              shipping_time: pricing.shipping_time || null,
            });

          if (pricingError) {
            console.error(`    ⚠️  Error inserting pricing for ${pricing.country}:`, pricingError.message);
          }
        }
      }
    }

    console.log(`\n✅ Inserted ${Object.keys(productIdMap).length} products\n`);

    // ====================================
    // Step 4: Seed Orders
    // ====================================
    console.log('📋 Seeding orders...');
    const ordersData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'orders-extracted.json'), 'utf-8')
    );

    let successCount = 0;

    for (const order of ordersData.orders) {
      // Find product_id if product_link exists
      const productId = order.product_link ? productIdMap[order.product_link] : null;

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert({
          image_url: order.image_file ? `/whatsapp-images/${order.image_file}` : null,
          ordered_date: order.ordered_date || null,
          product_name: order.product_name || '',
          etsy_order_no: order.etsy_order_no || null,
          customer_name: order.customer_name || '',
          address: order.address || '',
          product_link: order.product_link || null,
          size: order.size || null,
          color: order.color || null,
          material: order.material || null,
          notes: order.notes || '',
          first_message_sent: false,
          total_amount_to_pay: order.total_amount_to_pay ? parseFloat(order.total_amount_to_pay) : null,
          tracking_number: order.tracking_number || null,
          is_paid: order.is_shipped ? true : false,
          tracking_added: !!order.tracking_number,
          is_shipped: order.is_shipped || false,
          shipped_message_sent: false,
          is_completed_on_etsy: false,
          is_delivered: false,
          review_message_sent: false,
          supplier_acknowledged: true,
          is_out_of_stock: false,
          order_from: order.order_from || 'Sain',
          product_id: productId,
          store_id: storeId, // Assign to default store
        })
        .select()
        .single();

      if (orderError) {
        console.error(`  ❌ Error inserting order for ${order.customer_name}:`, orderError.message);
        continue;
      }

      successCount++;
      console.log(`  ✅ Order #${successCount}: ${order.customer_name} - ${order.product_name}`);
    }

    console.log(`\n✅ Inserted ${successCount} orders\n`);

    // ====================================
    // Summary
    // ====================================
    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Store: TerraLoomz (${storeId})`);
    console.log(`   - Users: 3 (master_admin, store_admin, supplier)`);
    console.log(`   - Products: ${Object.keys(productIdMap).length}`);
    console.log(`   - Orders: ${successCount}`);
    console.log('\n📝 Login credentials:');
    console.log('   Master Admin: username="admin", password="Order100!"');
    console.log('   Store Admin:  username="Terraloomz", password="Order100!"');
    console.log('   Supplier:     username="Supplier", password="Sain159"');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
