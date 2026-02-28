-- Add ship_by date column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_by DATE;
