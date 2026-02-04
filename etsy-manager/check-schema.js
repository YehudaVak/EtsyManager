// Check the actual database schema
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

async function checkSchema() {
  try {
    console.log('\n🔍 Checking actual database schema...\n');

    // Try to insert a minimal test record to see what columns are required
    const testOrder = {
      id: 9999, // Temporary test ID
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();

    if (error) {
      console.log('Schema check error (expected):');
      console.log('Message:', error.message);
      console.log('Details:', error.details);
      console.log('Hint:', error.hint);

      // Try to get any existing rows to see the structure
      console.log('\n📊 Attempting to query existing structure...\n');

      const { data: existing, error: queryError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

      if (queryError) {
        console.log('Query error:', queryError.message);
      } else if (existing && existing.length > 0) {
        console.log('✅ Found existing data. Columns are:');
        console.log(Object.keys(existing[0]));
      } else {
        console.log('Table is empty. Cannot determine exact schema.');
        console.log('\n💡 Please share your orders table schema from Supabase.');
        console.log('   Go to: Supabase Dashboard > Table Editor > orders > View Schema\n');
      }
    } else {
      // Clean up test record
      await supabase.from('orders').delete().eq('id', 9999);
      console.log('✅ Test insert successful');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
