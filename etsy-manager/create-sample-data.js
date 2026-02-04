// Create sample orders - including required etsy_order_id
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Sample orders with required fields
const sampleOrders = [
  {
    etsy_order_id: '3001234567',
    product_name: 'Custom Engraved Wooden Sign',
    supplier_status: 'Pending',
    sold_price: 45.99,
    shipping_charged: 5.00,
    etsy_fees: 5.52,
    supplier_cost: 15.00,
    net_profit: 25.47
  },
  {
    etsy_order_id: '3001234568',
    product_name: 'Personalized Leather Wallet',
    supplier_status: 'Processing',
    sold_price: 89.50,
    shipping_charged: 7.50,
    etsy_fees: 10.15,
    supplier_cost: 30.00,
    net_profit: 49.35
  },
  {
    etsy_order_id: '3001234569',
    product_name: 'Custom Family Portrait Canvas',
    supplier_status: 'Shipped',
    tracking_number: 'USPS-1234567890',
    qc_photo_url: 'https://via.placeholder.com/400x300?text=QC+Photo',
    sold_price: 125.00,
    shipping_charged: 10.00,
    etsy_fees: 14.05,
    supplier_cost: 40.00,
    net_profit: 70.95
  },
  {
    etsy_order_id: '3001234570',
    product_name: 'Handmade Ceramic Mug Set',
    supplier_status: 'Pending',
    sold_price: 34.99,
    shipping_charged: 4.50,
    etsy_fees: 4.20,
    supplier_cost: 12.00,
    net_profit: 18.79
  },
  {
    etsy_order_id: '3001234571',
    product_name: 'Custom Pet Portrait Digital Art',
    supplier_status: 'Pending',
    sold_price: 67.50,
    shipping_charged: 6.00,
    etsy_fees: 7.73,
    supplier_cost: 22.00,
    net_profit: 37.77
  }
];

async function createSampleData() {
  try {
    console.log('\n🎨 Creating sample orders...\n');

    // Insert sample orders
    const { data, error } = await supabase
      .from('orders')
      .insert(sampleOrders)
      .select();

    if (error) {
      console.error('❌ Error creating sample orders:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      return;
    }

    console.log(`✅ Created ${data.length} sample orders successfully!\n`);

    // Display summary
    console.log('📊 Sample Orders Summary:\n');
    data.forEach((order, index) => {
      console.log(`${index + 1}. Order #${order.etsy_order_id}`);
      console.log(`   ID: ${order.id}`);
      console.log(`   Sold: $${order.sold_price}`);
      console.log(`   Fees: $${order.etsy_fees}`);
      console.log(`   Cost: $${order.supplier_cost}`);
      console.log(`   Net Profit: $${order.net_profit}`);
      console.log(`   Status: ${order.supplier_status}`);
      if (order.tracking_number) {
        console.log(`   Tracking: ${order.tracking_number}`);
      }
      console.log('');
    });

    // Calculate totals
    const totalRevenue = data.reduce((sum, o) => sum + (o.sold_price || 0), 0);
    const totalProfit = data.reduce((sum, o) => sum + (o.net_profit || 0), 0);
    const totalFees = data.reduce((sum, o) => sum + (o.etsy_fees || 0), 0);
    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    console.log('💰 Financial Summary:');
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   Total Fees: $${totalFees.toFixed(2)}`);
    console.log(`   Total Profit: $${totalProfit.toFixed(2)}`);
    console.log(`   Avg Margin: ${avgMargin}%\n`);

    console.log('✨ Sample data created! You can now test the dashboards.\n');
    console.log('Run: npm run dev');
    console.log('Then visit:');
    console.log('  - Admin: http://localhost:3000/admin/orders');
    console.log('  - Supplier: http://localhost:3000/supplier/orders\n');

  } catch (error) {
    console.error('❌ Failed to create sample data:', error.message);
    console.error(error);
  }
}

createSampleData();
