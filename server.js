require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { sendUserRegistrationEmail, sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendAdminRegistrationEmail, sendCustomerMessageEmail, sendAdminOrderNotification, sendAdminMessageNotification } = require('./emailService');
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
