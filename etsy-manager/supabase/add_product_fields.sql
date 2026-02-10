-- Add missing product fields from Excel template
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_link TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weekly_monthly_sales TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_age TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitors TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ali_link TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitor_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS competitor_shipment DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_price DECIMAL(10,2);
