# Orders Table Schema Report

## Project Information
- **Supabase URL**: https://ksaaaumhhlinspgvmupe.supabase.co
- **Table Name**: `orders`
- **Schema**: `public`

## Table Structure

### Columns

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier for each order |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Timestamp when the record was created |
| `etsy_order_id` | TEXT | NOT NULL | Etsy order identifier (required) |
| `product_name` | TEXT | NOT NULL | Name of the product (required) |
| `buyer_name` | TEXT | NULLABLE | Customer's name |
| `buyer_email` | TEXT | NULLABLE | Customer's email address |
| `shipping_address` | TEXT | NULLABLE | Shipping destination address |
| `customization_notes` | TEXT | NULLABLE | Special instructions or personalization |
| `supplier_status` | TEXT | CHECK CONSTRAINT | Current status from supplier (see below) |
| `qc_photo_url` | TEXT | NULLABLE | URL to quality control photo |
| `tracking_number` | TEXT | NULLABLE | Shipping tracking number |
| `sold_price` | NUMERIC | NOT NULL | Price the item was sold for (required) |
| `shipping_charged` | NUMERIC | DEFAULT 0.00 | Shipping cost charged to customer |
| `etsy_fees` | NUMERIC | NULLABLE | Etsy marketplace fees |
| `supplier_cost` | NUMERIC | NULLABLE | Cost from supplier |
| `net_profit` | NUMERIC | NULLABLE | Calculated profit (sold_price - fees - costs) |

## Supplier Status Check Constraint

### Constraint Details

**Constraint Name**: `orders_supplier_status_check`

**SQL Definition** (inferred):
```sql
ALTER TABLE orders
ADD CONSTRAINT orders_supplier_status_check
CHECK (
  supplier_status IS NULL
  OR
  supplier_status IN ('Pending', 'Processing', 'Shipped', 'Delivered')
);
```

### Valid Values

The `supplier_status` column accepts **only** the following values:

| Value | Description |
|-------|-------------|
| `NULL` | No status set (allowed) |
| `'Pending'` | Order received, awaiting processing |
| `'Processing'` | Order is being prepared/manufactured |
| `'Shipped'` | Order has been shipped to customer |
| `'Delivered'` | Order has been delivered to customer |

### Important Notes

1. **Case Sensitivity**: Values are **CASE-SENSITIVE**. Must use exact capitalization:
   - ✅ `'Pending'` - Valid
   - ❌ `'pending'` - Invalid
   - ❌ `'PENDING'` - Invalid

2. **Invalid Examples**: The following values will be **rejected**:
   - `'Ordered'`
   - `'ordered'`
   - `'shipped'` (lowercase)
   - `'Awaiting Shipment'`
   - `'Out for Delivery'`
   - `'Completed'`
   - `'Cancelled'`
   - Empty string `''`
   - Any other custom value

3. **Database Behavior**: Attempting to insert or update with an invalid value will result in:
   ```
   Error: new row for relation "orders" violates check constraint "orders_supplier_status_check"
   ```

## Required Fields for Insert

When inserting a new order, the following fields are **required**:

1. `etsy_order_id` - Cannot be NULL
2. `product_name` - Cannot be NULL
3. `sold_price` - Cannot be NULL

Example valid insert:
```javascript
const { data, error } = await supabase
  .from('orders')
  .insert({
    etsy_order_id: 'ORDER-123456',
    product_name: 'Custom Engraved Mug',
    sold_price: 29.99,
    supplier_status: 'Pending'  // Optional, but if provided must be valid
  });
```

## Testing Methodology

This schema information was determined through:
1. Direct database queries using the Supabase JavaScript client
2. Systematic testing of various status values to identify valid/invalid entries
3. Analysis of PostgreSQL error messages to understand constraint behavior
4. Examination of failing row details in error messages

---

**Report Generated**: 2026-02-04
**Method**: Programmatic testing via Supabase API
