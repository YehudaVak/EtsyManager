const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

async function check() {
  const { data } = await supabase.from('stores').select('id, name');
  console.log('Stores:', data);

  const { data: products } = await supabase.from('products').select('id, name, store_id').order('created_at', { ascending: false }).limit(5);
  console.log('Recent products:', products);
}
check();
