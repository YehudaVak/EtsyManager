-- Create product_suppliers table
CREATE TABLE IF NOT EXISTS product_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS product_suppliers_updated_at ON product_suppliers;
CREATE TRIGGER product_suppliers_updated_at
  BEFORE UPDATE ON product_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Enable RLS
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON product_suppliers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON product_suppliers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON product_suppliers
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON product_suppliers
  FOR DELETE USING (true);
