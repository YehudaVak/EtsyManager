# EtsyManager — Claude Memory File

## Project Overview
Etsy order management system for the store **TerraLoomz**.
Next.js 16 + React 19 + Supabase (PostgreSQL) + Tailwind CSS 4 + TypeScript.

## Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Lucide React icons
- **Backend**: Supabase (client-side queries, no server actions except `/api/auth`)
- **Auth**: Custom RBAC — roles: `master_admin`, `store_admin`, `supplier`
- **Scripts**: `npm run dev`, `npm run build`, `npm run seed` (tsx seed-database.ts)
- **Run custom scripts**: `npx tsx script-name.ts`

## Brand
- **Brand color**: `#d96f36` (BRAND_ORANGE) — used for headers, buttons, accents
- **Store name in DB**: `TerraLoomz`

## Key Decisions & Preferences

### Address
- Address is stored as a **single `address` textarea field** — no separate city/state/zip columns.
- The user types/pastes the full address block manually.
- No DB migration to split address into separate fields.

### WhatsApp Sending
- No WhatsApp API — uses **clipboard copy approach**:
  1. "Copy Image" button → copies product image to clipboard (Clipboard API)
  2. "Copy Text" button → copies formatted order text
- Message format (in `buildOrderMessage`):
  ```
  {address}
  {variation name — extracted from product_name after " – "}
  Quantity: {quantity}
  ```
- Buttons appear in order detail modal footer (admin only), green (#25D366).
- Same pattern added to ProductsDashboard for copying product image + 1688 link.

### Orders
- Each order row = 1 line item. Multi-item Etsy orders = multiple rows with same `etsy_order_no`.
- Same product + same variation ordered twice → ideally 1 row with quantity > 1 (not yet implemented — `quantity` field not yet added).
- Same product + different variation → separate rows (intentional).
- `order_from` = supplier name (free text, matches product's `supplier_name`).
- `address` = full shipping address as one block.
- `product_name` format when variation selected: `"Product Name – Variation Name"`.
- Default `fees_percent` = 12.5 (Etsy fees).

### Products
- Default `sale_percent` = **35%** (changed from 30%).
- When product fields (size, color, material, name, supplier_name, supplier_price) are updated,
  all **non-delivered** linked orders auto-update via `handleUpdateProduct`.
- `supplier_link` = 1688 link.

### Status Tabs in Orders
- All, New, Paid, Needs Tracking, Shipped, Delivered, Out of Stock, **Action Needed** (orders with `issue` field set).
- "Action Needed" bubble is always red.

### UI Patterns
- All components are `'use client'`
- Toast notifications: simple fixed bottom-center div, auto-dismiss after 2000ms
- Column headers need explicit `bg-[#d96f36]` — cannot rely on `<tr>` background when using `transition-colors`
- `overflow-x: hidden` on both `body` and `.min-h-screen` wrapper to prevent mobile horizontal scroll

### Database Scripts
- Scripts live in project root, run with `npx tsx script-name.ts`
- Always use `.env.local` for Supabase credentials
- Use `SUPABASE_SERVICE_ROLE_KEY` if available, fallback to anon key
- Store ID for TerraLoomz: fetched dynamically by name, not hardcoded

## File Map
| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | All TypeScript interfaces + Supabase client |
| `src/components/OrdersDashboard.tsx` | Main orders UI (~2800 lines) |
| `src/components/ProductsDashboard.tsx` | Products UI |
| `src/components/UsersManagement.tsx` | User/supplier management |
| `src/components/AppShell.tsx` | Layout wrapper (sidebar + main) |
| `src/components/Sidebar.tsx` | Navigation sidebar |
| `src/app/globals.css` | Global CSS |
| `supabase/` | SQL migration files |
| `seed-database.ts` | Initial DB seed script |

## Supabase Tables
- `stores` — multi-tenant stores
- `users` — all users (admin + suppliers), has `phone` field (added)
- `orders` — order rows, each = 1 line item
- `products` — product catalog
- `product_variations` — variations per product
- `product_pricing` — pricing by country
- `product_suppliers` — multiple suppliers per product
