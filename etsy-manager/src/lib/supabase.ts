import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database - matching new schema
export interface Order {
  // Primary key
  id: string; // UUID - Primary Key
  created_at?: string; // Timestamp
  updated_at?: string; // Timestamp

  // Order details
  ordered_date?: string; // Date
  customer_name?: string;
  address?: string;
  contact?: string;
  product_link?: string;
  image_url?: string;

  // Product specifications
  size?: string;
  color?: string;
  material?: string;
  notes?: string;

  // Financial
  total_amount_to_pay?: number;

  // Shipping & Status
  tracking_number?: string;
  is_paid?: boolean;
  is_shipped?: boolean;
  is_completed_on_etsy?: boolean;
  is_delivered?: boolean;

  // Issues & Solutions
  issue?: string;
  the_solution?: string;
  internal_notes?: string;
}

// Type for supplier view (excludes financial data)
export type SupplierOrder = Omit<Order, 'total_amount_to_pay'>;
