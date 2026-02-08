-- Create stores table for multi-tenant support
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Basic Info
  name TEXT NOT NULL UNIQUE, -- e.g., "TerraLoomz", "MyShop2"
  etsy_shop_name TEXT,
  description TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb, -- Store-specific settings

  -- Notes
  notes TEXT
);

-- Create index for active stores
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stores_updated_at ON stores;
CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read stores
CREATE POLICY "Enable read access for all users" ON stores
  FOR SELECT USING (true);

-- Only admins can insert/update/delete (will be enforced at application level)
CREATE POLICY "Enable insert for all users" ON stores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON stores
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON stores
  FOR DELETE USING (true);
