# SMS Integration Setup Guide

This guide will help you enable SMS notifications for customer registrations and order confirmations.

## Quick Start

### 1. Install Twilio Dependency
Run this command in your terminal:
```bash
npm install twilio
```

### 2. Get Twilio Credentials
1. Visit [twilio.com](https://www.twilio.com/)
2. Sign up for a free account (you get $5 free credits)
3. Go to your [Twilio Console](https://console.twilio.com/)
4. Find your **Account SID** and **Auth Token**
5. Get a phone number by going to "Phone Numbers" > "Manage" > "Buy a number"

### 3. Configure Environment Variables
Create or update your `.env` file with your Twilio credentials:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

Replace with your actual credentials from the Twilio console.

### 4. Test SMS Sending
After restarting your server, SMS messages will automatically be sent when:
- A new user registers
- A customer places an order
- An admin updates an order status

If Twilio credentials are not configured, SMS messages will be logged to the console instead.

## SMS Message Templates

### Registration SMS
```
Welcome to AMOO STORE, [Customer Name]! 👔

Your account has been successfully created. You can now shop our premium fashion collection.

Need help? Contact us on WhatsApp: +2349138154963

Thank you!
```

### Order Confirmation SMS
```
Hi [Customer Name]!

Your order #[Order ID] has been received! 🛍️

Amount: ₦[Total Amount]
Status: PENDING

Admin will review and confirm shortly. We'll send you updates via SMS.

Questions? Chat us: +2349138154963
```

### Order Status Update SMS
Status-specific messages for: confirmed, shipped, delivered, cancelled

## Files Modified
- **server.js** - Added SMS sending to registration, order creation, and order status update endpoints
- **smsService.js** - New file with SMS service functions
- **package.json** - Added Twilio dependency

## Troubleshooting

**SMS not sending?**
- Check that TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in .env
- Verify the phone number format includes country code (e.g., +234XXXXXXXXXX for Nigeria)
- Check server logs for error messages

**Free tier limitations?**
- Twilio free tier sends SMS only to verified phone numbers
- Upgrade your Twilio account to send to any number
- You can add verified numbers in Twilio console under "Verified Caller IDs"

**Want to use a different SMS provider?**
- You can modify `smsService.js` to use any SMS provider (AWS SNS, Vonage, etc.)
- Keep the same function signatures so the rest of the code works unchanged
