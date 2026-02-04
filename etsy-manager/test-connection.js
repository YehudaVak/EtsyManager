// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📊 Checking database tables...\n');

    // Test orders table
    const { data: orders, error: ordersError, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (ordersError) {
      console.log('❌ Orders table error:', ordersError.message);
      if (ordersError.message.includes('relation') || ordersError.message.includes('does not exist')) {
        console.log('\n💡 The "orders" table does not exist yet.');
        console.log('   You need to create it in Supabase with the required schema.\n');
      }
    } else {
      console.log('✅ Orders table: Connected');
      console.log(`   Found ${count} total orders`);
      if (orders && orders.length > 0) {
        console.log(`   Sample: ${orders.length} order(s) retrieved`);
        console.log('\n   First order sample:');
        console.log('   -', {
          id: orders[0].id,
          receipt_id: orders[0].receipt_id,
          buyer_email: orders[0].buyer_email || 'N/A',
          total_price: orders[0].total_price,
          status: orders[0].status || 'N/A',
          product_name: orders[0].product_name || 'N/A'
        });
      } else {
        console.log('   ⚠️  No orders found (table is empty)');
      }
    }

    // Test order_items table
    console.log('');
    const { error: itemsError, count: itemsCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true });

    if (itemsError) {
      console.log('ℹ️  Order_items table:', itemsError.message.includes('relation') ? 'Not found (optional)' : itemsError.message);
    } else {
      console.log('✅ Order_items table: Connected');
      console.log(`   Found ${itemsCount} items`);
    }

    console.log('\n✨ Connection test complete!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testConnection();
