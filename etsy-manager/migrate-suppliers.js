const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ksaaaumhhlinspgvmupe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWFhdW1oaGxpbnNwZ3ZtdXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NTcsImV4cCI6MjA4NTgwNDk1N30.fASNe668BDqjYbubOuasHHkiptcHnJZ0yD_9BvBZyWI'
);

const STORE_ID = '3b91cdbe-8f49-4cf7-85a9-78d2e4093ff3'; // TerraLoomz

async function migrateSuppliers() {
  // Fetch existing products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, supplier_name, supplier_price, remarks')
    .eq('store_id', STORE_ID);

  if (error) {
    console.error('Failed to fetch products:', error.message);
    return;
  }

  console.log(`Found ${products.length} products\n`);

  for (const product of products) {
    console.log(`Processing: ${product.name}`);

    // Check if suppliers already exist for this product
    const { data: existing } = await supabase
      .from('product_suppliers')
      .select('id')
      .eq('product_id', product.id);

    if (existing && existing.length > 0) {
      console.log(`  → Already has ${existing.length} suppliers, skipping\n`);
      continue;
    }

    // Parse remarks for supplier info (format: "KEER - 13.14\nSain - 11")
    const suppliers = [];
    if (product.remarks) {
      const lines = product.remarks.split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^(.+?)\s*-\s*(\d+(?:\.\d+)?)$/);
        if (match) {
          suppliers.push({ name: match[1].trim(), price: parseFloat(match[2]) });
        }
      }
    }

    // If no suppliers parsed from remarks, use the current supplier_name/supplier_price
    if (suppliers.length === 0 && product.supplier_name) {
      suppliers.push({
        name: product.supplier_name,
        price: product.supplier_price || 0,
      });
    }

    // Mark the one matching current supplier_name + supplier_price as selected
    const rows = suppliers.map((s) => ({
      product_id: product.id,
      name: s.name,
      price: s.price,
      is_selected: s.name === product.supplier_name && s.price === product.supplier_price,
    }));

    // If none matched as selected, select the first one
    if (rows.length > 0 && !rows.some(r => r.is_selected)) {
      rows[0].is_selected = true;
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('product_suppliers')
        .insert(rows);

      if (insertError) {
        console.error(`  → Error inserting suppliers:`, insertError.message);
      } else {
        console.log(`  → Inserted ${rows.length} suppliers:`);
        rows.forEach(r => console.log(`    ${r.is_selected ? '●' : '○'} ${r.name} - $${r.price}`));
      }
    } else {
      console.log('  → No supplier data found');
    }
    console.log('');
  }

  console.log('Done!');
}

migrateSuppliers();
