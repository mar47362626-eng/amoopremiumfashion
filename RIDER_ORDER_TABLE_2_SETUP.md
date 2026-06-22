# 🚚 Rider Order Table 2 - Setup Guide

## Overview
`rider_order_table_2` is the new delivery management system that replaces multiple rider_orders entries with a single shared order entry.

## Key Features
✅ **One entry per order** - Admin clicks "Ship", creates 1 entry (not multiple)
✅ **Unassigned initially** - rider_id = null, any rider can accept
✅ **Email notifications** - Sends to ALL riders + customer email
✅ **Clean assignments** - Rider claims order by accepting it

## Setup Steps

### 1. Run SQL Script in Supabase

1. Go to [supabase.com](https://supabase.com) dashboard
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy entire contents of `CREATE_RIDER_ORDER_TABLE_2.sql`
5. Paste and click **Run**

### 2. Verify Table Creation

1. Go to **Table Editor**
2. Look for `rider_order_table_2` in the list
3. Verify columns: id, order_id, customer_name, customer_email, delivery_address, rider_id, status, etc.

## How It Works

### Admin Ships Order
```
Admin clicks "Ship" on order
        ↓
POST /api/orders/:orderId/status with status='shipped'
        ↓
Creates 1 entry in rider_order_table_2 with:
  - rider_id = null (unassigned)
  - status = 'shipped'
  - All order/customer details
        ↓
Sends emails to:
  - All registered riders (order available notification)
  - Customer (order shipped notification)
```

### Rider Accepts Order
```
GET /api/rider-orders/available (fetch from rider_order_table_2)
        ↓
Rider clicks "Accept"
        ↓
POST /api/rider-orders/:riderOrderId/accept with riderId
        ↓
Updates in rider_order_table_2:
  - Sets rider_id = riderId
  - Changes status = 'accepted'
  - Records accepted_at timestamp
```

### Rider Delivers Order
```
Rider at delivery location
        ↓
Generates 6-digit code → sends to customer email
        ↓
Customer provides code → Rider verifies
        ↓
POST /api/rider-orders/:riderOrderId/verify-code
        ↓
Updates rider_order_table_2:
  - status = 'delivered'
  - delivery_code verified
  - recorded delivered_at
        ↓
Updates main orders table status = 'delivered'
        ↓
Sends delivery confirmation email to customer
```

## API Endpoints

| Method | Endpoint | Table Used | Purpose |
|--------|----------|------------|---------|
| GET | `/api/rider-orders/available` | rider_order_table_2 | Get unassigned (shipped) orders |
| POST | `/api/rider-orders/:id/accept` | rider_order_table_2 | Rider accepts order |
| GET | `/api/rider/:riderId/active-orders` | rider_order_table_2 | Get rider's accepted orders |
| GET | `/api/rider/:riderId/completed-orders` | rider_order_table_2 | Get rider's delivered orders |
| POST | `/api/rider-orders/:id/send-code` | rider_order_table_2 | Generate & send delivery code |
| POST | `/api/rider-orders/:id/verify-code` | rider_order_table_2 | Verify code & mark delivered |

## Email Notifications

### Order Shipped Email
**Recipients:** All registered riders + Customer
**Content:**
- Order ID and details
- Delivery address
- Customer name & phone
- Order items and amount
- Notification that order is available for pickup

### Delivery Code Email
**Recipients:** Customer
**Content:**
- 6-digit verification code
- Rider contact info
- Instructions to provide code upon delivery

### Delivery Confirmation Email
**Recipients:** Customer
**Content:**
- Confirmation of successful delivery
- Order details
- Rider info

## Database Schema

```sql
rider_order_table_2 {
  id                      UUID (Primary Key)
  order_id               VARCHAR (UNIQUE) -- Links to orders table
  customer_name          VARCHAR
  customer_phone         VARCHAR
  customer_email         VARCHAR
  delivery_address       TEXT
  delivery_city          VARCHAR
  delivery_state         VARCHAR
  order_total            DECIMAL
  order_items            JSONB (array of items)
  rider_id               UUID (FK to riders.id) -- NULL until accepted
  status                 VARCHAR -- 'shipped', 'accepted', 'delivered'
  assigned_at            TIMESTAMP (when order was created)
  accepted_at            TIMESTAMP (when rider accepted)
  delivered_at           TIMESTAMP (when delivered)
  delivery_code          VARCHAR (6-digit code)
  delivery_code_verified BOOLEAN
  created_at             TIMESTAMP
  updated_at             TIMESTAMP
}
```

## Troubleshooting

### "Order not found" (404)
- Check rider_order_table_2 has the order in 'shipped' status
- Verify order_id format matches

### "Order already accepted" (400)
- Order has been claimed by another rider (rider_id != null)
- Customer can't select it anymore

### Code verification fails
- Make sure code_sent_at is recent
- Codes are 6 random digits
- Check for typos in entered code

### Emails not sending
- Verify sendOrderStatusUpdateEmail is working
- Check sendOrderNotificationToRider function
- Review Render logs for email service errors

## Migration from rider_orders

If you had previous data in `rider_orders` table:
1. Keep old table for backup
2. New shipping operations use `rider_order_table_2`
3. Old rider_orders data won't be queried
4. Can delete old table after verification

## Support
Check Render logs: `Dashboard → Service → Logs`
Look for entries starting with: 🚚, 📧, ✅, ⚠️, ❌
