-- Add parent_product_id to products table for variation-as-product support
-- A product with parent_product_id set is a "variation" (sub-product) of the parent
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Index for fast lookups of child products
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id ON products(parent_product_id);
