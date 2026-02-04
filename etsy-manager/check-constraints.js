// Check the orders table schema and constraints
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

async function checkTableSchema() {
  try {
    console.log('\n🔍 Checking orders table schema and constraints...\n');

    // Query to get all columns from the orders table
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
      ORDER BY ordinal_position;
    `;

    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      query: columnsQuery
    });

    if (columnsError) {
      console.log('❌ Error fetching columns:', columnsError.message);
      console.log('\nTrying alternative method...\n');

      // Alternative: try to select from the table to see columns
      const { data: sampleData, error: sampleError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log('❌ Error:', sampleError.message);
      } else if (sampleData && sampleData.length > 0) {
        console.log('✅ Orders table columns:');
        Object.keys(sampleData[0]).forEach(col => {
          const value = sampleData[0][col];
          const type = value === null ? 'unknown' : typeof value;
          console.log(`  - ${col} (${type})`);
        });
      } else {
        console.log('⚠️  Table is empty, showing columns from first query:');
        const { data: emptyData, error: emptyError } = await supabase
          .from('orders')
          .select('*')
          .limit(0);
        console.log('Columns:', Object.keys(emptyData || {}));
      }
    } else {
      console.log('✅ Orders table columns:\n');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}`);
        console.log(`    Type: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
        console.log(`    Nullable: ${col.is_nullable}`);
        if (col.column_default) {
          console.log(`    Default: ${col.column_default}`);
        }
        console.log();
      });
    }

    // Query to get check constraints
    console.log('\n🔒 Checking constraints on supplier_status column...\n');

    const constraintsQuery = `
      SELECT
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'orders'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%supplier_status%';
    `;

    const { data: constraints, error: constraintsError } = await supabase.rpc('exec_sql', {
      query: constraintsQuery
    });

    if (constraintsError) {
      console.log('❌ Error fetching constraints:', constraintsError.message);
      console.log('\nNote: This requires a custom RPC function. Let me try a direct query instead...\n');

      // Try to get constraint info through error messages
      console.log('Attempting to trigger constraint validation to see allowed values...\n');

      const testValues = ['invalid_status_test_xyz'];
      for (const testValue of testValues) {
        const { error: testError } = await supabase
          .from('orders')
          .insert({
            supplier_status: testValue
          })
          .select();

        if (testError && testError.message) {
          console.log('Constraint validation error (this is expected):');
          console.log(testError.message);
          console.log('\nDetails:', testError.details);
          console.log('\nHint:', testError.hint);
        }
      }
    } else {
      console.log('✅ Check constraints on supplier_status:\n');
      constraints.forEach(constraint => {
        console.log(`  Constraint: ${constraint.constraint_name}`);
        console.log(`  Definition: ${constraint.constraint_definition}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\n💡 Tip: You may need to check the Supabase dashboard directly:');
    console.log('   1. Go to: https://ksaaaumhhlinspgvmupe.supabase.co/project/_/editor');
    console.log('   2. Select the "orders" table');
    console.log('   3. Click the table name and select "View schema"');
    console.log('   4. Look for check constraints on the supplier_status column\n');
  }
}

checkTableSchema();
