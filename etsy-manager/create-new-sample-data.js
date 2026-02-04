// Create sample orders with NEW schema
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

// Sample orders with NEW schema fields
const sampleOrders = [
  {
    ordered_date: '2024-02-01',
    customer_name: 'Sarah Johnson',
    address: '123 Main St\nApt 4B\nNew York, NY 10001\nUSA',
    contact: 'sarah.j@email.com / +1-555-0123',
    product_link: 'https://etsy.com/listing/12345',
    size: 'Large (16x20")',
    color: 'Navy Blue',
    material: 'Canvas',
    notes: 'Please use navy blue frame. Customer wants modern look.',
    total_amount_to_pay: 125.00,
    is_paid: true,
    is_shipped: false,
    is_completed_on_etsy: false,
    is_delivered: false,
  },
  {
    ordered_date: '2024-02-02',
    customer_name: 'Michael Chen',
    address: '456 Oak Avenue\nSuite 200\nSan Francisco, CA 94102\nUSA',
    contact: 'mchen@email.com / +1-555-0456',
    product_link: 'https://etsy.com/listing/67890',
    size: 'Medium (12x16")',
    color: 'Black & White',
    material: 'Wood',
    notes: 'Engrave text: "The Chen Family 2024"',
    total_amount_to_pay: 89.50,
    tracking_number: 'USPS-1234567890',
    is_paid: true,
    is_shipped: true,
    is_completed_on_etsy: true,
    is_delivered: false,
  },
  {
    ordered_date: '2024-02-03',
    customer_name: 'Emily Rodriguez',
    address: '789 Elm Street\nAustin, TX 78701\nUSA',
    contact: 'emily.r@email.com',
    product_link: 'https://etsy.com/listing/11223',
    size: 'Small (8x10")',
    color: 'Gold',
    material: 'Metal',
    notes: 'Gift wrap requested',
    total_amount_to_pay: 45.00,
    is_paid: false,
    is_shipped: false,
    is_completed_on_etsy: false,
    is_delivered: false,
    internal_notes: 'Waiting for payment confirmation',
  },
  {
    ordered_date: '2024-02-04',
    customer_name: 'David Kim',
    address: '321 Pine Road\nSeattle, WA 98101\nUSA',
    contact: '+1-555-0789',
    product_link: 'https://etsy.com/listing/33445',
    size: 'Extra Large (24x36")',
    color: 'Natural Wood',
    material: 'Oak Wood',
    notes: 'Rush order - needed by Feb 15',
    total_amount_to_pay: 199.99,
    is_paid: true,
    is_shipped: false,
    is_completed_on_etsy: false,
    is_delivered: false,
    issue: 'Wood grain not matching customer photo',
    the_solution: 'Ordered new wood piece, will remake',
  },
  {
    ordered_date: '2024-02-05',
    customer_name: 'Lisa Anderson',
    address: '555 Maple Drive\nBoston, MA 02101\nUSA',
    contact: 'lisa.a@email.com / +1-555-0321',
    product_link: 'https://etsy.com/listing/55667',
    size: 'Medium (11x14")',
    color: 'White',
    material: 'Ceramic',
    notes: 'Personalize with: "Home Sweet Home"',
    total_amount_to_pay: 67.50,
    tracking_number: 'FEDEX-9876543210',
    is_paid: true,
    is_shipped: true,
    is_completed_on_etsy: true,
    is_delivered: true,
  },
];

async function createSampleData() {
  try {
    console.log('\n🎨 Creating sample orders with NEW schema...\n');

    // Insert sample orders
    const { data, error } = await supabase
      .from('orders')
      .insert(sampleOrders)
      .select();

    if (error) {
      console.error('❌ Error creating sample orders:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.log('\n⚠️  Make sure you have run the SQL migration first!');
      console.log('   Check migrate-to-new-schema.js output for the SQL.\n');
      return;
    }

    console.log(`✅ Created ${data.length} sample orders successfully!\n`);

    // Display summary
    console.log('📊 Sample Orders Summary:\n');
    data.forEach((order, index) => {
      console.log(`${index + 1}. ${order.customer_name}`);
      console.log(`   Date: ${order.ordered_date}`);
      console.log(`   Amount: $${order.total_amount_to_pay}`);
      console.log(`   Status: Paid=${order.is_paid}, Shipped=${order.is_shipped}, Delivered=${order.is_delivered}`);
      if (order.tracking_number) {
        console.log(`   Tracking: ${order.tracking_number}`);
      }
      if (order.issue) {
        console.log(`   Issue: ${order.issue}`);
      }
      console.log('');
    });

    // Calculate totals
    const totalAmount = data.reduce((sum, o) => sum + (o.total_amount_to_pay || 0), 0);
    const paidCount = data.filter(o => o.is_paid).length;
    const shippedCount = data.filter(o => o.is_shipped).length;

    console.log('💰 Summary:');
    console.log(`   Total Amount: $${totalAmount.toFixed(2)}`);
    console.log(`   Paid Orders: ${paidCount}/${data.length}`);
    console.log(`   Shipped Orders: ${shippedCount}/${data.length}\n`);

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
