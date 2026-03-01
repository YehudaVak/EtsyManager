import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Store interface for multi-tenant support
export interface Store {
  id: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  etsy_shop_name?: string;
  description?: string;
  is_active: boolean;
  settings?: Record<string, any>;
  notes?: string;
}

// User interface for authentication with RBAC
export type UserRole = 'master_admin' | 'store_admin' | 'supplier';

export interface User {
  id: string;
  created_at?: string;
  updated_at?: string;
  username: string;
  password_hash: string;
  email?: string;
  role: UserRole;
  store_id?: string; // NULL for master_admin
  full_name?: string;
  phone?: string;
  is_active: boolean;
  settings?: Record<string, any>;
  last_login_at?: string;
}

// User without sensitive data (for client-side use)
export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  store_id?: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
}

// Types matching Excel structure exactly
export interface Order {
  // Primary key
  id: string;
  created_at?: string;
  updated_at?: string;

  // Basic Order Info
  image_url?: string;
  ordered_date?: string;
  ship_by?: string;
  product_name?: string;
  etsy_order_no?: string;
  customer_name?: string;
  address?: string;

  // Product Details
  product_link?: string;
  size?: string;
  color?: string;
  material?: string;
  notes?: string;
  quantity?: number;

  // Communication Status
  first_message_sent?: boolean;

  // Supplier Payment
  total_amount_to_pay?: number;

  // Shipping & Status
  tracking_number?: string;
  is_paid?: boolean;
  tracking_added?: boolean;
  is_shipped?: boolean;
  shipped_message_sent?: boolean;
  is_completed_on_etsy?: boolean;
  is_delivered?: boolean;
  review_message_sent?: boolean;

  // Supplier Status
  supplier_acknowledged?: boolean;
  is_out_of_stock?: boolean;

  // Supplier Info
  order_from?: string;

  // Financial (Admin Only)
  sold_for?: number;
  fees_percent?: number;
  product_cost?: number;
  profit?: number;

  // Issues & Notes
  issue?: string;
  the_solution?: string;
  internal_notes?: string;

  // Product Link
  product_id?: string;
  variation_id?: string;

  // Multi-tenant
  store_id?: string;
}

// Financial fields that should be hidden from Supplier view (excludes total_amount_to_pay which supplier can see)
export const FINANCIAL_FIELDS = [
  'sold_for',
  'fees_percent',
  'product_cost',
  'profit'
] as const;

// Type for supplier view (excludes financial data, but includes total_amount_to_pay)
export type SupplierOrder = Omit<Order,
  'sold_for' | 'fees_percent' | 'product_cost' | 'profit'
>;

// Columns to select for supplier (excludes financial except total_amount_to_pay)
export const SUPPLIER_SELECT_COLUMNS = `
  id, created_at, updated_at,
  image_url, ordered_date, ship_by, product_name, etsy_order_no, customer_name, address,
  product_link, size, color, material, notes,
  first_message_sent, total_amount_to_pay, tracking_number, is_paid, tracking_added,
  is_shipped, shipped_message_sent, is_completed_on_etsy,
  is_delivered, review_message_sent, order_from,
  supplier_acknowledged, is_out_of_stock,
  issue, the_solution, internal_notes,
  product_id
`;

// Product interface for quotation system
export interface Product {
  id: string;
  created_at?: string;
  updated_at?: string;

  // Basic Info
  name: string;
  description?: string;
  image_url?: string;
  product_link?: string;
  etsy_listing_id?: string;
  supplier_link?: string;
  subcategory?: string;

  // Product Details
  size?: string;
  color?: string;
  material?: string;

  // Etsy Pricing
  etsy_full_price?: number;
  sale_percent?: number;

  // Variants
  variants?: string;

  // Supplier Info
  supplier_name?: string;
  supplier_price?: number;

  // Competitor / Store Research
  store_link?: string;
  store_name?: string;
  weekly_monthly_sales?: string;
  store_age?: string;
  competitors?: string;
  ali_link?: string;
  competitor_price?: number;
  competitor_shipment?: number;
  remarks?: string;

  // Status
  product_status?: string; // 'active' | 'to_quote' | 'quotation_received'
  is_active: boolean;
  is_out_of_stock?: boolean;

  // Notes
  notes?: string;

  // Multi-tenant
  store_id?: string;
}

// Product pricing by country/region
export interface ProductPricing {
  id: string;
  product_id: string;
  country: string; // e.g., "US", "UK/GB", "EU"
  price: number;
  shipping_time?: string; // e.g., "6-12days"
  created_at?: string;
  updated_at?: string;
}

// Product variation (e.g., Blue Teapot, Green Teapot)
export interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  image_url?: string;
  color?: string;
  size?: string;
  material?: string;
  price?: number;
  shipping_time?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

// Product supplier (multiple suppliers per product, one selected)
export interface ProductSupplier {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_selected: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

// Product with pricing, variations, and suppliers
export interface ProductWithPricing extends Product {
  pricing?: ProductPricing[];
  variations?: ProductVariation[];
  suppliers?: ProductSupplier[];
}
