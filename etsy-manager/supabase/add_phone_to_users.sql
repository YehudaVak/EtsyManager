-- Add phone/WhatsApp number to users table for WhatsApp messaging
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
