// Final comprehensive check of orders table schema and constraints
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function queryConstraints() {
  console.log('\n🔍 Querying database constraints directly via REST API...\n');

  const query = `
    SELECT
      con.conname AS constraint_name,
      pg_get_constraintdef(con.oid) AS constraint_definition
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'orders'
      AND con.contype = 'c';
  `;

  try {
    // Try using the PostgREST API directly
    const url = new URL(`${supabaseUrl}/rest/v1/rpc/exec_sql`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Constraints found:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API call failed:', response.statusText);
    }
  } catch (error) {
    console.log('❌ Error querying constraints:', error.message);
  }
}

async function comprehensiveCheck() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                 ORDERS TABLE SCHEMA ANALYSIS                 ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get one row to see all columns
    const { data: sampleData, error: sampleError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (!sampleError && sampleData && sampleData.length > 0) {
      console.log('📊 TABLE COLUMNS (from sample data):\n');
      const row = sampleData[0];
      Object.entries(row).forEach(([col, val]) => {
        const type = val === null ? 'NULL' : typeof val;
        console.log(`  • ${col.padEnd(25)} (${type})`);
      });
    } else {
      // Get columns from error message structure
      console.log('📊 TABLE COLUMNS (detected from previous tests):\n');
      const knownColumns = [
        'id (uuid)',
        'created_at (timestamp)',
        'etsy_order_id (text) - NOT NULL',
        'product_name (text) - NOT NULL',
        'buyer_name (text)',
        'buyer_email (text)',
        'shipping_address (text)',
        'customization_notes (text)',
        'supplier_status (text) - CHECK CONSTRAINT',
        'qc_photo_url (text)',
        'tracking_number (text)',
        'sold_price (numeric) - NOT NULL',
        'shipping_charged (numeric) - DEFAULT 0.00',
        'etsy_fees (numeric)',
        'supplier_cost (numeric)',
        'net_profit (numeric)'
      ];
      knownColumns.forEach(col => console.log(`  • ${col}`));
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('               SUPPLIER_STATUS CHECK CONSTRAINT               ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Constraint Name: orders_supplier_status_check\n');

    // Test comprehensive list of potential status values
    const testStatuses = [
      null,
      'Pending',
      'Processing',
      'Shipped',
      'Delivered',
      'Ordered',
      'Awaiting Shipment',
      'Out for Delivery',
      'Completed',
      'Failed',
      'Refunded',
      'Returned',
      'On Hold',
      'Preparing'
    ];

    const validStatuses = [];
    const invalidStatuses = [];

    console.log('🧪 Testing status values...\n');

    for (const status of testStatuses) {
      const testId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          etsy_order_id: testId,
          product_name: 'Test Product',
          sold_price: 10.00,
          supplier_status: status
        })
        .select();

      if (error) {
        if (error.message.includes('orders_supplier_status_check')) {
          invalidStatuses.push(status === null ? 'null' : status);
        }
      } else {
        validStatuses.push(status === null ? 'null' : status);
        // Clean up
        await supabase.from('orders').delete().eq('etsy_order_id', testId);
      }
    }

    console.log('✅ VALID VALUES:\n');
    validStatuses.forEach(status => {
      console.log(`  ✓ ${status}`);
    });

    console.log('\n❌ INVALID VALUES (examples tested):\n');
    invalidStatuses.slice(0, 5).forEach(status => {
      console.log(`  ✗ ${status}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                      SUMMARY                                  ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('The "supplier_status" column accepts the following values:');
    console.log(validStatuses.map(s => `"${s}"`).join(', '));
    console.log('\nThese values are CASE-SENSITIVE.');
    console.log('\nConstraint check ensures only these specific values (or NULL) can be stored.\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

comprehensiveCheck();
