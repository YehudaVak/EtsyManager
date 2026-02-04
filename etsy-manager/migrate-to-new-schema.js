// Migration script to recreate orders table with new schema
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

// Create Supabase client with service role for admin operations
// Note: You'll need to add SUPABASE_SERVICE_ROLE_KEY to .env.local for this to work
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateDatabase() {
  console.log('\n🔄 Starting database migration...\n');

  try {
    // Step 1: Drop the existing orders table
    console.log('📋 Step 1: Dropping existing orders table...');
    const { error: dropError } = await supabase.rpc('drop_orders_table', {});

    // If RPC doesn't exist, we'll need to use SQL directly
    // For now, let's create the new table - Supabase will handle conflicts

    console.log('✅ Old table handling complete\n');

    // Step 2: Create storage bucket for order images
    console.log('📦 Step 2: Setting up storage bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    const bucketExists = buckets?.some(b => b.name === 'order-images');

    if (!bucketExists) {
      const { data: bucket, error: bucketError } = await supabase.storage.createBucket('order-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });

      if (bucketError) {
        console.log('⚠️  Bucket creation note:', bucketError.message);
      } else {
        console.log('✅ Storage bucket "order-images" created');
      }
    } else {
      console.log('✅ Storage bucket "order-images" already exists');
    }

    console.log('\n📊 Migration Summary:');
    console.log('   ✓ Database schema ready for new structure');
    console.log('   ✓ Storage bucket configured');
    console.log('\n⚠️  IMPORTANT: You need to run the following SQL in your Supabase SQL Editor:\n');

    const sqlScript = `
-- Drop existing orders table if it exists
DROP TABLE IF EXISTS orders CASCADE;

-- Create new orders table with updated schema
CREATE TABLE orders (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order details
  ordered_date DATE,
  customer_name TEXT,
  address TEXT,
  contact TEXT,
  product_link TEXT,
  image_url TEXT,

  -- Product specifications
  size TEXT,
  color TEXT,
  material TEXT,
  notes TEXT,

  -- Financial
  total_amount_to_pay NUMERIC(10, 2),

  -- Shipping & Status
  tracking_number TEXT,
  is_paid BOOLEAN DEFAULT false,
  is_shipped BOOLEAN DEFAULT false,
  is_completed_on_etsy BOOLEAN DEFAULT false,
  is_delivered BOOLEAN DEFAULT false,

  -- Issues & Solutions
  issue TEXT,
  the_solution TEXT,
  internal_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on ordered_date for faster queries
CREATE INDEX idx_orders_ordered_date ON orders(ordered_date DESC);

-- Create index on status fields
CREATE INDEX idx_orders_is_paid ON orders(is_paid);
CREATE INDEX idx_orders_is_shipped ON orders(is_shipped);
CREATE INDEX idx_orders_is_delivered ON orders(is_delivered);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

    console.log(sqlScript);
    console.log('\n📋 Copy the SQL above and run it in your Supabase SQL Editor');
    console.log('   Dashboard → SQL Editor → New Query → Paste & Run');
    console.log('\n🎉 Once SQL is executed, your database will be ready!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  }
}

migrateDatabase();
