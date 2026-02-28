-- Add etsy_listing_id to products table for reliable order matching
ALTER TABLE products ADD COLUMN IF NOT EXISTS etsy_listing_id TEXT;
