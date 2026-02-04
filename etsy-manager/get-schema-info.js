// Get orders table schema and constraints using direct SQL queries
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

// Create a service role client if available, otherwise use anon key
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getSchemaInfo() {
  try {
    console.log('\n📊 Fetching orders table schema...\n');

    // First, let's try to select from the table to see what columns exist
    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      console.log('❌ Error querying table:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Orders table columns (from sample data):\n');
      const sampleRow = data[0];
      Object.entries(sampleRow).forEach(([key, value]) => {
        const valueType = value === null ? 'null' : typeof value;
        const valuePreview = value === null ? 'NULL' :
                           typeof value === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
                           typeof value === 'number' ? value :
                           typeof value === 'boolean' ? value :
                           JSON.stringify(value).substring(0, 50);
        console.log(`  ${key}:`);
        console.log(`    Type: ${valueType}`);
        console.log(`    Sample: ${valuePreview}\n`);
      });
    } else {
      console.log('⚠️  Table is empty. Fetching schema metadata...\n');

      // Try to get column metadata
      const { data: metadata } = await supabase
        .from('orders')
        .select('*')
        .limit(0);

      console.log('Available columns:', Object.keys(metadata || {}));
    }

    console.log(`\n📈 Total rows in table: ${count || 0}\n`);

    // Now let's try to test the supplier_status constraint
    console.log('\n🔒 Testing supplier_status constraint...\n');
    console.log('Attempting to insert invalid values to discover valid ones...\n');

    // Try different test values
    const testCases = [
      'INVALID_TEST_STATUS_XYZ',
      null,
      'Not Ordered',
      'Ordered',
      'Shipped',
      'not_ordered',
      'ordered',
      'shipped',
      'Delivered',
      'delivered',
      'Pending',
      'pending',
      'Processing',
      'processing',
      'In Transit',
      'in_transit',
      'Cancelled',
      'cancelled'
    ];

    for (const testStatus of testCases) {
      // Generate a unique test ID
      const testId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const { data: testData, error: testError } = await supabase
        .from('orders')
        .insert({
          etsy_order_id: testId,
          product_name: 'Test Product',
          sold_price: 10.00,
          supplier_status: testStatus
        })
        .select();

      if (testError) {
        console.log(`❌ "${testStatus}": ${testError.message}`);
        if (testError.details) {
          console.log(`   Details: ${testError.details}`);
        }
        if (testError.hint) {
          console.log(`   Hint: ${testError.hint}`);
        }
      } else {
        console.log(`✅ "${testStatus}": Valid value (accepted)`);
        // Clean up test data
        await supabase
          .from('orders')
          .delete()
          .eq('etsy_order_id', testId);
      }
      console.log();
    }

    // Try to query existing supplier_status values
    console.log('\n📋 Existing supplier_status values in the database:\n');
    const { data: statusData, error: statusError } = await supabase
      .from('orders')
      .select('supplier_status')
      .not('supplier_status', 'is', null);

    if (statusError) {
      console.log('❌ Error fetching status values:', statusError.message);
    } else if (statusData && statusData.length > 0) {
      const uniqueStatuses = [...new Set(statusData.map(row => row.supplier_status))];
      console.log('Unique status values found:');
      uniqueStatuses.forEach(status => {
        const count = statusData.filter(row => row.supplier_status === status).length;
        console.log(`  - "${status}" (${count} occurrences)`);
      });
    } else {
      console.log('  No supplier_status values found in existing data.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

getSchemaInfo();
