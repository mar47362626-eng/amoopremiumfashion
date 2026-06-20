require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { sendEmailViaBrevo, sendUserRegistrationEmail, sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendAdminRegistrationEmail, sendRiderRegistrationEmail, sendCustomerMessageEmail, sendAdminOrderNotification, sendAdminMessageNotification } = require('./emailService');
const { sendRegistrationSMS, sendOrderConfirmationSMS, sendOrderStatusSMS } = require('./smsService');
const { sendRegistrationWhatsApp, sendOrderConfirmationWhatsApp, sendOrderStatusWhatsApp, sendBulkWhatsApp } = require('./whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Log Supabase connection status
console.log('✅ Supabase initialized:', supabaseUrl ? 'Connected' : 'Not configured');
console.log('🚀 API Version 2.1 - Rider notification endpoint included');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Set proper MIME types for static files
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Admin route BEFORE admin static middleware
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

app.use('/admin', express.static(path.join(__dirname, 'admin'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Rider route BEFORE rider static middleware
app.get(['/rider', '/rider/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'rider-web', 'rider.html'));
});

app.use('/rider', express.static(path.join(__dirname, 'rider-web'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // Return 204 No Content instead of 404
});

// File paths
const userFilePath = path.join(__dirname, 'user.json');
const productFilePath = path.join(__dirname, 'product.json');

// Helper function to read JSON files
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure we always return an array
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Helper function to write JSON files
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

// ===== SUPABASE SYNC FUNCTIONS =====

// Sync user to Supabase
async function syncUserToSupabase(user) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          email: user.email,
          name: user.name,
          phone: user.phone || null,
          address: user.address || null
        }
      ], { onConflict: 'email' });
    
    if (error) {
      console.error('❌ Error syncing user to Supabase:', error.message);
    } else {
      console.log('✅ User synced to Supabase:', user.email);
    }
  } catch (error) {
    console.error('❌ Supabase sync error:', error);
  }
}

// Sync admin user to Supabase
async function syncAdminToSupabase(admin) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .upsert([
        {
          email: admin.email,
          name: admin.name,
          password_hash: admin.password,
          role: 'admin'
        }
      ], { onConflict: 'email' });
    
    if (error) {
      console.error('❌ Error syncing admin to Supabase:', error.message);
    } else {
      console.log('✅ Admin synced to Supabase:', admin.email);
    }
  } catch (error) {
    console.error('❌ Supabase admin sync error:', error);
  }
}

// Sync product to Supabase
async function syncProductToSupabase(product) {
  try {
    const { data, error } = await supabase
      .from('products')
      .upsert([
        {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: product.category,
          image_url: product.image || '',
          tag: product.tag || 'Available',
          created_at: product.createdAt || new Date().toISOString()
        }
      ], { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error syncing product to Supabase:', error.message);
    } else {
      console.log('✅ Product synced to Supabase:', product.id);
    }
  } catch (error) {
    console.error('❌ Supabase product sync error:', error);
  }
}

// Sync order to Supabase
async function syncOrderToSupabase(order) {
  try {
    // First, ensure user exists (for foreign key relationship)
    if (order.customerEmail) {
      await supabase
        .from('users')
        .upsert([
          {
            email: order.customerEmail,
            name: order.customerName || 'Customer',
            phone: order.phone || null,
            address: order.address || null
          }
        ], { onConflict: 'email' });
    }

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert([
        {
          id: order.id,
          customer_email: order.customerEmail,
          customer_name: order.customerName,
          phone: order.phone || '',
          address: order.address || '',
          subtotal: order.subtotal || 0,
          delivery_fee: order.delivery || 0,
          total: order.total,
          status: order.status || 'pending',
          payment_method: order.paymentMethod || 'bank_transfer',
          created_at: order.createdAt
        }
      ], { onConflict: 'id' });
    
    if (orderError) {
      console.error('❌ Error syncing order to Supabase:', orderError.message);
      return;
    }
    
    // Insert order items
    if (order.items && order.items.length > 0) {
      const orderItems = order.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
        product_image_url: item.productImage || ''
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .upsert(orderItems);
      
      if (itemsError) {
        console.error('❌ Error syncing order items:', itemsError.message);
      } else {
        console.log('✅ Order items synced:', orderItems.length);
      }
    }
    
    // Insert payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .upsert([
        {
          order_id: order.id,
          amount: order.total,
          payment_method: order.paymentMethod || 'bank_transfer',
          payment_status: order.status === 'paid' ? 'completed' : 'pending',
          created_at: order.createdAt
        }
      ]);
    
    if (paymentError) {
      console.error('❌ Error syncing payment:', paymentError.message);
    } else {
      console.log('✅ Payment record synced for order:', order.id);
    }
    
    console.log('✅ Order fully synced to Supabase:', order.id);
  } catch (error) {
    console.error('❌ Supabase order sync error:', error);
  }
}

// GET all products (from Supabase)
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching products from Supabase:', error.message);
      // Fallback to local JSON if Supabase fails
      const products = readJSON(productFilePath);
      return res.json(products);
    }
    
    // Format response to match frontend expectations
    const formattedProducts = data.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: p.image_url,
      description: p.description,
      tag: p.tag || 'Available'
    }));
    
    console.log('✅ Fetched', formattedProducts.length, 'products from Supabase');
    res.json(formattedProducts);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    // Fallback to local JSON
    const products = readJSON(productFilePath);
    res.json(products);
  }
});

// GET single product (from Supabase)
app.get('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error || !data) {
      // Fallback to local JSON
      const products = readJSON(productFilePath);
      const product = products.find((p) => p.id === req.params.id);
      
      if (product) {
        return res.json(product);
      }
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Format response
    const formattedProduct = {
      id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      image: data.image_url,
      description: data.description,
      tag: data.tag || 'Available'
    };
    
    res.json(formattedProduct);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    // Fallback to local JSON
    const products = readJSON(productFilePath);
    const product = products.find((p) => p.id === req.params.id);
    
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  }
});

// POST create product (to Supabase)
app.post('/api/products', async (req, res) => {
  const { name, category, price, image, description, tag } = req.body;
  if (!name || !category || !price || !image || !description || !tag) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const productId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    const newProduct = {
      id: productId,
      name,
      category,
      price: Number(price),
      image_url: image,
      description,
      tag,
      created_at: new Date().toISOString()
    };

    // Insert to Supabase
    const { data, error } = await supabase
      .from('products')
      .upsert([newProduct])
      .select();
    
    if (error) {
      console.error('❌ Error creating product in Supabase:', error.message);
      return res.status(500).json({ error: 'Failed to save product to database' });
    }

    // Also save to local JSON for backup
    const products = readJSON(productFilePath);
    products.push({
      id: productId,
      name,
      category,
      price: Number(price),
      image,
      description,
      tag
    });
    writeJSON(productFilePath, products);
    
    console.log('✅ Product created in Supabase:', productId);
    res.status(201).json({ success: true, product: data[0] });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// PUT update product (in Supabase)
app.put('/api/products/:id', async (req, res) => {
  const { name, category, price, image, description, tag } = req.body;
  if (!name || !category || !price || !image || !description || !tag) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const updateData = {
      name,
      category,
      price: Number(price),
      image_url: image,
      description,
      tag
    };

    // Update in Supabase
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', req.params.id)
      .select();
    
    if (error) {
      console.error('❌ Error updating product in Supabase:', error.message);
      return res.status(500).json({ error: 'Failed to update product in database' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Also update local JSON for backup
    const products = readJSON(productFilePath);
    const productIndex = products.findIndex((p) => p.id === req.params.id);
    if (productIndex !== -1) {
      products[productIndex] = {
        ...products[productIndex],
        name,
        category,
        price: Number(price),
        image,
        description,
        tag
      };
      writeJSON(productFilePath, products);
    }
    
    console.log('✅ Product updated in Supabase:', req.params.id);
    res.json({ success: true, product: data[0] });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// POST sync all products to Supabase (from local JSON)
app.post('/api/sync-products', async (req, res) => {
  try {
    const products = readJSON(productFilePath);
    let synced = 0;
    let failed = 0;

    for (const product of products) {
      try {
        await syncProductToSupabase(product);
        synced++;
      } catch (error) {
        console.error('Failed to sync product:', product.id, error);
        failed++;
      }
    }

    res.json({ success: true, synced, failed, total: products.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

// DELETE product (from Supabase)
app.delete('/api/products/:id', async (req, res) => {
  try {
    // Delete from Supabase
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);
    
    if (error) {
      console.error('❌ Error deleting product from Supabase:', error.message);
      return res.status(500).json({ error: 'Failed to delete product from database' });
    }

    // Also delete from local JSON for backup
    const products = readJSON(productFilePath);
    const filteredProducts = products.filter((p) => p.id !== req.params.id);
    writeJSON(productFilePath, filteredProducts);
    
    console.log('✅ Product deleted from Supabase:', req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get all registered admin emails
function getAdminEmails() {
  try {
    const admins = readJSON(adminUserFilePath);
    return admins.map(admin => admin.email);
  } catch (error) {
    console.error('Error reading admin emails:', error.message);
    return [];
  }
}

// Notify all admins about new order
async function notifyAdminsOrderCreated(order) {
  const adminEmails = getAdminEmails();
  
  if (adminEmails.length === 0) {
    console.log('⚠️ No admin emails configured for notifications');
    return;
  }

  console.log(`📧 Sending order notifications to ${adminEmails.length} admin(s)...`);
  
  for (const adminEmail of adminEmails) {
    try {
      await sendAdminOrderNotification(
        adminEmail,
        order.id,
        order.customerName,
        order.customerEmail,
        order.items,
        order.total,
        order.subtotal || 0,
        order.delivery || 0
      );
    } catch (error) {
      console.error(`⚠️ Failed to notify admin ${adminEmail}:`, error.message);
    }
  }
  
  console.log(`✅ All admin notifications sent`);
}

// Notify all admins about new message
async function notifyAdminsNewMessage(senderName, messageContent) {
  const adminEmails = getAdminEmails();
  
  if (adminEmails.length === 0) {
    console.log('⚠️ No admin emails configured for message notifications');
    return;
  }

  console.log(`📧 Sending message notifications to ${adminEmails.length} admin(s)...`);
  
  for (const adminEmail of adminEmails) {
    try {
      await sendAdminMessageNotification(adminEmail, senderName, messageContent);
    } catch (error) {
      console.error(`⚠️ Failed to notify admin ${adminEmail}:`, error.message);
    }
  }
  
  console.log(`✅ All admin notifications sent`);
}

// POST user registration
app.post('/api/register', async (req, res) => {
  const { name, email, phone, address, country, zip, password } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !address || !zip || !password) {
    return res.status(400).json({ error: 'Please fill in all required fields' });
  }

  const users = readJSON(userFilePath);

  // Check if user already exists
  const userExists = users.some((u) => u.email === email);
  if (userExists) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    phone,
    address,
    country: country || null,
    zip,
    password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  // Save to file
  if (writeJSON(userFilePath, users)) {
    // Sync to Supabase
    syncUserToSupabase(newUser);
    
    // Send registration email
    sendUserRegistrationEmail(newUser.name, newUser.email)
      .catch(error => console.error('Email sending error (non-critical):', error.message));
    
    // Send registration SMS (DISABLED - Need Nigerian Twilio number)
    // sendRegistrationSMS(newUser.phone, newUser.name)
    //   .catch(error => console.error('SMS sending error (non-critical):', error.message));
    
    // Send registration WhatsApp (DISABLED - Need WhatsApp Business setup)
    // if (newUser.phone) {
    //   sendRegistrationWhatsApp(newUser.phone, newUser.name)
    //     .catch(error => console.error('WhatsApp sending error (non-critical):', error.message));
    // }
    
    res.status(201).json({ success: true, message: 'User registered successfully', userId: newUser.id });
  } else {
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// POST user login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = readJSON(userFilePath);
  const user = users.find((u) => u.email === email && u.password === password);

  if (user) {
    res.json({ success: true, message: 'Login successful', userId: user.id, name: user.name });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// GET all users (for admin/debugging - remove in production)
app.get('/api/users', async (req, res) => {
  try {
    // Fetch users from Supabase
    console.log('📦 Fetching users from Supabase...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Supabase fetch failed, using local data:', error.message);
      // Fallback to local JSON
      const users = readJSON(userFilePath);
      res.json(users);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Fetched ${data.length} users from Supabase`);
      res.json(data);
    } else {
      console.log('⚠️ No users in Supabase, using local data');
      const users = readJSON(userFilePath);
      res.json(users);
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    // Fallback to local JSON
    const users = readJSON(userFilePath);
    res.json(users);
  }
});

// Admin endpoints - use admin.user.json in main folder
const adminUserFilePath = path.join(__dirname, 'admin.user.json');

// POST admin registration
app.post('/api/admin/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const admins = readJSON(adminUserFilePath);

  // Check if admin already exists
  const adminExists = admins.some((a) => a.email === email);
  if (adminExists) {
    return res.status(400).json({ error: 'Admin email already registered' });
  }

  // Create new admin
  const newAdmin = {
    id: Date.now().toString(),
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  admins.push(newAdmin);

  if (writeJSON(adminUserFilePath, admins)) {
    // Sync to Supabase
    syncAdminToSupabase(newAdmin);
    
    // Send admin registration email
    sendAdminRegistrationEmail(newAdmin.name, newAdmin.email)
      .catch(error => console.error('Email sending error (non-critical):', error.message));
    
    res.status(201).json({ success: true, message: 'Admin registered successfully', id: newAdmin.id });
  } else {
    res.status(500).json({ error: 'Failed to save admin data' });
  }
});

// POST admin login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const admins = readJSON(adminUserFilePath);
  const admin = admins.find((a) => a.email === email && a.password === password);

  if (admin) {
    res.json({ success: true, message: 'Admin login successful', id: admin.id, name: admin.name });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// GET all admins (for debugging only)
app.get('/api/admin/users', (req, res) => {
  const admins = readJSON(adminUserFilePath);
  res.json(admins);
});

// Orders management
const ordersFilePath = path.join(__dirname, 'orders.json');

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    // Fetch from Supabase first
    console.log('📦 Fetching orders from Supabase...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Supabase fetch failed, using local data:', error.message);
      const orders = readJSON(ordersFilePath);
      res.json(orders);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Fetched ${data.length} orders from Supabase`);
      res.json(data);
    } else {
      console.log('⚠️ No orders in Supabase, using local data');
      const orders = readJSON(ordersFilePath);
      res.json(orders);
    }
  } catch (error) {
    console.error('❌ Error fetching orders:', error.message);
    const orders = readJSON(ordersFilePath);
    res.json(orders);
  }
});

// GET orders by customer email
app.get('/api/orders/:customerEmail', (req, res) => {
  const orders = readJSON(ordersFilePath);
  const customerOrders = orders.filter((o) => o.customerEmail === req.params.customerEmail);
  res.json(customerOrders);
});

// POST create new order
app.post('/api/orders', async (req, res) => {
  const { id, customerId, customerName, customerEmail, phone, address, items, subtotal, delivery, total, status, paymentMethod, createdAt } = req.body;

  if (!customerEmail || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  const orders = readJSON(ordersFilePath);
  const newOrder = {
    id: id || Date.now(),
    customerId: customerId || 'unknown',
    customerName: customerName || 'Customer',
    customerEmail,
    phone: phone || '',
    address: address || '',
    items,
    subtotal,
    delivery,
    total,
    status: status || 'pending',
    paymentMethod: paymentMethod || 'bank_transfer',
    createdAt: createdAt || new Date().toISOString()
  };

  orders.push(newOrder);
  if (writeJSON(ordersFilePath, orders)) {
    // Sync to Supabase
    syncOrderToSupabase(newOrder);
    
    // Send order confirmation email
    sendOrderConfirmationEmail(
      newOrder.customerName,
      newOrder.customerEmail,
      newOrder.id,
      newOrder.items,
      newOrder.total,
      newOrder.delivery || 0,
      newOrder.subtotal || 0
    ).catch(error => console.error('Email sending error (non-critical):', error.message));
    
    // Send admin notification about new order
    notifyAdminsOrderCreated(newOrder)
      .catch(error => console.error('Admin notification error (non-critical):', error.message));
    
    // Send order confirmation SMS (DISABLED - Need Nigerian Twilio number)
    // if (phone) {
    //   sendOrderConfirmationSMS(phone, customerName, newOrder.id, total)
    //     .catch(error => console.error('SMS sending error (non-critical):', error.message));
    // }
    
    // Send order confirmation WhatsApp (DISABLED - Need WhatsApp Business setup)
    // if (phone) {
    //   sendOrderConfirmationWhatsApp(phone, customerName, newOrder.id, total, newOrder.address)
    //     .catch(error => console.error('WhatsApp sending error (non-critical):', error.message));
    // }
    
    res.status(201).json({ success: true, order: newOrder });
  } else {
    res.status(500).json({ error: 'Failed to save order' });
  }
});

// PUT update order status (admin only)
app.put('/api/orders/:orderId', async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const orders = readJSON(ordersFilePath);
  const orderIndex = orders.findIndex((o) => o.id == req.params.orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders[orderIndex].status = status;
  if (writeJSON(ordersFilePath, orders)) {
    // Sync to Supabase
    syncOrderToSupabase(orders[orderIndex]);
    
    // Send order status update email
    sendOrderStatusUpdateEmail(
      orders[orderIndex].customerName,
      orders[orderIndex].customerEmail,
      orders[orderIndex].id,
      status,
      orders[orderIndex].items
    ).catch(error => console.error('Email sending error (non-critical):', error.message));
    
    // Send order status SMS (DISABLED - Need Nigerian Twilio number)
    // if (orders[orderIndex].phone) {
    //   sendOrderStatusSMS(
    //     orders[orderIndex].phone,
    //     orders[orderIndex].customerName,
    //     orders[orderIndex].id,
    //     status
    //   ).catch(error => console.error('SMS sending error (non-critical):', error.message));
    // }
    
    // Send order status WhatsApp (DISABLED - Need WhatsApp Business setup)
    // if (orders[orderIndex].phone) {
    //   sendOrderStatusWhatsApp(
    //     orders[orderIndex].phone,
    //     orders[orderIndex].customerName,
    //     orders[orderIndex].id,
    //     status
    //   ).catch(error => console.error('WhatsApp sending error (non-critical):', error.message));
    // }
    
    res.json({ success: true, order: orders[orderIndex] });
  } else {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Sync all existing orders to Supabase
app.post('/api/sync-orders', async (req, res) => {
  try {
    const orders = readJSON(ordersFilePath);
    let synced = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        await syncOrderToSupabase(order);
        synced++;
      } catch (error) {
        console.error('Failed to sync order:', order.id, error);
        failed++;
      }
    }

    res.json({ success: true, synced, failed, total: orders.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync orders' });
  }
});

// Sync order status from Supabase for a specific order
async function syncOrderStatusFromSupabase(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching order status from Supabase:', error.message);
      return null;
    }

    if (data && data.status) {
      const orders = readJSON(ordersFilePath);
      const orderIndex = orders.findIndex((o) => o.id == orderId);
      
      if (orderIndex !== -1) {
        orders[orderIndex].status = data.status;
        if (writeJSON(ordersFilePath, orders)) {
          console.log('✅ Order status synced from Supabase:', orderId, '→', data.status);
          return data.status;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error syncing status from Supabase:', error);
  }
  return null;
}

// GET order with latest status from Supabase
app.get('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.orderId)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Order not found in Supabase' });
    }

    res.json({ success: true, order: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// PUT update order status in Supabase (Admin endpoint)
app.put('/api/orders/:orderId/status', async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', req.params.orderId)
      .select();
    
    if (error) {
      console.error('❌ Error updating order in Supabase:', error.message);
      return res.status(500).json({ error: 'Failed to update order status in Supabase' });
    }

    const orders = readJSON(ordersFilePath);
    const orderIndex = orders.findIndex((o) => o.id == req.params.orderId);
    
    if (orderIndex !== -1) {
      orders[orderIndex].status = status;
      writeJSON(ordersFilePath, orders);
      
      // If status is "shipped", create entries in order_riders table for ALL online riders
      if (status === 'shipped') {
        try {
          console.log('🏍️ Creating order_riders entries for all online riders...');
          
          // Get all online riders from Supabase
          const { data: onlineRiders, error: ridersError } = await supabase
            .from('riders')
            .select('*')
            .eq('is_online', true);
          
          if (ridersError) {
            console.warn('⚠️ Failed to fetch online riders:', ridersError.message);
          } else if (onlineRiders && onlineRiders.length > 0) {
            console.log(`📢 Found ${onlineRiders.length} online riders`);
            
            // Create an entry for each online rider with full order details
            const orderRiderEntries = onlineRiders.map((rider) => ({
              order_id: req.params.orderId,
              rider_id: rider.id,
              customer_name: orders[orderIndex].customerName || orders[orderIndex].customer_name || 'Unknown',
              customer_phone: orders[orderIndex].phone || orders[orderIndex].customer_phone || '',
              delivery_address: orders[orderIndex].address || orders[orderIndex].delivery_address || '',
              delivery_city: orders[orderIndex].city || '',
              delivery_state: orders[orderIndex].state || '',
              order_total: orders[orderIndex].total || 0,
              order_items: JSON.stringify(orders[orderIndex].items || []),
              customer_email: orders[orderIndex].customerEmail || orders[orderIndex].customer_email || '',
              status: 'assigned',
              assigned_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            // Insert all entries
            const { data: insertedEntries, error: insertError } = await supabase
              .from('order_riders')
              .insert(orderRiderEntries)
              .select();
            
            if (insertError) {
              console.warn('⚠️ Failed to create order_riders entries:', insertError.message);
            } else {
              console.log(`✅ Created ${insertedEntries?.length || orderRiderEntries.length} order_riders entries with full order details`);
            }
          } else {
            console.log('⚠️ No online riders available to assign order');
          }
        } catch (orderRiderError) {
          console.warn('⚠️ Error managing order_riders:', orderRiderError.message);
        }
      }
      
      // Send order status update email to customer
      const customerEmail = orders[orderIndex].customer_email || orders[orderIndex].customerEmail;
      const customerName = orders[orderIndex].customer_name || orders[orderIndex].customerName;
      
      if (customerEmail) {
        console.log('📧 Sending status update email to:', customerEmail);
        sendOrderStatusUpdateEmail(
          customerName,
          customerEmail,
          orders[orderIndex].id,
          status,
          orders[orderIndex].items
        ).catch(error => console.error('Email sending error (non-critical):', error.message));
      } else {
        console.warn('⚠️ No customer email found for order:', req.params.orderId);
      }
    }

    console.log('✅ Order status updated:', req.params.orderId, '→', status);
    res.json({ success: true, order: data[0] });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET all orders with latest status from Supabase
app.get('/api/orders-from-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch orders from Supabase' });
    }

    res.json({ success: true, orders: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST sync order status from Supabase
app.post('/api/orders/:orderId/sync-status', async (req, res) => {
  try {
    const status = await syncOrderStatusFromSupabase(req.params.orderId);
    if (status) {
      res.json({ success: true, status });
    } else {
      res.status(404).json({ error: 'Order not found or unable to sync' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync order status' });
  }
});

// Send customer message endpoint
app.post('/api/send-message', async (req, res) => {
  try {
    const { emails, phones, subject, message, senderName, senderEmail } = req.body;

    // Validate input
    if ((!emails || emails.length === 0) && (!phones || phones.length === 0)) {
      return res.status(400).json({ error: 'At least one email or phone number is required' });
    }
    if (!subject || !message || !senderName || !senderEmail) {
      return res.status(400).json({ error: 'Subject, message, sender name, and sender email are required' });
    }

    console.log(`📧 Sending message to ${emails?.length || 0} emails and ${phones?.length || 0} phone numbers...`);

    // Create message record
    const messageRecord = {
      id: Date.now(),
      senderName,
      senderEmail,
      emails: emails || [],
      phones: phones || [],
      subject,
      message,
      createdAt: new Date().toISOString(),
      read: false
    };

    let sentCount = 0;
    let failedCount = 0;
    let emailsSent = 0;
    let smsSent = 0;

    // Send email to each recipient using Brevo
    if (emails && emails.length > 0) {
      const emailTemplate = {
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">${subject}</h2>
              
              <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0; white-space: pre-wrap; line-height: 1.6;">
                ${message}
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                <strong>From:</strong> ${senderName} (${senderEmail})<br/>
                <strong>Sent on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This is a message from Amoo Store. If you have any questions, please reply to this email.
              </p>
            </div>
          </div>
        `,
        text: `${subject}\n\n${message}\n\nFrom: ${senderName} (${senderEmail})\nSent on: ${new Date().toLocaleDateString()}\n\nThis is a message from Amoo Store.`
      };

      // Send to each email recipient
      for (const recipientEmail of emails) {
        try {
          const { sendEmailViaBrevo } = require('./emailService.js');
          await sendEmailViaBrevo(recipientEmail, emailTemplate.subject, emailTemplate.html, emailTemplate.text, senderEmail);
          emailsSent++;
          sentCount++;
          console.log(`✅ Email sent to: ${recipientEmail}`);
        } catch (error) {
          failedCount++;
          console.error(`❌ Failed to send email to ${recipientEmail}:`, error.message);
        }
      }
    }

    // Send SMS to each phone recipient (DISABLED - Need Nigerian Twilio number)
    // if (phones && phones.length > 0) {
    //   for (const phoneNumber of phones) {
    //     try {
    //       await sendOrderStatusSMS(phoneNumber, 'Valued Customer', message, subject);
    //       smsSent++;
    //       sentCount++;
    //       console.log(`✅ SMS sent to: ${phoneNumber}`);
    //     } catch (error) {
    //       failedCount++;
    //       console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error.message);
    //     }
    //   }
    // }

    // Send WhatsApp to each phone recipient (DISABLED - Need WhatsApp Business setup)
    // if (phones && phones.length > 0) {
    //   for (const phoneNumber of phones) {
    //     try {
    //       const whatsappMessage = `📢 *Message from AMOO STORE*\n\n${subject}\n\n${message}\n\nThank you!`;
    //       await sendBulkWhatsApp([phoneNumber], whatsappMessage);
    //       console.log(`✅ WhatsApp sent to: ${phoneNumber}`);
    //     } catch (error) {
    //       console.error(`❌ Failed to send WhatsApp to ${phoneNumber}:`, error.message);
    //     }
    //   }
    // }

    // Save to Supabase messages table
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_email: senderEmail,
          sender_name: senderName,
          recipient_emails: emails || [],
          recipient_phones: phones || [],
          subject: subject,
          message_content: message,
          status: sentCount > 0 ? 'sent' : 'failed',
          recipient_count: (emails?.length || 0) + (phones?.length || 0),
          sent_count: sentCount,
          failed_count: failedCount,
          emails_sent: emailsSent,
          sms_sent: smsSent
        }]);

      if (error) {
        console.warn('⚠️ Supabase save failed:', error.message);
      } else {
        console.log(`✅ Message saved to Supabase (${emailsSent} emails, ${smsSent} SMS)`);
      }
    } catch (supabaseError) {
      console.warn('⚠️ Supabase error:', supabaseError.message);
    }

    // Also save to local JSON for fallback
    const messagesFilePath = path.join(__dirname, 'messages.json');
    let messages = [];
    if (fs.existsSync(messagesFilePath)) {
      const data = fs.readFileSync(messagesFilePath, 'utf8');
      messages = data ? JSON.parse(data) : [];
    }
    messageRecord.sentCount = sentCount;
    messageRecord.failedCount = failedCount;
    messageRecord.emailsSent = emailsSent;
    messageRecord.smsSent = smsSent;
    messages.push(messageRecord);
    
    res.json({ 
      success: true, 
      message: `Message sent: ${emailsSent} emails, ${smsSent} SMS${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      messageId: messageRecord.id,
      sentCount,
      failedCount,
      emailsSent,
      smsSent,
      totalRecipients: (emails?.length || 0) + (phones?.length || 0)
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all customer messages (admin endpoint)
app.get('/api/messages', async (req, res) => {
  try {
    // Fetch messages from Supabase
    console.log('📧 Fetching messages from Supabase...');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Supabase fetch failed, using local data:', error.message);
      // Fallback to local JSON
      let messages = [];
      const messagesFilePath = path.join(__dirname, 'messages.json');
      if (fs.existsSync(messagesFilePath)) {
        const data = fs.readFileSync(messagesFilePath, 'utf8');
        messages = data ? JSON.parse(data) : [];
      }
      res.json(messages);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Fetched ${data.length} messages from Supabase`);
      res.json(data);
    } else {
      console.log('⚠️ No messages in Supabase, using local data');
      let messages = [];
      const messagesFilePath = path.join(__dirname, 'messages.json');
      if (fs.existsSync(messagesFilePath)) {
        const data = fs.readFileSync(messagesFilePath, 'utf8');
        messages = data ? JSON.parse(data) : [];
      }
      res.json(messages);
    }
  } catch (error) {
    console.error('❌ Error fetching messages:', error.message);
    let messages = [];
    const messagesFilePath = path.join(__dirname, 'messages.json');
    if (fs.existsSync(messagesFilePath)) {
      const data = fs.readFileSync(messagesFilePath, 'utf8');
      messages = data ? JSON.parse(data) : [];
    }
    res.json(messages);
  }
});

// GET all registered user emails
app.get('/api/registered-emails', async (req, res) => {
  try {
    console.log('📧 Fetching registered user emails from Supabase...');
    const { data, error } = await supabase
      .from('users')
      .select('email, name')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ Supabase fetch failed:', error.message);
      const users = readJSON(userFilePath);
      const emails = users.map(u => ({ email: u.email, name: u.name }));
      res.json(emails);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Fetched ${data.length} registered emails from Supabase`);
      res.json(data);
    } else {
      const users = readJSON(userFilePath);
      const emails = users.map(u => ({ email: u.email, name: u.name }));
      res.json(emails);
    }
  } catch (error) {
    console.error('❌ Error fetching emails:', error.message);
    const users = readJSON(userFilePath);
    const emails = users.map(u => ({ email: u.email, name: u.name }));
    res.json(emails);
  }
});

// ===== RIDER ENDPOINTS =====
const riderFilePath = path.join(__dirname, 'riders.json');

// GET All Riders (from Supabase)
app.get('/api/riders', async (req, res) => {
  try {
    // Try fetching from Supabase first
    const { data, error } = await supabase.from('riders').select('*').order('created_at', { ascending: false });
    
    if (error) {
      console.warn('⚠️ Supabase riders fetch failed, falling back to JSON:', error.message);
      // Fallback to JSON file
      const riders = readJSON(riderFilePath);
      return res.json(riders);
    }

    if (!data || data.length === 0) {
      // Try JSON as fallback
      const riders = readJSON(riderFilePath);
      return res.json(riders);
    }

    console.log('✅ Fetched', data.length, 'riders from Supabase');
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching riders:', error);
    // Fallback to JSON
    try {
      const riders = readJSON(riderFilePath);
      res.json(riders);
    } catch {
      res.status(500).json({ error: 'Failed to fetch riders' });
    }
  }
});

// GET Rider by ID (Updated for Supabase)
app.get('/api/riders/:riderId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', req.params.riderId)
      .single();

    if (error) {
      console.warn('⚠️ Supabase fetch failed, trying JSON:', error.message);
      // Fallback to JSON
      const riders = readJSON(riderFilePath);
      const rider = riders.find(r => r.id === req.params.riderId);
      if (rider) return res.json(rider);
      return res.status(404).json({ error: 'Rider not found' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching rider:', error);
    res.status(500).json({ error: 'Failed to fetch rider' });
  }
});

// PUT Update Rider Status (Updated for Supabase)
app.put('/api/rider/:riderId/status', async (req, res) => {
  const { is_online } = req.body;
  const riderId = req.params.riderId;

  console.log('📢 STATUS UPDATE REQUEST:', { riderId, is_online });

  if (is_online === undefined) {
    console.log('❌ is_online is undefined');
    return res.status(400).json({ error: 'is_online status is required' });
  }

  try {
    // Update in Supabase
    console.log('🔄 Updating Supabase rider:', riderId, '→', is_online);
    const { data, error } = await supabase
      .from('riders')
      .update({ is_online: is_online, updated_at: new Date().toISOString() })
      .eq('id', riderId)
      .select();

    if (error) {
      console.error('❌ Supabase update error:', error.message);
      console.warn('⚠️ Supabase update failed, trying JSON:', error.message);
      // Fallback to JSON
      const riders = readJSON(riderFilePath);
      const riderIndex = riders.findIndex(r => r.id === riderId);
      if (riderIndex === -1) {
        console.log('❌ Rider not found in JSON');
        return res.status(404).json({ error: 'Rider not found' });
      }
      riders[riderIndex].is_online = is_online;
      writeJSON(riderFilePath, riders);
      console.log('✅ Updated rider in JSON file:', riderId);
      return res.json({ success: true, rider: riders[riderIndex] });
    }

    if (!data || data.length === 0) {
      console.log('❌ No data returned from Supabase');
      return res.status(404).json({ error: 'Rider not found' });
    }

    console.log('✅ Rider status updated in Supabase:', riderId, '→', is_online ? 'ONLINE' : 'OFFLINE');
    console.log('📊 Updated data:', data[0]);
    res.json({ success: true, rider: data[0] });
  } catch (error) {
    console.error('❌ Error updating rider status:', error);
    res.status(500).json({ error: 'Failed to update rider status' });
  }
});

// ===== EXISTING RIDER ENDPOINTS (BELOW) =====

app.post('/api/rider/register', async (req, res) => {
  const { name, email, phone, password, vehicleType, licensePlate, bankName, accountNumber, accountName } = req.body;

  if (!name || !email || !phone || !password || !vehicleType || !licensePlate || !bankName || !accountNumber || !accountName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if rider already exists in Supabase
    const { data: existingRiders, error: checkError } = await supabase
      .from('riders')
      .select('email')
      .eq('email', email);

    if (checkError) {
      console.warn('⚠️ Supabase check failed, using JSON fallback:', checkError.message);
    } else if (existingRiders && existingRiders.length > 0) {
      return res.status(400).json({ error: 'Email already registered as a rider' });
    }

    const riderId = 'R' + Date.now().toString();
    const newRider = {
      id: riderId,
      name,
      email,
      phone,
      password_hash: password, // In production, use bcrypt
      vehicle_type: vehicleType,
      license_plate: licensePlate,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      is_online: false,
      rating: 5.0,
      total_deliveries: 0,
      month_deliveries: 0,
      month_earnings: 0.00,
      total_earnings: 0.00,
      join_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Try to save to Supabase first
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('riders')
      .insert([newRider])
      .select();

    if (supabaseError) {
      console.warn('⚠️ Supabase insert failed, saving to JSON:', supabaseError.message);
      // Fallback to JSON file
      const riders = readJSON(riderFilePath);
      riders.push({
        ...newRider,
        vehicleType,
        licensePlate,
        bankName,
        accountNumber,
        accountName,
        isOnline: false,
        totalDeliveries: 0,
        monthDeliveries: 0,
        monthEarnings: 0,
        totalEarnings: 0,
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      writeJSON(riderFilePath, riders);
    } else {
      console.log('✅ Rider registered in Supabase:', email);
      // Also save to JSON for backup
      const riders = readJSON(riderFilePath);
      riders.push({
        ...newRider,
        vehicleType,
        licensePlate,
        bankName,
        accountNumber,
        accountName,
        isOnline: false
      });
      writeJSON(riderFilePath, riders);
    }

    // Send welcome email to rider
    try {
      await sendRiderRegistrationEmail(name, email, vehicleType, licensePlate);
    } catch (emailError) {
      console.warn('⚠️ Failed to send rider registration email:', emailError.message);
      // Don't fail registration if email fails
    }

    const token = riderId + '_' + Date.now();
    res.status(201).json({
      success: true,
      message: 'Rider registered successfully',
      riderId: riderId,
      token: token
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Failed to register rider' });
  }
});

// POST Rider Login
app.post('/api/rider/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const riders = readJSON(riderFilePath);
  const rider = riders.find((r) => r.email === email && r.password === password);

  if (rider) {
    const token = rider.id + '_' + Date.now();
    res.json({
      success: true,
      message: 'Login successful',
      riderId: rider.id,
      token: token,
      name: rider.name,
      email: rider.email
    });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// GET Rider Data
app.get('/api/rider/:riderId', (req, res) => {
  const riders = readJSON(riderFilePath);
  const rider = riders.find((r) => r.id === req.params.riderId);

  if (rider) {
    res.json(rider);
  } else {
    res.status(404).json({ error: 'Rider not found' });
  }
});

// PUT Update Rider Status (change online/offline)

// ===== ORDER-RIDERS ENDPOINTS (New Rider Dashboard) =====

// GET Available Orders (unassigned orders from order_riders table)
app.get('/api/order-riders/available', async (req, res) => {
  try {
    // Fetch orders with status='assigned' that don't have a rider yet
    const { data, error } = await supabase
      .from('order_riders')
      .select('id, order_id, orders(*)')
      .is('rider_id', null)
      .limit(50);
    
    if (error) {
      console.warn('⚠️ Supabase fetch failed:', error.message);
      return res.json([]); // Return empty if Supabase fails
    }

    // Map to include order details with fallback
    const availableOrders = data.map(ord => {
      const orderData = ord.orders || {};
      return {
        id: ord.id,
        order_id: ord.order_id,
        riderAssignmentId: ord.id,
        ...orderData,
        items: orderData.items || []
      };
    });

    console.log(`✅ Fetched ${availableOrders.length} available orders`);
    res.json(availableOrders);
  } catch (error) {
    console.error('❌ Error fetching available orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET Rider's Active Orders (assigned to specific rider, not delivered)
app.get('/api/order-riders/rider/:riderId', async (req, res) => {
  const riderId = req.params.riderId;
  const status = req.query.status || 'active'; // active or delivered

  try {
    let query = supabase
      .from('order_riders')
      .select('*, orders(*)')
      .eq('rider_id', riderId);
    
    if (status === 'active') {
      query = query.neq('status', 'delivered');
    } else if (status === 'delivered') {
      query = query.eq('status', 'delivered');
    }

    const { data, error } = await query.limit(50);
    
    if (error) {
      console.warn('⚠️ Supabase fetch failed:', error.message);
      return res.json([]); // Return empty if Supabase fails
    }

    // Map to include order details with defensive handling
    const orders = data.map(ord => {
      const orderData = ord.orders || {};
      return {
        id: ord.id,
        order_id: ord.order_id,
        rider_id: ord.rider_id,
        status: ord.status,
        delivered_at: ord.delivered_at,
        delivery_code: ord.delivery_code,
        notes: ord.notes,
        ...orderData,
        items: orderData.items || []
      };
    });

    console.log(`✅ Fetched ${orders.length} ${status} orders for rider ${riderId}`);
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching rider orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST Accept Order (rider accepts available order)
app.post('/api/order-riders/:orderRiderId/accept', async (req, res) => {
  const orderRiderId = req.params.orderRiderId;
  const { riderId } = req.body;

  if (!riderId) {
    return res.status(400).json({ error: 'Rider ID is required' });
  }

  try {
    // Update order_riders entry with rider_id and status='assigned'
    const { data, error } = await supabase
      .from('order_riders')
      .update({ 
        rider_id: riderId, 
        status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', orderRiderId);
    
    if (error) {
      console.warn('⚠️ Supabase update failed:', error.message);
      return res.status(500).json({ error: 'Failed to accept order' });
    }

    console.log(`✅ Rider ${riderId} accepted order assignment ${orderRiderId}`);
    res.json({ success: true, message: 'Order accepted' });
  } catch (error) {
    console.error('❌ Error accepting order:', error);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// PUT Update Order Status (for rider delivery progress)
app.put('/api/order-riders/:orderRiderId/status', async (req, res) => {
  const orderRiderId = req.params.orderRiderId;
  const { status, notes, deliveryCode } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const updateData = {
      status: status,
      notes: notes || null
    };

    if (status === 'arrived' && deliveryCode) {
      updateData.delivery_code = deliveryCode;
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('order_riders')
      .update(updateData)
      .eq('id', orderRiderId);
    
    if (error) {
      console.warn('⚠️ Supabase update failed:', error.message);
      return res.status(500).json({ error: 'Failed to update status' });
    }

    console.log(`✅ Order ${orderRiderId} status updated to ${status}`);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST Assign Rider to Order
app.post('/api/order/:orderId/assign-rider', async (req, res) => {
  const { riderId } = req.body;

  if (!riderId) {
    return res.status(400).json({ error: 'Rider ID is required' });
  }

  const orders = readJSON(ordersFilePath);
  const orderIndex = orders.findIndex((o) => o.id == req.params.orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders[orderIndex].riderId = riderId;
  orders[orderIndex].status = 'assigned';

  if (writeJSON(ordersFilePath, orders)) {
    // Send notification to customer
    const order = orders[orderIndex];
    try {
      await sendOrderStatusUpdateEmail(
        order.customerName,
        order.customerEmail,
        order.id,
        'shipped',
        order.items
      );
    } catch (error) {
      console.error('Error sending email:', error);
    }

    console.log('✅ Order assigned to rider:', riderId);
    res.json({ success: true, order: orders[orderIndex] });
  } else {
    res.status(500).json({ error: 'Failed to assign rider' });
  }
});

// PUT Update Delivery Status
app.put('/api/order/:orderId/status', async (req, res) => {
  const { status, notes, deliveryCode, customerEmail } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const orders = readJSON(ordersFilePath);
  const orderIndex = orders.findIndex((o) => o.id == req.params.orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders[orderIndex].status = status;
  if (notes) orders[orderIndex].notes = notes;
  if (deliveryCode) orders[orderIndex].deliveryCode = deliveryCode;

  if (writeJSON(ordersFilePath, orders)) {
    // Send email notification when rider arrives
    if (status === 'arrived' && deliveryCode && customerEmail) {
      try {
        const { sendOrderStatusUpdateEmail } = require('./emailService');
        await sendOrderStatusUpdateEmail(
          orders[orderIndex].customerName,
          customerEmail,
          req.params.orderId,
          'arrived',
          orders[orderIndex].items,
          deliveryCode
        );
      } catch (error) {
        console.error('Error sending delivery code email:', error);
      }
    }

    console.log('✅ Order status updated:', status);
    res.json({ success: true, order: orders[orderIndex] });
  } else {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// POST Send Delivery Code Email
app.post('/api/send-delivery-code', async (req, res) => {
  const { orderId, customerEmail, customerName, code } = req.body;

  if (!orderId || !customerEmail || !code) {
    return res.status(400).json({ error: 'Order ID, customer email, and code are required' });
  }

  try {
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">🎉 Your Rider Has Arrived!</h2>
          
          <p style="color: #555; font-size: 16px; margin: 20px 0;">
            Hi ${customerName},<br><br>
            Your delivery rider has arrived at your location. Please provide this code to confirm delivery:
          </p>
          
          <div style="background-color: #FF6B35; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0;">Delivery Code:</p>
            <p style="color: #ffffff; font-size: 48px; font-weight: bold; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace;">
              ${code}
            </p>
          </div>
          
          <p style="color: #555; font-size: 14px; margin: 20px 0;">
            <strong>Order ID:</strong> ${orderId}<br>
            <strong>Important:</strong> Only share this code with your rider. Do not share with anyone else.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated message from Amoo Store. If you did not expect this email, please contact support.
          </p>
        </div>
      </div>
    `;

    // Get admin emails for notification
    const adminEmails = getAdminEmails();
    const adminNotificationHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>🚚 Delivery Code Generated</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Delivery Code:</strong> <strong style="font-size: 24px; letter-spacing: 5px;">${code}</strong></p>
        <p style="color: #666; margin-top: 20px;">Rider has arrived at customer location.</p>
      </div>
    `;

    // Send to customer
    console.log(`📧 Sending delivery code to: ${customerEmail}`);
    await sendOrderStatusUpdateEmail(
      customerName,
      customerEmail,
      orderId,
      'arrived',
      [],
      code
    ).catch(e => console.error('Error sending to customer:', e));

    // Send to admin
    for (const adminEmail of adminEmails) {
      await sendAdminOrderNotification(
        adminEmail,
        orderId,
        customerName,
        customerEmail,
        [],
        0,
        0,
        0
      ).catch(e => console.error('Error sending to admin:', e));
    }

    res.json({ success: true, message: 'Delivery code sent to customer' });
  } catch (error) {
    console.error('Error sending delivery code:', error);
    res.status(500).json({ error: 'Failed to send delivery code' });
  }
});

// PUT Mark Order as Delivered (with code verification)
app.put('/api/order/:orderId/delivered', async (req, res) => {
  const { code, customerEmail } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Delivery code is required' });
  }

  const orders = readJSON(ordersFilePath);
  const orderIndex = orders.findIndex((o) => o.id == req.params.orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = orders[orderIndex];

  // Verify code
  if (order.deliveryCode !== code) {
    return res.status(400).json({ error: 'Invalid delivery code' });
  }

  // Update order status
  order.status = 'delivered';
  order.deliveredAt = new Date().toISOString();
  order.verificationCode = code;

  if (writeJSON(ordersFilePath, orders)) {
    // Get admin emails
    const adminEmails = getAdminEmails();

    // Send delivery confirmation to customer
    try {
      const confirmationHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; margin-bottom: 20px;">✅ Delivery Completed!</h2>
            
            <p style="color: #555; font-size: 16px; margin: 20px 0;">
              Hi ${order.customerName},<br><br>
              Your order has been successfully delivered! Thank you for shopping with us.
            </p>
            
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Order ID:</strong> ${req.params.orderId}</p>
              <p style="margin: 10px 0;"><strong>Delivered at:</strong> ${new Date(order.deliveredAt).toLocaleString()}</p>
              <p style="margin: 10px 0;"><strong>Total Amount:</strong> ₦${order.total.toLocaleString()}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0;">
              If you have any questions about your order, please contact our support team.
            </p>
          </div>
        </div>
      `;

      await sendOrderStatusUpdateEmail(
        order.customerName,
        customerEmail || order.customerEmail,
        req.params.orderId,
        'delivered',
        order.items
      ).catch(e => console.error('Error:', e));
    } catch (error) {
      console.error('Error sending customer confirmation:', error);
    }

    // Send notification to all admins
    try {
      for (const adminEmail of adminEmails) {
        await sendAdminOrderNotification(
          adminEmail,
          req.params.orderId,
          order.customerName,
          order.customerEmail,
          order.items,
          order.total,
          order.subtotal || 0,
          order.delivery || 0
        ).catch(e => console.error('Error:', e));
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }

    console.log('✅ Order marked as delivered:', req.params.orderId);
    res.json({ success: true, message: 'Order delivered successfully', order });
  } else {
    res.status(500).json({ error: 'Failed to mark order as delivered' });
  }
});

// GET Rider's Active Orders
app.get('/api/rider/:riderId/active-orders', (req, res) => {
  const orders = readJSON(ordersFilePath);
  const activeOrders = orders.filter((o) => o.riderId === req.params.riderId && (o.status === 'assigned' || o.status === 'picked' || o.status === 'on-way' || o.status === 'arrived'));

  res.json(activeOrders);
});

// GET Rider's Completed Orders
app.get('/api/rider/:riderId/completed-orders', (req, res) => {
  const orders = readJSON(ordersFilePath);
  const completedOrders = orders.filter((o) => o.riderId === req.params.riderId && o.status === 'delivered');

  res.json(completedOrders);
});

// POST Notify riders about available order
app.post('/api/notify-riders-order', async (req, res) => {
  console.log('🔔 ENDPOINT HIT: /api/notify-riders-order called with body:', req.body);
  const { orderId } = req.body;

  if (!orderId) {
    console.log('❌ No orderId provided');
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    console.log('📂 Reading orders from Supabase first...');
    let order = null;
    
    // Try Supabase first
    try {
      const { data: supabaseOrder, error: supabaseError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (!supabaseError && supabaseOrder) {
        order = supabaseOrder;
        console.log('✅ Order found in Supabase');
      }
    } catch (e) {
      console.log('⚠️ Supabase query failed, trying JSON file');
    }
    
    // Fallback to JSON if not found in Supabase
    if (!order) {
      console.log('📂 Reading orders from JSON file: /opt/render/project/src/orders.json');
      const orders = readJSON(ordersFilePath);
      console.log('📊 Total orders in JSON file:', orders.length);
      order = orders.find((o) => o.id == orderId);
      if (order) {
        console.log('✅ Order found in JSON file');
      }
    }

    if (!order) {
      console.log('❌ Order not found in Supabase or JSON - returning 404');
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get all online riders from Supabase first, fallback to JSON
    let onlineRiders = [];
    try {
      const { data: supabaseRiders, error: supabaseError } = await supabase
        .from('riders')
        .select('*')
        .eq('is_online', true);

      if (supabaseError) {
        console.warn('⚠️ Supabase riders fetch failed, using JSON:', supabaseError.message);
        const riders = readJSON(riderFilePath);
        onlineRiders = riders.filter((r) => r.is_online === true || r.isOnline === true);
      } else if (supabaseRiders && supabaseRiders.length > 0) {
        onlineRiders = supabaseRiders;
      } else {
        // Fallback to JSON if no data from Supabase
        const riders = readJSON(riderFilePath);
        onlineRiders = riders.filter((r) => r.is_online === true || r.isOnline === true);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching from Supabase, using JSON:', error.message);
      const riders = readJSON(riderFilePath);
      onlineRiders = riders.filter((r) => r.is_online === true || r.isOnline === true);
    }

    console.log('🏍️ Online riders found:', onlineRiders.length);
    if (onlineRiders.length === 0) {
      console.log('⚠️ No online riders available for order:', orderId);
      return res.json({ success: true, message: 'No online riders to notify', count: 0 });
    }

    // Create order_riders entries in Supabase for each online rider with full order details
    try {
      console.log('📝 Creating order_riders entries in Supabase for all online riders...');
      
      const orderRiderEntries = onlineRiders.map((rider) => ({
        order_id: orderId,
        rider_id: rider.id,
        customer_name: order.customerName || order.customer_name || 'Unknown',
        customer_phone: order.phone || order.customer_phone || '',
        delivery_address: order.address || order.delivery_address || '',
        delivery_city: order.city || '',
        delivery_state: order.state || '',
        order_total: order.total || 0,
        order_items: JSON.stringify(order.items || []),
        customer_email: order.customerEmail || order.customer_email || '',
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Insert all entries into Supabase
      const { data: insertedEntries, error: insertError } = await supabase
        .from('order_riders')
        .insert(orderRiderEntries)
        .select();
      
      if (insertError) {
        console.warn('⚠️ Failed to create order_riders entries in Supabase:', insertError.message);
      } else {
        console.log(`✅ Created ${insertedEntries?.length || orderRiderEntries.length} order_riders entries in Supabase with full order details`);
      }
    } catch (orderRiderError) {
      console.warn('⚠️ Error creating order_riders entries:', orderRiderError.message);
    }

    // Send email notification to each online rider
    const riderEmailPromises = onlineRiders.map(async (rider) => {
      try {
        const riderEmail = rider.email || rider.rider_email;
        if (!riderEmail) {
          console.warn(`⚠️ No email found for rider: ${rider.name || rider.id}`);
          return;
        }

        const riderNotificationHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #FF6B35; margin-bottom: 20px;">🏍️ New Order Available!</h2>
              
              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${orderId}</p>
                <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${order.customerName || 'Unknown'}</p>
                <p style="margin: 0 0 10px 0;"><strong>Delivery Address:</strong> ${order.address || 'Not specified'}</p>
                <p style="margin: 0;"><strong>Amount:</strong> ₦${(order.total || 0).toLocaleString()}</p>
              </div>

              <p style="color: #555; font-size: 16px; margin: 20px 0;">
                Hi ${rider.name || rider.rider_name || 'Rider'},<br><br>
                A new order has just been shipped and is now available for you to pick up! Check your dashboard to accept this order.
              </p>

              <div style="margin: 20px 0;">
                <a href="https://amoostorefasthion.netlify.app/rider" style="display: inline-block; background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Available Orders
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

              <p style="color: #666; font-size: 14px; margin: 10px 0;">
                This is an automated notification from AMOO STORE<br>
                Please do not reply to this email
              </p>
            </div>
          </div>
        `;

        const riderNotificationText = `New Order Available!\n\nOrder ID: ${orderId}\nCustomer: ${order.customerName || 'Unknown'}\nDelivery Address: ${order.address || 'Not specified'}\nAmount: ₦${(order.total || 0).toLocaleString()}\n\nA new order has been shipped and is available for pickup. Log in to your rider dashboard to accept this order.`;

        // Send email using Brevo
        console.log(`📧 Sending order notification to rider: ${riderEmail}`);
        try {
          await sendEmailViaBrevo(
            riderEmail,
            `🏍️ New Order Available - #${orderId}`,
            riderNotificationHTML,
            riderNotificationText
          );
          console.log(`✅ Email sent to rider: ${riderEmail}`);
        } catch (emailError) {
          console.error(`❌ Email failed for rider ${riderEmail}:`, emailError.response?.data?.message || emailError.message);
          // Continue anyway - the order is still in the system
        }
      } catch (error) {
        console.warn(`⚠️ Error processing rider ${rider.email || rider.rider_email}:`, error.message);
      }
    });

    // Wait for all email notifications to be sent (don't let one failure stop others)
    const results = await Promise.allSettled(riderEmailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Order #${orderId} broadcasted to ${onlineRiders.length} online rider(s) | Success: ${successCount} | Failed: ${failureCount}`);
    res.json({ 
      success: true, 
      message: `Order broadcasted to ${onlineRiders.length} online riders (${successCount} emails sent, ${failureCount} failed)`,
      count: onlineRiders.length,
      successCount,
      failureCount,
      onlineRiders: onlineRiders.map(r => ({ 
        id: r.id, 
        name: r.name || r.rider_name, 
        email: r.email || r.rider_email 
      }))
    });
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ CATCH BLOCK - Error notifying riders:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to notify riders', message: error.message });
  }
});

// POST Rider Withdrawal Request
app.post('/api/rider/:riderId/withdraw', async (req, res) => {
  const riderId = req.params.riderId;
  const { amount, bankName, accountNumber, accountName } = req.body;

  if (!amount || amount < 1000) {
    return res.status(400).json({ error: 'Minimum withdrawal is ₦1,000' });
  }

  try {
    // Save withdrawal request to Supabase
    const { data, error } = await supabase
      .from('withdrawals')
      .insert([{
        rider_id: riderId,
        amount: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: 'pending',
        requested_at: new Date().toISOString(),
        processed_at: null
      }]);

    if (error) {
      console.warn('⚠️ Supabase insert failed:', error.message);
      // Fallback to JSON
      const withdrawalsFilePath = path.join(__dirname, 'withdrawals.json');
      let withdrawals = [];
      if (fs.existsSync(withdrawalsFilePath)) {
        const data = fs.readFileSync(withdrawalsFilePath, 'utf8');
        withdrawals = data ? JSON.parse(data) : [];
      }
      withdrawals.push({
        id: Date.now().toString(),
        rider_id: riderId,
        amount: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: 'pending',
        requested_at: new Date().toISOString()
      });
      fs.writeFileSync(withdrawalsFilePath, JSON.stringify(withdrawals, null, 2));
    }

    console.log(`✅ Withdrawal request created for rider ${riderId}: ₦${amount}`);
    
    // Send email confirmation
    try {
      const rider = readJSON(riderFilePath).find(r => r.id === riderId);
      if (rider) {
        const emailHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Withdrawal Request Confirmed</h2>
            <p>Hi ${rider.name},</p>
            <p>Your withdrawal request has been submitted.</p>
            <ul>
              <li><strong>Amount:</strong> ₦${amount.toLocaleString()}</li>
              <li><strong>Bank:</strong> ${bankName}</li>
              <li><strong>Account:</strong> ${accountNumber}</li>
              <li><strong>Status:</strong> Pending</li>
            </ul>
            <p>Your payment will be processed within 7 business days.</p>
          </div>
        `;
        await sendEmailViaBrevo(rider.email, 'Withdrawal Request Confirmed', emailHTML);
      }
    } catch (emailError) {
      console.warn('⚠️ Failed to send withdrawal confirmation email:', emailError.message);
    }

    res.json({ success: true, message: 'Withdrawal request submitted' });
  } catch (error) {
    console.error('❌ Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// API fallback for missing endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n🛍️  Amoo Backend running at http://localhost:${PORT}`);
  console.log(`📂 Serving static files from: ${__dirname}`);
  console.log(`📝 Product data: ${productFilePath}`);
  console.log(`👤 User data: ${userFilePath}`);
  console.log(`🔐 Admin data: ${adminUserFilePath}\n`);
  
  // Auto-sync existing data to Supabase on startup
  if (supabaseUrl) {
    console.log('🔄 Syncing existing data to Supabase...');
    try {
      // Sync all existing products
      const products = readJSON(productFilePath);
      for (const product of products) {
        await syncProductToSupabase(product);
      }
      if (products.length > 0) {
        console.log(`✅ Synced ${products.length} existing products to Supabase`);
      }

      // Sync all existing orders
      const orders = readJSON(ordersFilePath);
      for (const order of orders) {
        await syncOrderToSupabase(order);
      }
      if (orders.length > 0) {
        console.log(`✅ Synced ${orders.length} existing orders to Supabase`);
      }
    } catch (error) {
      console.error('❌ Error syncing existing data:', error);
    }
  }
});
