const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

const STORE_ID = '3b91cdbe-8f49-4cf7-85a9-78d2e4093ff3';
const productIds = [
  '4f5b214e-c2fc-48d2-aaf5-02f51aef0453',
  '2b6320ac-0a7b-4220-95ab-916097759dc2',
];

async function fix() {
  const { error } = await supabase
    .from('products')
    .update({ store_id: STORE_ID })
    .in('id', productIds);

  if (error) console.error('Error:', error.message);
  else console.log('Updated store_id for both products!');
}
fix();
