-- Create products table for quotation system
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  product_link TEXT,

  -- Variants (e.g., "UNI", "S,M,L", etc.)
  variants TEXT,

  -- Supplier Info
  supplier_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_out_of_stock BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT
);

-- Create product_pricing table for country-based pricing
CREATE TABLE IF NOT EXISTS product_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  country TEXT NOT NULL, -- e.g., "US", "UK/GB", "EU"
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_time TEXT, -- e.g., "6-12days"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one price per product per country
  UNIQUE(product_id, country)
);

-- Add product_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_supplier_name ON products(supplier_name);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_product_id ON product_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_country ON product_pricing(country);

-- Create trigger to update updated_at timestamp for products
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Create trigger for product_pricing
DROP TRIGGER IF EXISTS product_pricing_updated_at ON product_pricing;
CREATE TRIGGER product_pricing_updated_at
  BEFORE UPDATE ON product_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Enable RLS (Row Level Security) for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON products
  FOR DELETE USING (true);

-- Enable RLS for product_pricing
ALTER TABLE product_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON product_pricing
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON product_pricing
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON product_pricing
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON product_pricing
  FOR DELETE USING (true);
