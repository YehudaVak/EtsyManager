-- Create users table for authentication with multi-tenant support
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Authentication
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- bcrypt hash
  email TEXT,

  -- Role-based access
  role TEXT NOT NULL CHECK (role IN ('master_admin', 'store_admin', 'supplier')),

  -- Store association (NULL for master_admin, specific store_id for others)
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

  -- User Info
  full_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Last login
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT store_required_for_non_master CHECK (
    (role = 'master_admin' AND store_id IS NULL) OR
    (role IN ('store_admin', 'supplier') AND store_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at(); -- Reuse the function

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read their own data
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON users
  FOR DELETE USING (true);
