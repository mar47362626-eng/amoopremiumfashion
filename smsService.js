const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Initialize Twilio if credentials are available
if (accountSid && authToken && twilioPhoneNumber) {
  twilioClient = twilio(accountSid, authToken);
  console.log('✅ Twilio SMS service initialized');
} else {
  console.log('⚠️  Twilio credentials not configured. SMS notifications will be logged only.');
}

/**
 * Send registration confirmation SMS
 * @param {string} phoneNumber - Customer's phone number (include country code, e.g., +234...)
 * @param {string} customerName - Customer's name
 * @returns {Promise<boolean>} - Success status
 */
async function sendRegistrationSMS(phoneNumber, customerName) {
  if (!phoneNumber) {
    console.error('❌ No phone number provided for SMS');
    return false;
  }

  try {
    const message = `Welcome to AMOO STORE, ${customerName}! 👔\n\nYour account has been successfully created. You can now shop our premium fashion collection.\n\nNeed help? Contact us on WhatsApp: +2349138154963\n\nThank you!`;

    if (twilioClient) {
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber
      });
      console.log(`✅ Registration SMS sent to ${phoneNumber}. SID: ${result.sid}`);
      return true;
    } else {
      console.log(`📱 [SMS LOG] Registration SMS to ${phoneNumber}: ${message}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to send registration SMS to ${phoneNumber}:`, error.message);
    return false;
  }
}

/**
 * Send order confirmation SMS
 * @param {string} phoneNumber - Customer's phone number (include country code, e.g., +234...)
 * @param {string} customerName - Customer's name
 * @param {string} orderId - Order ID
 * @param {number} total - Order total amount
 * @returns {Promise<boolean>} - Success status
 */
async function sendOrderConfirmationSMS(phoneNumber, customerName, orderId, total) {
  if (!phoneNumber) {
    console.error('❌ No phone number provided for SMS');
    return false;
  }

  try {
    const message = `Hi ${customerName}!\n\nYour order #${orderId} has been received! 🛍️\n\nAmount: ₦${total.toLocaleString()}\nStatus: PENDING\n\nAdmin will review and confirm shortly. We'll send you updates via SMS.\n\nQuestions? Chat us: +2349138154963`;

    if (twilioClient) {
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber
      });
      console.log(`✅ Order confirmation SMS sent to ${phoneNumber}. SID: ${result.sid}`);
      return true;
    } else {
      console.log(`📱 [SMS LOG] Order SMS to ${phoneNumber}: ${message}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to send order SMS to ${phoneNumber}:`, error.message);
    return false;
  }
}

/**
 * Send order status update SMS
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} customerName - Customer's name
 * @param {string} orderId - Order ID
 * @param {string} status - New order status
 * @returns {Promise<boolean>} - Success status
 */
async function sendOrderStatusSMS(phoneNumber, customerName, orderId, status) {
  if (!phoneNumber) {
    console.error('❌ No phone number provided for SMS');
    return false;
  }

  try {
    const statusMessages = {
      confirmed: `Your order #${orderId} has been CONFIRMED! ✅ We're preparing it for shipment.`,
      shipped: `Great news! Your order #${orderId} has been SHIPPED! 📦 You'll receive it soon.`,
      delivered: `Your order #${orderId} has been DELIVERED! 🎉 Thank you for shopping with AMOO STORE!`,
      cancelled: `Your order #${orderId} has been CANCELLED. Contact us for details.`
    };

    const message = `Hi ${customerName}!\n\n${statusMessages[status] || `Your order #${orderId} status has been updated to: ${status}`}\n\nContact: +2349138154963`;

    if (twilioClient) {
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber
      });
      console.log(`✅ Order status SMS sent to ${phoneNumber}. SID: ${result.sid}`);
      return true;
    } else {
      console.log(`📱 [SMS LOG] Status update SMS to ${phoneNumber}: ${message}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to send status SMS to ${phoneNumber}:`, error.message);
    return false;
  }
}

module.exports = {
  sendRegistrationSMS,
  sendOrderConfirmationSMS,
  sendOrderStatusSMS
};
