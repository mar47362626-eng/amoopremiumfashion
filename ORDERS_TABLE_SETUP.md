# Orders Table Setup - Supabase Configuration

## Issue
Orders were not being saved to Supabase because the `orders`, `order_items`, `payments`, and `users` tables did not exist in your Supabase database.

## Solution
I've created a SQL schema file that defines all necessary tables with proper relationships and RLS policies.

## How to Apply

### Step 1: Go to Supabase Dashboard
1. Visit https://supabase.com and log in
2. Select your AMOO STORE project
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Execute the SQL
1. Click **New Query**
2. Open the file `CREATE_ORDERS_TABLE.sql` in your text editor
3. Copy the entire SQL content
4. Paste it into the Supabase SQL Editor
5. Click **Run** (▶️ button)

### Expected Output
You should see success messages for each table creation:
- ✅ `orders` table created
- ✅ `order_items` table created
- ✅ `payments` table created
- ✅ `users` table created
- ✅ Indexes created
- ✅ RLS policies enabled

### Step 3: Verify in Supabase
After running the SQL:
1. Go to **Database > Tables** in the left sidebar
2. You should see these new tables:
   - `orders`
   - `order_items`
   - `payments`
   - `users`

## Table Relationships

```
orders (main)
  ├── order_items (products in each order)
  ├── payments (payment records)
  └── users (customer info reference)
```

## What Gets Stored

### Orders Table
- Order ID, customer email, name, phone, address
- Pricing (subtotal, delivery fee, total)
- Status (pending, paid, shipped, delivered)
- Payment method (bank_transfer)
- Timestamps

### Order Items Table
- Products in each order (quantity, price)
- Product name and image URL
- Linked to order via order_id

### Payments Table
- Payment amount and method
- Payment status (pending, completed)
- Linked to order via order_id

### Users Table
- Customer email, name, phone, address
- Auto-created when order is placed

## After Setup
Once tables are created:
1. **No code changes needed** — your backend automatically syncs orders
2. Orders will be saved to Supabase when customers checkout
3. Admin can view orders in Supabase dashboard

## Troubleshooting

### If you see "table already exists" error
→ That's fine — the `IF NOT EXISTS` clause prevents re-creation

### If orders still don't save
1. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env` on your backend
2. Verify in your server logs: look for "✅ Order fully synced to Supabase" message
3. Check Supabase dashboard for any policy errors

### If you can't see RLS policies
1. In Supabase, go to **Database > Tables**
2. Click each table
3. Go to **Auth > Policies** tab
4. Verify "Allow public read/write" policies are present

## File Location
- **SQL Schema**: `CREATE_ORDERS_TABLE.sql`
- **Backend Handler**: `server.js` (function `syncOrderToSupabase` at line 205)
- **Frontend Checkout**: `script.js` (lines 1108-1270)

---
Next steps:
1. ✅ Run the SQL in Supabase
2. ✅ Verify tables created
3. ✅ Test checkout flow — orders should now appear in Supabase
