-- Add store_id to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);

-- Add store_id to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);

-- Note: Existing data will have NULL store_id
-- We'll assign them to a default store in the seed script
