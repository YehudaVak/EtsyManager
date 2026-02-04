// Try to get the actual SQL constraint definition
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function getConstraintDefinition() {
  console.log('\n🔍 Attempting to retrieve the SQL constraint definition...\n');

  // Method 1: Try direct SQL query if service role is available
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Using service role key to query system tables...\n');

    const supabase = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY);

    // First, try to see if there's an RPC function available
    const { data: functions, error: functionsError } = await supabase
      .rpc('list_functions')
      .catch(() => ({ data: null, error: { message: 'Function not available' } }));

    if (!functionsError && functions) {
      console.log('Available RPC functions:', functions);
    }
  } else {
    console.log('⚠️  No service role key found. Using anon key (limited permissions).\n');
  }

  // Method 2: Use REST API to query pg_catalog
  console.log('Attempting REST API query for constraint definition...\n');

  const sqlQuery = `
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition,
  con.contype AS constraint_type,
  att.attname AS column_name
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
LEFT JOIN pg_attribute att ON att.attrelid = con.conrelid
  AND att.attnum = ANY(con.conkey)
WHERE nsp.nspname = 'public'
  AND rel.relname = 'orders'
  AND con.conname = 'orders_supplier_status_check';
  `.trim();

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sqlQuery })
    });

    const data = await response.json();

    if (response.ok && data) {
      console.log('✅ Constraint definition retrieved:\n');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ REST API method failed:', data);
    }
  } catch (error) {
    console.log('❌ Error with REST API:', error.message);
  }

  // Method 3: Based on testing, infer the constraint
  console.log('\n📋 INFERRED CONSTRAINT DEFINITION:\n');
  console.log('Based on the testing results, the constraint is likely defined as:\n');
  console.log('ALTER TABLE orders');
  console.log('ADD CONSTRAINT orders_supplier_status_check');
  console.log("CHECK (supplier_status IS NULL OR supplier_status IN ('Pending', 'Processing', 'Shipped', 'Delivered'));\n");

  console.log('\nThis means:');
  console.log('• The column can be NULL (no status set)');
  console.log('• Or it must be exactly one of these case-sensitive values:');
  console.log('  - "Pending"');
  console.log('  - "Processing"');
  console.log('  - "Shipped"');
  console.log('  - "Delivered"');
  console.log('• Any other value will be rejected by the database\n');
}

getConstraintDefinition();
