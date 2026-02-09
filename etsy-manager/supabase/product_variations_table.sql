-- Create product_variations table
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS product_variations_updated_at ON product_variations;
CREATE TRIGGER product_variations_updated_at
  BEFORE UPDATE ON product_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Enable RLS
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON product_variations
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON product_variations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON product_variations
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON product_variations
  FOR DELETE USING (true);
