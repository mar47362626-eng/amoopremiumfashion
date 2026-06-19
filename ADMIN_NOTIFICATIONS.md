# Admin Email Notifications Setup

## Overview
Admins who register in the admin panel will automatically receive email notifications for:
- New orders placed
- New customer messages
- Important system events

## How It Works

### 1. Admin Registration
When an admin registers with their email:
```
Email → Stored in admin.user.json
↓
Automatically sent welcome email
↓
Added to admin notification list
```

### 2. Order Notifications
When a customer places an order:
```
New Order Created
↓
System fetches all admin emails
↓
Email sent to every admin with:
  - Order ID
  - Customer name
  - Order total
  - Items ordered
```

### 3. Message Notifications
When a customer sends a message:
```
New Message Received
↓
System fetches all admin emails
↓
Email sent to every admin with:
  - Customer name
  - Message content
  - Action link to reply
```

## Implementation

### Backend Functions Added:
1. `getAdminEmails()` - Gets all registered admin emails
2. `sendAdminOrderNotification()` - Sends order alerts to admins
3. `sendAdminMessageNotification()` - Sends message alerts to admins

### Frontend Admin Panel
- Admins see dashboard with:
  - New orders count
  - Pending messages
  - System alerts
- Can manage notifications in settings

## Example Flows

### Order Notification Email:
```
To: admin@store.com, admin2@store.com
Subject: New Order #12345 from John Doe

Body:
New Order Received! 📦

Customer: John Doe
Email: john@example.com
Order ID: #12345
Total: ₦15,000

Items:
- Blue Shirt x1
- Black Pants x2

Status: Pending

Action: Review Order → [Link to admin panel]
```

### Message Notification Email:
```
To: all-registered-admins@
Subject: New Message from Sarah | AMOO STORE

Body:
New Customer Message 💬

From: Sarah Wilson
Message: "Hi, do you have this in size XL?"

Action: Reply → [Link to admin panel]
```

## How Admins Register
1. Visit: `/admin`
2. Click "Register as Admin"
3. Enter: Name, Email, Password
4. Confirm registration email is received
5. Login with credentials
6. Start receiving notifications for orders & messages

## Email List Update
The admin email list updates automatically when:
- New admin registers ✅
- Admin logs in (verified)
- Admin account is created

All admins with registered emails receive notifications.
