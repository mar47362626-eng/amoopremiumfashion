const axios = require('axios');

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = process.env.EMAIL_USER || 'amoostore5@gmail.com';
const SENDER_NAME = 'Amoo Store';

// Test Brevo connection (non-blocking)
setTimeout(() => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY not configured. Please set it in your Render environment variables.');
  } else {
    console.log('✅ Email service ready - using Brevo API with:', SENDER_EMAIL);
  }
}, 5000);

// Helper function to send emails via Brevo
async function sendEmailViaBrevo(to, subject, html, text, replyTo = null) {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured');
    }

    const payload = {
      sender: {
        name: SENDER_NAME,
        email: SENDER_EMAIL
      },
      to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
      subject: subject,
      htmlContent: html,
      textContent: text
    };

    if (replyTo) {
      payload.replyTo = { email: replyTo, name: 'Customer' };
    }

    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Brevo API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Email template for user registration
function getUserRegistrationEmailTemplate(userName, userEmail) {
  return {
    subject: '🎉 Welcome to Amoo Store!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Welcome to Amoo Store, ${userName}! 👔</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for registering with us! We're excited to have you as part of our Amoo Store family.
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your account has been successfully created with the email address: <strong>${userEmail}</strong>
          </p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Browse our collection of premium clothing for men, women, couples, and kids</li>
              <li>Enjoy exclusive deals and new arrivals</li>
              <li>Receive updates on your orders directly to this email</li>
              <li>Get notified about special promotions and new collections</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If you have any questions or need assistance, feel free to contact us.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated message. Please do not reply to this email. If you did not create this account, please contact us immediately.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to Amoo Store, ${userName}!\n\nThank you for registering with us! Your account has been successfully created with the email address: ${userEmail}\n\nYou will receive updates about your orders and new collections at this email address.\n\nBest regards,\nAmoo Store Team`
  };
}

// Email template for order confirmation
function getOrderConfirmationEmailTemplate(customerName, customerEmail, orderId, items, total, deliveryFee, subtotal, deliveryDate) {
  const itemsHTML = items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; color: #666;">
        ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin-right: 10px; display: inline-block; vertical-align: middle;">` : ''}
        <span style="vertical-align: middle;">${item.productName}</span>
      </td>
      <td style="padding: 10px; text-align: center; color: #666;">x${item.quantity}</td>
      <td style="padding: 10px; text-align: right; color: #666;">₦${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  // Format delivery date
  const formattedDeliveryDate = deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'To be confirmed';

  return {
    subject: `📦 Order Confirmed! Order ID: ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">✅ Your Order is Confirmed!</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for your order, ${customerName}!
          </p>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #333;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">Pending</span></p>
            <p style="margin: 5px 0; color: #27ae60;"><strong>📦 Estimated Delivery Date:</strong> ${formattedDeliveryDate}</p>
          </div>
          
          <h3 style="color: #333; margin-top: 20px; margin-bottom: 10px;">Order Items:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="padding: 10px; text-align: left; color: #333;">Product</th>
                <th style="padding: 10px; text-align: center; color: #333;">Quantity</th>
                <th style="padding: 10px; text-align: right; color: #333;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 5px 0; color: #666; text-align: right;">
              <strong>Subtotal:</strong> ₦${subtotal.toLocaleString()}
            </p>
            <p style="margin: 5px 0; color: #666; text-align: right;">
              <strong>Delivery Fee:</strong> ₦${deliveryFee.toLocaleString()}
            </p>
            <p style="margin: 10px 0 0 0; color: #333; text-align: right; font-size: 18px; border-top: 2px solid #333; padding-top: 10px;">
              <strong>Total:</strong> ₦${total.toLocaleString()}
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            We will update you about your order status via email. Check your inbox frequently for delivery updates.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            For any questions about your order, please contact us. This is an automated message.
          </p>
        </div>
      </div>
    `,
    text: `Thank you for your order!\n\nOrder ID: ${orderId}\nOrder Date: ${new Date().toLocaleDateString()}\n\nItems:\n${items.map(item => `${item.productName} x${item.quantity} - ₦${(item.price * item.quantity).toLocaleString()}`).join('\n')}\n\nSubtotal: ₦${subtotal.toLocaleString()}\nDelivery Fee: ₦${deliveryFee.toLocaleString()}\nTotal: ₦${total.toLocaleString()}\n\nBest regards,\nAmoo Store Team`
  };
}

// Email template for order status update
function getOrderStatusUpdateEmailTemplate(customerName, orderId, status, items) {
  const statusMessages = {
    pending: { message: 'Your order is being processed', icon: '⏳', color: '#f39c12' },
    confirmed: { message: 'Your order has been confirmed', icon: '✅', color: '#27ae60' },
    processing: { message: 'Your order is being packaged', icon: '📦', color: '#3498db' },
    shipped: { message: 'Your order has been shipped', icon: '🚚', color: '#9b59b6' },
    delivered: { message: 'Your order has been delivered', icon: '🎉', color: '#27ae60' },
    cancelled: { message: 'Your order has been cancelled', icon: '❌', color: '#e74c3c' }
  };

  const statusInfo = statusMessages[status] || { message: 'Your order status has been updated', icon: '📬', color: '#34495e' };

  // Add product images to the status update email
  const itemsDisplay = items && items.length > 0 ? `
    <div style="margin-top: 20px;">
      <h4 style="color: #333; margin-bottom: 15px;">Order Items:</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 15px;">
        ${items.map(item => `
          <div style="flex: 1; min-width: 150px; text-align: center;">
            ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 100%; max-width: 150px; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
            <p style="color: #333; font-size: 14px; margin: 10px 0 0 0; font-weight: bold;">${item.productName}</p>
            <p style="color: #666; font-size: 12px; margin: 5px 0;">Qty: ${item.quantity}</p>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return {
    subject: `${statusInfo.icon} Order Update: ${orderId} - ${status.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">${statusInfo.icon} Order Status Update</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Hi ${customerName},
          </p>
          
          <div style="background-color: ${statusInfo.color}; padding: 20px; border-radius: 5px; margin: 20px 0; color: white;">
            <h3 style="margin: 0; font-size: 18px;">${statusInfo.message}</h3>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #333;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 10px 0 0 0; color: #333;"><strong>Current Status:</strong> <span style="font-weight: bold; color: ${statusInfo.color};">${status.toUpperCase()}</span></p>
          </div>
          
          ${itemsDisplay}
          
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            We're keeping you updated every step of the way. If you need to check your order details, you can view them in your account on our website.
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Thank you for shopping with Amoo Store!
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            If you have any questions, please don't hesitate to reach out to us.
          </p>
        </div>
      </div>
    `,
    text: `Order Status Update\n\nHi ${customerName},\n\n${statusInfo.message}\n\nOrder ID: ${orderId}\nStatus: ${status.toUpperCase()}\n\nThank you for shopping with Amoo Store!`
  };
}

// Email template for admin registration
function getAdminRegistrationEmailTemplate(adminName, adminEmail) {
  return {
    subject: '👨‍💼 Admin Account Created - Amoo Store',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">👨‍💼 Admin Account Successfully Created</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Welcome to the Amoo Store Admin Team, ${adminName}!
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your admin account has been successfully registered with our company system.
          </p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Account Details:</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Name:</strong> ${adminName}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Email:</strong> ${adminEmail}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Role:</strong> Administrator</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <h3 style="color: #333; margin-top: 0;">Admin Responsibilities:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Manage product catalog and inventory</li>
              <li>Process and track customer orders</li>
              <li>Update order statuses and delivery information</li>
              <li>Monitor customer support and inquiries</li>
              <li>Generate sales reports and analytics</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            You can now access the admin dashboard to manage the store operations. Use your registered email and password to log in.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            If you did not request an admin account or have any questions, please contact the system administrator immediately.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to Amoo Store Admin Team!\n\nYour admin account has been successfully created.\n\nName: ${adminName}\nEmail: ${adminEmail}\nRole: Administrator\n\nYou can now access the admin dashboard to manage store operations.\n\nBest regards,\nAmoo Store Management`
  };
}

// Get rider registration email template
function getRiderRegistrationEmailTemplate(riderName, riderEmail, vehicleType, licensePlate) {
  return {
    subject: '🏍️ Welcome to Amoo Store - Rider Account Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #FF6B35; margin-bottom: 20px;">🏍️ Welcome to Amoo Store Delivery Team!</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Hi ${riderName},
          </p>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Congratulations! Your rider account has been successfully registered with Amoo Store. You are now ready to start accepting and delivering orders.
          </p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Name:</strong> ${riderName}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Email:</strong> ${riderEmail}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Vehicle Type:</strong> ${vehicleType}</p>
            <p style="color: #666; margin: 5px 0;"><strong>License Plate:</strong> ${licensePlate}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF6B35;">
            <h3 style="color: #333; margin-top: 0;">🚀 Getting Started:</h3>
            <ol style="color: #666; line-height: 1.8;">
              <li>Log in to your rider dashboard with your email and password</li>
              <li>Update your profile and verification documents</li>
              <li>Go online to start receiving delivery orders</li>
              <li>Accept orders and complete deliveries on time</li>
              <li>Build your rating and earnings</li>
            </ol>
          </div>
          
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #333; margin-top: 0;">✅ Why Join Amoo Store Riders:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Flexible working hours - work when you want</li>
              <li>Competitive earnings per delivery</li>
              <li>Real-time order notifications</li>
              <li>Professional support team</li>
              <li>Growth opportunities based on performance</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            You can now log in to your dashboard and start accepting orders. For any questions or support, contact our rider support team.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            If you did not create this account or have any concerns, please contact us immediately.
          </p>
        </div>
      </div>
    `,
    text: `Welcome to Amoo Store Delivery Team!\n\nYour rider account has been successfully created.\n\nName: ${riderName}\nEmail: ${riderEmail}\nVehicle: ${vehicleType}\nLicense Plate: ${licensePlate}\n\nYou can now log in to your rider dashboard to start accepting orders.\n\nBest regards,\nAmoo Store Management`
  };
}

// Send user registration email
async function sendUserRegistrationEmail(userName, userEmail) {
  try {
    const emailTemplate = getUserRegistrationEmailTemplate(userName, userEmail);
    const result = await sendEmailViaBrevo(
      userEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    console.log('✅ Registration email sent to:', userEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send registration email:', error.message);
    throw error;
  }
}

// Send order confirmation email
async function sendOrderConfirmationEmail(customerName, customerEmail, orderId, items, total, deliveryFee, subtotal, deliveryDate) {
  try {
    const emailTemplate = getOrderConfirmationEmailTemplate(customerName, customerEmail, orderId, items, total, deliveryFee, subtotal, deliveryDate);
    const result = await sendEmailViaBrevo(
      customerEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    console.log('✅ Order confirmation email sent to:', customerEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send order confirmation email:', error.message);
    throw error;
  }
}

// Send order status update email
async function sendOrderStatusUpdateEmail(customerName, customerEmail, orderId, status, items) {
  try {
    const emailTemplate = getOrderStatusUpdateEmailTemplate(customerName, orderId, status, items);
    const result = await sendEmailViaBrevo(
      customerEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    console.log('✅ Order status update email sent to:', customerEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send order status email:', error.message);
    throw error;
  }
}

// Send admin registration email
async function sendAdminRegistrationEmail(adminName, adminEmail) {
  try {
    const emailTemplate = getAdminRegistrationEmailTemplate(adminName, adminEmail);
    const result = await sendEmailViaBrevo(
      adminEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    console.log('✅ Admin registration email sent to:', adminEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send admin registration email:', error.message);
    throw error;
  }
}

// Send rider registration email
async function sendRiderRegistrationEmail(riderName, riderEmail, vehicleType, licensePlate) {
  try {
    const emailTemplate = getRiderRegistrationEmailTemplate(riderName, riderEmail, vehicleType, licensePlate);
    const result = await sendEmailViaBrevo(
      riderEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    console.log('✅ Rider registration email sent to:', riderEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send rider registration email:', error.message);
    throw error;
  }
}

// Email template for customer message/inquiry
function getCustomerMessageEmailTemplate(senderName, senderEmail, subject, message) {
  return {
    subject: `📧 New Message from Customer: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">📧 New Customer Message</h2>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #333;"><strong>From:</strong> ${senderName}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${senderEmail}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #e0b347; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 10px;">Message:</h3>
            <p style="color: #666; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            Please respond to this customer as soon as possible. Reply to: ${senderEmail}
          </p>
        </div>
      </div>
    `,
    text: `New Customer Message\n\nFrom: ${senderName}\nEmail: ${senderEmail}\nSubject: ${subject}\n\nMessage:\n${message}\n\nPlease respond to this customer as soon as possible.`
  };
}

// Send customer message to admin
async function sendCustomerMessageEmail(senderName, senderEmail, subject, message, recipientEmail) {
  try {
    const emailTemplate = getCustomerMessageEmailTemplate(senderName, senderEmail, subject, message);
    const result = await sendEmailViaBrevo(
      recipientEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      senderEmail
    );
    console.log('✅ Customer message email sent to:', recipientEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send customer message email:', error.message);
    throw error;
  }
}

// Send admin order notification
async function sendAdminOrderNotification(recipientEmail, orderId, customerName, customerEmail, items, total, subtotal, deliveryFee, deliveryDate) {
  try {
    const itemsList = items.map(item => `<li>${item.productName} x${item.quantity} - ₦${(item.price * item.quantity).toLocaleString()}</li>`).join('');
    
    // Format delivery date
    const formattedDeliveryDate = deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'To be confirmed';
    
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2c3e50;">📦 New Order Received!</h2>
        <p>A new order has been placed on AMOO STORE.</p>
        
        <hr style="border: 1px solid #ddd;">
        
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> #${orderId}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>📦 Estimated Delivery Date:</strong> ${formattedDeliveryDate}</p>
        
        <h3>Items Ordered</h3>
        <ul>${itemsList}</ul>
        
        <h3>Order Summary</h3>
        <p><strong>Subtotal:</strong> ₦${subtotal.toLocaleString()}</p>
        <p><strong>Delivery Fee:</strong> ₦${deliveryFee.toLocaleString()}</p>
        <p><strong>Total:</strong> <span style="color: #e74c3c; font-size: 18px;">₦${total.toLocaleString()}</span></p>
        
        <hr style="border: 1px solid #ddd;">
        
        <p><a href="https://amoopremiumstore.netlify.app/admin" style="background: #e74c3c; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View in Admin Panel</a></p>
        
        <p style="color: #7f8c8d; font-size: 12px;">AMOO STORE | Premium Fashion Management</p>
      </div>
    `;
    
    const text = `New Order #${orderId} from ${customerName} (${customerEmail})\n\nTotal: ₦${total.toLocaleString()}\n\nLog in to admin panel to view details.`;
    
    const result = await sendEmailViaBrevo(
      recipientEmail,
      `🔔 New Order #${orderId} from ${customerName}`,
      html,
      text
    );
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to send admin order notification to ${recipientEmail}:`, error.message);
    throw error;
  }
}

// Send admin message notification
async function sendAdminMessageNotification(recipientEmail, senderName, messageContent) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2c3e50;">💬 New Customer Message</h2>
        <p>A customer has sent a message through AMOO STORE.</p>
        
        <hr style="border: 1px solid #ddd;">
        
        <h3>Message Details</h3>
        <p><strong>From:</strong> ${senderName}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
          <p>${messageContent}</p>
        </div>
        
        <hr style="border: 1px solid #ddd;">
        
        <p><a href="https://amoopremiumstore.netlify.app/admin" style="background: #3498db; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reply in Admin Panel</a></p>
        
        <p style="color: #7f8c8d; font-size: 12px;">AMOO STORE | Premium Fashion Management</p>
      </div>
    `;
    
    const text = `New Message from ${senderName}\n\n${messageContent}\n\nLog in to admin panel to reply.`;
    
    const result = await sendEmailViaBrevo(
      recipientEmail,
      `🔔 New Message from ${senderName}`,
      html,
      text
    );
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to send admin message notification to ${recipientEmail}:`, error.message);
    throw error;
  }
}

// Email template for rider order notification
function getRiderOrderNotificationTemplate(riderName, order) {
  const itemsHTML = (order.items || []).map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; color: #666;">
        ${item.productImage ? `<img src="${item.productImage}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 10px; display: inline-block;">` : ''}
        <span>${item.productName}</span>
      </td>
      <td style="padding: 10px; text-align: center; color: #666;">x${item.quantity}</td>
      <td style="padding: 10px; text-align: right; color: #666;">₦${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  return {
    subject: `🚚 New Order Available for Delivery - Order #${order.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #27ae60; margin-bottom: 20px;">🎉 New Order Available for You, ${riderName}!</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            A new order is ready for delivery. Review the details below and accept the order in your dashboard.
          </p>
          
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #333;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Order Total:</strong> ₦${order.total.toLocaleString()}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Posted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <h3 style="color: #333; margin-top: 20px; margin-bottom: 10px;">📦 Order Items:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="padding: 10px; text-align: left; color: #333;">Product</th>
                <th style="padding: 10px; text-align: center; color: #333;">Qty</th>
                <th style="padding: 10px; text-align: right; color: #333;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <h3 style="color: #333; margin-top: 20px; margin-bottom: 10px;">👤 Customer Details:</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${order.customerName || 'N/A'}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${order.customerEmail || 'N/A'}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Delivery Address:</strong> ${order.deliveryAddress || 'N/A'}</p>
            <p style="margin: 5px 0; color: #666;"><strong>City/State:</strong> ${order.deliveryCity || ''} ${order.deliveryState || ''}</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #3498db;">
            <p style="margin: 5px 0; color: #333;"><strong>📍 Action Required:</strong></p>
            <p style="margin: 5px 0; color: #555;">Log in to your rider dashboard to accept or decline this order.</p>
          </div>

          <p><a href="https://amoopremiumstore.netlify.app/rider" style="background: #27ae60; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Open Rider Dashboard</a></p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated order notification from Amoo Store. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `New Order Available for Delivery\n\nOrder #${order.id}\nTotal: ₦${order.total.toLocaleString()}\n\nCustomer: ${order.customerName}\nDelivery Address: ${order.deliveryAddress}, ${order.deliveryCity} ${order.deliveryState}\n\nLog in to your rider dashboard to accept this order.`
  };
}

// Send order notification to rider
async function sendOrderNotificationToRider(riderName, riderEmail, order, riderPhone) {
  try {
    const emailTemplate = getRiderOrderNotificationTemplate(riderName, order);
    const result = await sendEmailViaBrevo(
      riderEmail,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    console.log('✅ Order notification sent to rider:', riderEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send order notification to rider:', error.message);
    throw error;
  }
}

module.exports = {
  sendEmailViaBrevo,
  sendUserRegistrationEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendAdminRegistrationEmail,
  sendRiderRegistrationEmail,
  sendCustomerMessageEmail,
  sendAdminOrderNotification,
  sendAdminMessageNotification,
  sendOrderNotificationToRider
};
