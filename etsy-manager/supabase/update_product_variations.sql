-- Add sub-product fields to product_variations table
ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS shipping_time TEXT;
