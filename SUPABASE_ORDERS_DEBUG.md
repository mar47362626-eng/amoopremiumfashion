# Debugging Orders Not Syncing to Supabase

## Quick Diagnosis

### Step 1: Test Supabase Connection
Open this URL in your browser:
```
https://amoo-store-user-i18d.onrender.com/api/test-supabase
```

You should see one of these responses:

**✅ Success (All tables exist):**
```json
{
  "success": true,
  "status": "✅ Supabase connected",
  "tables": {
    "orders": "✅ Exists (5 rows)",
    "order_items": "✅ Exists (12 rows)",
    "payments": "✅ Exists (5 rows)",
    "users": "✅ Exists (3 rows)"
  },
  "message": "All tables are accessible"
}
```

**❌ Error (Tables don't exist):**
```json
{
  "success": false,
  "status": "❌ Supabase connection failed",
  "error": "relation \"public.orders\" does not exist",
  "fix": "Run CREATE_ORDERS_TABLE.sql in Supabase SQL Editor"
}
```

---

## Step 2: Create Missing Tables (If Needed)

If you see the error above:

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open [CREATE_ORDERS_TABLE.sql](CREATE_ORDERS_TABLE.sql) from your repository
5. Copy all the SQL content
6. Paste into Supabase SQL Editor
7. Click **Run** button (▶️)

Wait for success messages for each table.

---

## Step 3: Place a Test Order & Check Logs

### On Your Frontend:
1. Go to your website
2. Add a product to cart
3. Go to checkout
4. Fill in all fields and confirm order

### Check Backend Logs:

On Render dashboard (your backend):
1. Go to **Logs** section
2. Look for messages starting with:
   - `📤 Starting Supabase sync for order:` ← Order sync started
   - `👤 Upserting user:` ← Customer created
   - `📦 Upserting order with data:` ← Order data
   - `✅ Order synced to Supabase:` ← SUCCESS ✓
   - `❌ Error syncing order to Supabase - Details:` ← ERROR (shows what went wrong)

### Browser Developer Console:
1. Open your website → F12 (DevTools)
2. Go to **Console** tab
3. Check for Supabase initialization messages
4. Look for order confirmation messages

---

## Common Issues & Fixes

### Issue 1: "relation \"public.orders\" does not exist"
**Cause:** Tables haven't been created yet

**Fix:**
1. Run CREATE_ORDERS_TABLE.sql (see Step 2 above)
2. Verify tables appeared in Supabase → Database → Tables

### Issue 2: "RLS policy violation"
**Cause:** RLS policies are blocking inserts

**Fix:**
- The SQL script includes RLS policies that allow public access
- If still blocked, go to Supabase → [table] → Auth → Policies
- Verify "Allow inserts" policy exists and is enabled

### Issue 3: "foreign key violation"
**Cause:** Trying to insert order before user is created

**Fix:**
- The backend now creates users first (see logs for `👤 Upserting user:`)
- Should auto-resolve on next order

### Issue 4: "SUPABASE_URL not configured"
**Cause:** Environment variables not set on backend

**Fix:**
1. Go to Render → Your Project → Settings
2. Check "Environment Variables" has:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
3. Restart the service

---

## After Tables Are Created

Orders will automatically:
1. Save to local `orders.json` (fallback)
2. Sync to Supabase `orders` table
3. Create `order_items` entries (products)
4. Create `payments` record
5. Admin sidebar will fetch from Supabase

---

## Verify It's Working

### In Supabase Dashboard:
1. Go to **Table Editor**
2. Select **orders** table
3. Should see new orders appearing as customers checkout

### In Admin Panel:
1. Login to admin dashboard
2. Go to **Orders** section
3. Should see orders listed from Supabase

### Test Again:
1. Place another test order
2. Refresh admin Orders page
3. New order should appear

---

## Still Having Issues?

1. **Run the test endpoint again:** `/api/test-supabase`
2. **Check backend logs** for exact error message
3. **Verify SQL was executed** in Supabase (check Table Editor)
4. **Ensure RLS policies exist** on each table (Auth → Policies)
5. **Check environment variables** are set correctly on Render

---

## Files Modified
- [server.js](server.js#L91) - Added test endpoint and improved logging
- [CREATE_ORDERS_TABLE.sql](CREATE_ORDERS_TABLE.sql) - Table schema (must be run in Supabase)
- [ORDERS_TABLE_SETUP.md](ORDERS_TABLE_SETUP.md) - Setup instructions

## Next: After Confirming Orders Sync

Once orders are appearing in Supabase:
1. ✅ Admin can view orders in sidebar
2. ✅ Can update order status (accept, shipped, delivered)
3. ✅ Riders can accept orders for delivery
4. ✅ Payment tracking is enabled
