// Clean up any test data that was inserted
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
  try {
    console.log('\n🧹 Cleaning up test data...\n');

    // Delete any records with etsy_order_id starting with "TEST_"
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .like('etsy_order_id', 'TEST_%')
      .select();

    if (error) {
      console.log('❌ Error during cleanup:', error.message);
    } else {
      console.log(`✅ Cleaned up ${data?.length || 0} test records\n`);
      if (data && data.length > 0) {
        console.log('Deleted test records:');
        data.forEach(record => {
          console.log(`  - ${record.etsy_order_id} (${record.supplier_status})`);
        });
      }
    }

    // Verify cleanup
    const { data: remaining, error: checkError } = await supabase
      .from('orders')
      .select('etsy_order_id')
      .like('etsy_order_id', 'TEST_%');

    if (!checkError && remaining) {
      console.log(`\n📊 Remaining test records: ${remaining.length}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

cleanup();
