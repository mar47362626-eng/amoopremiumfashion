const ADMIN_API = '';
let adminSession = null;

// Initialize Supabase Client
async function initializeSupabase() {
  try {
    // Fetch config from backend
    const response = await fetch(`${ADMIN_API}/api/config`);
    if (response.ok) {
      const { supabaseUrl, supabaseAnonKey } = await response.json();
      
      // Check if Supabase module has createClient method
      if (!window.supabase?.createClient) {
        console.warn('⏳ Waiting for Supabase library to load...');
        setTimeout(initializeSupabase, 500);
        return;
      }
      
      // Create Supabase client instance and store it
      const { createClient } = window.supabase;
      window.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Create a wrapper for backward compatibility
      window.supabase = {
        ...window.supabase,
        from: window.supabaseClient.from.bind(window.supabaseClient),
        select: window.supabaseClient.select?.bind(window.supabaseClient)
      };
      
      console.log('✅ Supabase client initialized in admin');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Supabase in admin:', error);
  }
}

// Initialize Supabase when script loads
initializeSupabase();


// DOM Elements
const authModal = document.getElementById('auth-modal');
const registerModal = document.getElementById('register-modal');
const adminLoginForm = document.getElementById('admin-login-form');
const adminRegisterForm = document.getElementById('admin-register-form');
const switchToRegisterBtn = document.getElementById('switch-to-register');
const switchToLoginBtn = document.getElementById('switch-to-login');
const logoutBtn = document.querySelector('[data-logout]');
const adminNameEl = document.getElementById('admin-name');
const adminEmailEl = document.getElementById('admin-email');
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const productsListEl = document.getElementById('products-list');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const productModalTitle = document.getElementById('product-modal-title');
const productModalClose = document.getElementById('product-modal-close');
const productModalCancel = document.getElementById('product-modal-cancel');
const orderDetailsModal = document.getElementById('order-details-modal');
const orderDetailsClose = document.getElementById('order-details-close');
const orderDetailsCloseBtn = document.getElementById('order-details-close-btn');
const orderDetailsContent = document.getElementById('order-details-content');
const orderDetailsTitle = document.getElementById('order-details-title');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const adminSidebar = document.querySelector('.admin-sidebar');
const analyticsContainer = document.querySelector('.analytics-container');

let productsCache = [];
let editingProductId = null;
let ordersCache = [];

// Page titles
const pageTitles = {
  dashboard: { title: 'AMOO STORE Dashboard', subtitle: 'Welcome to AMOO STORE Management' },
  products: { title: 'AMOO STORE Products', subtitle: 'Manage your fashion collection' },
  customers: { title: 'AMOO STORE Customers', subtitle: 'Manage all customers' },
  orders: { title: 'AMOO STORE Orders', subtitle: 'Track and manage orders' },
  inventory: { title: 'AMOO STORE Inventory', subtitle: 'Monitor stock levels' },
  analytics: { title: 'AMOO STORE Analytics', subtitle: 'View sales reports' },
  messages: { title: 'AMOO STORE Messages', subtitle: 'Send messages to customers' },
  riders: { title: 'AMOO STORE Riders', subtitle: 'Manage delivery riders' },
  settings: { title: 'AMOO STORE Settings', subtitle: 'Store and account settings' }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAdminSession();
  setupEventListeners();
  loadDashboard();
});

function checkAdminSession() {
  const stored = localStorage.getItem('adminSession');
  if (stored) {
    adminSession = JSON.parse(stored);
    showDashboard();
  } else {
    showAuthModal();
  }
}

function setupEventListeners() {
  // Auth forms
  adminLoginForm.addEventListener('submit', handleLogin);
  adminRegisterForm.addEventListener('submit', handleRegister);
  switchToRegisterBtn.addEventListener('click', () => {
    authModal.hidden = true;
    registerModal.hidden = false;
  });
  switchToLoginBtn.addEventListener('click', () => {
    registerModal.hidden = true;
    authModal.hidden = false;
  });

  // Sidebar navigation
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateToPage(page);
      closeSidebar();
    });
  });

  // Logout
  logoutBtn.addEventListener('click', handleLogout);

  // Sidebar menu toggle
  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // Product management
  document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
  productsListEl.addEventListener('click', handleProductAction);
  productForm.addEventListener('submit', saveProductChanges);
  productModalClose.addEventListener('click', closeProductModal);
  productModalCancel.addEventListener('click', closeProductModal);

  // Order details modal
  orderDetailsClose.addEventListener('click', closeOrderDetailsModal);
  orderDetailsCloseBtn.addEventListener('click', closeOrderDetailsModal);
  orderDetailsModal.addEventListener('click', (e) => {
    if (e.target === orderDetailsModal) closeOrderDetailsModal();
  });
}

function toggleSidebar() {
  const isOpen = adminSidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible', isOpen);
}

function closeSidebar() {
  adminSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

async function handleLogin(e) {
  e.preventDefault();
  const formData = new FormData(adminLoginForm);
  const email = formData.get('email');
  const password = formData.get('password');

  // Debug: Log the form data being sent
  console.log('🔐 Login attempt:', { email, password: '***' });

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  try {
    const response = await fetch(`${ADMIN_API}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log(`📊 Login response status: ${response.status}`, data);

    if (response.ok) {
      adminSession = { email, name: data.name, id: data.id };
      localStorage.setItem('adminSession', JSON.stringify(adminSession));
      adminLoginForm.reset();
      showDashboard();
    } else {
      console.error('❌ Login failed:', { status: response.status, error: data.error });
      alert(`Login failed (${response.status}): ${data.error || 'Invalid email or password'}`);
    }
  } catch (error) {
    console.error('❌ Login connection error:', error);
    alert('Connection error. Check if backend is running at ' + ADMIN_API);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const formData = new FormData(adminRegisterForm);
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  // Debug: Log the form data being sent
  console.log('📝 Register attempt:', { name, email, password: '***' });

  if (!name || !email || !password) {
    alert('Please fill in all fields: name, email, and password');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }

  try {
    const response = await fetch(`${ADMIN_API}/api/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    console.log(`📊 Register response status: ${response.status}`, data);

    if (response.ok) {
      document.getElementById('register-message').textContent = '✓ Account created! Please log in.';
      setTimeout(() => {
        registerModal.hidden = true;
        authModal.hidden = false;
        adminRegisterForm.reset();
        document.getElementById('register-message').textContent = '';
      }, 1500);
    } else {
      console.error('❌ Register failed:', { status: response.status, error: data.error });
      alert(`Registration failed (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Register connection error:', error);
    alert('Connection error. Check if backend is running at ' + ADMIN_API);
  }
}

function handleLogout() {
  adminSession = null;
  localStorage.removeItem('adminSession');
  authModal.hidden = false;
  registerModal.hidden = true;
  adminLoginForm.reset();
  document.querySelector('.admin-container').style.display = 'none';
}

function showAuthModal() {
  authModal.hidden = false;
  registerModal.hidden = true;
  document.querySelector('.admin-container').style.display = 'none';
}

function showDashboard() {
  authModal.hidden = true;
  registerModal.hidden = true;
  document.querySelector('.admin-container').style.display = 'grid';
  updateAdminInfo();
}

function updateAdminInfo() {
  if (adminSession) {
    adminNameEl.textContent = adminSession.name;
    adminEmailEl.textContent = adminSession.email;
  }
}

function navigateToPage(page) {
  // Update active nav link
  navLinks.forEach((link) => link.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  // Show active page
  pageSections.forEach((section) => section.classList.remove('active'));
  document.querySelector(`[data-page="${page}"].page-section`).classList.add('active');

  // Update header
  const pageInfo = pageTitles[page];
  pageTitle.textContent = pageInfo.title;
  pageSubtitle.textContent = pageInfo.subtitle;

  // Load page-specific data
  loadPageData(page);
}

async function loadPageData(page) {
  switch (page) {
    case 'products':
      await loadProducts();
      break;
    case 'customers':
      await loadCustomers();
      break;
    case 'orders':
      await loadOrders();
      break;
    case 'inventory':
      await loadInventory();
      break;
    case 'analytics':
      await loadAnalytics();
      break;
    case 'messages':
      await loadCustomers();
      break;
    case 'riders':
      await loadRiders();
      break;
  }
}

async function loadDashboard() {
  try {
    // Load products
    const productsRes = await fetch(`${ADMIN_API}/api/products`);
    const products = productsRes.ok ? await productsRes.json() : [];
    document.getElementById('total-products').textContent = products.length;

    // Load users
    const usersRes = await fetch(`${ADMIN_API}/api/users`);
    const users = usersRes.ok ? await usersRes.json() : [];
    document.getElementById('total-customers').textContent = users.length;

    // Load orders and revenue
    const ordersRes = await fetch(`${ADMIN_API}/api/orders`);
    const orders = ordersRes.ok ? await ordersRes.json() : [];
    const totalOrders = Array.isArray(orders) ? orders.length : 0;
    const revenue = Array.isArray(orders)
      ? orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
      : 0;

    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = `NGN ${revenue.toLocaleString()}`;
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadAnalytics() {
  if (!analyticsContainer) return;

  analyticsContainer.innerHTML = '<p>Loading analytics...</p>';

  try {
    const [ordersRes, productsRes, usersRes] = await Promise.all([
      fetch(`${ADMIN_API}/api/orders`),
      fetch(`${ADMIN_API}/api/products`),
      fetch(`${ADMIN_API}/api/users`)
    ]);

    const orders = ordersRes.ok ? await ordersRes.json() : [];
    const products = productsRes.ok ? await productsRes.json() : [];
    const users = usersRes.ok ? await usersRes.json() : [];

    const totalOrders = Array.isArray(orders) ? orders.length : 0;
    const totalRevenue = Array.isArray(orders)
      ? orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
      : 0;
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const statusCounts = orders.reduce((counts, order) => {
      const status = (order.status || 'pending').toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    const topProducts = {};
    if (Array.isArray(orders)) {
      orders.forEach((order) => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const name = item.productName || item.product_name || 'Unknown product';
            const quantity = Number(item.quantity) || 0;
            topProducts[name] = (topProducts[name] || 0) + quantity;
          });
        }
      });
    }

    const topProductsList = Object.entries(topProducts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const categoryCounts = products.reduce((counts, product) => {
      const category = product.category || 'Uncategorized';
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});

    const categoryList = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    analyticsContainer.innerHTML = `
      <div class="analytics-grid">
        <article class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <p class="stat-label">Total Orders</p>
            <strong class="stat-value">${totalOrders}</strong>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <p class="stat-label">Total Revenue</p>
            <strong class="stat-value">NGN ${totalRevenue.toLocaleString()}</strong>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <p class="stat-label">Average Order Value</p>
            <strong class="stat-value">NGN ${averageOrderValue.toFixed(2)}</strong>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <p class="stat-label">Total Customers</p>
            <strong class="stat-value">${Array.isArray(users) ? users.length : 0}</strong>
          </div>
        </article>
      </div>
      <div class="analytics-section">
        <h3>Order Status Breakdown</h3>
        <div class="analytics-breakdown">
          <div class="breakdown-item"><strong>${statusCounts.pending || 0}</strong><span>Pending</span></div>
          <div class="breakdown-item"><strong>${statusCounts.accepted || 0}</strong><span>Accepted</span></div>
          <div class="breakdown-item"><strong>${statusCounts.shipped || 0}</strong><span>Shipped</span></div>
          <div class="breakdown-item"><strong>${statusCounts.delivered || 0}</strong><span>Delivered</span></div>
        </div>
      </div>
      <div class="analytics-section">
        <h3>Top Selling Products</h3>
        <div class="top-products-list">
          ${topProductsList.length > 0 ? topProductsList.map(([name, count], index) => `
            <div class="top-product-item">
              <span>${index + 1}. ${name}</span>
              <strong>${count}</strong>
            </div>
          `).join('') : '<p>No product sales data available yet.</p>'}
        </div>
      </div>
      <div class="analytics-section">
        <h3>Active Product Categories</h3>
        <div class="category-list">
          ${categoryList.length > 0 ? categoryList.map(([category, count]) => `
            <div class="category-item">
              <span>${category}</span>
              <strong>${count}</strong>
            </div>
          `).join('') : '<p>No categories found.</p>'}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading analytics:', error);
    analyticsContainer.innerHTML = '<p>Error loading analytics. Check backend connectivity.</p>';
  }
}

async function loadProducts() {
  try {
    console.log('📦 Fetching products from Supabase...');
    const response = await fetch(`${ADMIN_API}/api/products`);
    const products = await response.json();
    const list = document.getElementById('products-list');

    if (products.length === 0) {
      list.innerHTML = '<p>No products found</p>';
      console.warn('⚠️ No products in Supabase');
      return;
    }

    productsCache = products;
    console.log(`✅ Loaded ${products.length} products from Supabase`);
    list.innerHTML = products
      .map(
        (product) => `
      <div class="product-card">
        <img class="product-image" src="${product.image}" alt="${product.name}" />
        <div class="product-details">
          <div class="product-top">
            <h3>${product.name}</h3>
            <span class="product-price">NGN ${product.price.toLocaleString()}</span>
          </div>
          <div class="product-meta">
            <span>📁 ${product.category}</span>
            <span>🏷️ ${product.tag}</span>
          </div>
          <p class="product-description">${product.description}</p>
          <div class="product-actions">
            <button class="btn btn-secondary edit-product-btn" data-id="${product.id}">Edit</button>
            <button class="btn btn-danger delete-product-btn" data-id="${product.id}">Delete</button>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('❌ Error loading products from Supabase:', error);
    document.getElementById('products-list').innerHTML = '<p>Error loading products</p>';
  }
}

function openProductModal(product = null) {
  editingProductId = product ? product.id : null;
  productModalTitle.textContent = product ? 'Edit Product' : 'Add Product';
  productForm.reset();

  if (product) {
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-tag').value = product.tag;
    document.getElementById('product-image').value = product.image;
    document.getElementById('product-description').value = product.description;
  }

  productModal.hidden = false;
}

function closeProductModal() {
  productModal.hidden = true;
  productForm.reset();
  editingProductId = null;
}

async function handleProductAction(event) {
  const editBtn = event.target.closest('.edit-product-btn');
  const deleteBtn = event.target.closest('.delete-product-btn');
  
  if (editBtn) {
    const productId = editBtn.dataset.id;
    const product = productsCache.find((item) => item.id === productId);
    if (product) {
      openProductModal(product);
    }
  } else if (deleteBtn) {
    const productId = deleteBtn.dataset.id;
    const product = productsCache.find((item) => item.id === productId);
    
    if (product && confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        const response = await fetch(`${ADMIN_API}/api/products/${encodeURIComponent(productId)}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          alert('Product deleted successfully.');
          await loadProducts();
        } else {
          const result = await response.json();
          alert(result.error || 'Failed to delete product.');
        }
      } catch (error) {
        console.error('Product delete error:', error);
        alert('Connection error. Check if backend is running.');
      }
    }
  }
}

async function saveProductChanges(event) {
  event.preventDefault();

  const formData = new FormData(productForm);
  const productData = {
    name: formData.get('name'),
    category: formData.get('category'),
    price: parseFloat(formData.get('price')),
    tag: formData.get('tag'),
    image: formData.get('image'),
    description: formData.get('description')
  };

  if (!productData.name || !productData.category || !productData.image || isNaN(productData.price)) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const url = editingProductId ? `${ADMIN_API}/api/products/${encodeURIComponent(editingProductId)}` : `${ADMIN_API}/api/products`;
    const method = editingProductId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const rawText = await response.text();
    let result = {};
    try {
      result = rawText ? JSON.parse(rawText) : {};
    } catch (jsonError) {
      console.error('Invalid JSON response from server:', rawText);
      alert('Server returned an unexpected response. Check backend logs.');
      return;
    }

    if (!response.ok) {
      alert(result.error || rawText || 'Could not save product.');
      return;
    }

    closeProductModal();
    await loadProducts();
    await loadDashboard();
    alert(editingProductId ? 'Product saved successfully.' : 'Product added successfully.');
  } catch (error) {
    console.error('Product save error:', error);
    alert('Connection error. Check if backend is running.');
  }
}

async function loadOrders() {
  try {
    // Fetch orders from Supabase (latest data with status from admin)
    const response = await fetch(`${ADMIN_API}/api/orders-from-supabase`);
    
    let orders = [];
    if (response.ok) {
      const data = await response.json();
      orders = data.orders || [];
      console.log('✅ Orders fetched from Supabase:', orders.length);
    } else {
      // Fallback to local API if Supabase fetch fails
      console.log('⚠️ Supabase fetch failed, using local API');
      const localResponse = await fetch(`${ADMIN_API}/api/orders`);
      orders = await localResponse.json();
    }

    const list = document.getElementById('orders-list');

    if (!orders || orders.length === 0) {
      list.innerHTML = '<p>No orders yet</p>';
      document.getElementById('total-orders').textContent = '0';
      return;
    }

    ordersCache = orders;
    document.getElementById('total-orders').textContent = orders.length;
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById('total-revenue').textContent = `₦${totalRevenue.toLocaleString()}`;

    list.innerHTML = orders.map(order => renderAdminOrderCard(order)).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
    document.getElementById('orders-list').innerHTML = '<p>Error loading orders</p>';
  }
}

function renderAdminOrderCard(order) {
  const createdDate = new Date(order.created_at || order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Format delivery date
  const deliveryDate = order.delivery_date || order.deliveryDate;
  const formattedDeliveryDate = deliveryDate 
    ? new Date(deliveryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Not set';

  const customerName = order.customer_name || order.customerName || 'Customer';
  const customerEmail = order.customer_email || order.customerEmail || '';
  const phone = order.phone || '';
  const total = order.total || 0;
  const itemCount = order.items ? order.items.length : 0;

  return `
    <div class="admin-order-card">
      <div class="order-header-admin">
        <div>
          <strong>Order #${order.id}</strong>
          <span class="order-status-badge" data-status="${order.status}">${order.status.toUpperCase()}</span>
        </div>
        <div class="order-date">${createdDate}</div>
      </div>
      <div class="order-customer-info">
        <strong>${customerName}</strong>
        <span>${customerEmail}</span>
        <span>${phone}</span>
      </div>
      <div class="order-items-count">
        <strong>${itemCount}</strong> item${itemCount > 1 ? 's' : ''} - <strong>₦${total.toLocaleString()}</strong>
      </div>
      <div class="delivery-date-info" style="padding: 8px 0; border-top: 1px solid #e0e0e0; margin: 8px 0; font-size: 13px;">
        <strong>📦 Est. Delivery:</strong> ${formattedDeliveryDate}
      </div>
      <div class="order-actions">
        <button class="btn btn-small btn-accept" onclick="updateOrderStatus(${order.id}, 'accepted')">✓ Accept</button>
        <button class="btn btn-small btn-shipped" onclick="updateOrderStatus(${order.id}, 'shipped')">📦 Shipped</button>
        <button class="btn btn-small btn-delivered" onclick="updateOrderStatus(${order.id}, 'delivered')">✔ Delivered</button>
        <button class="btn btn-small btn-view" onclick="viewOrderDetails(${order.id})">👁 View</button>
        <button class="btn btn-small btn-sync" onclick="syncOrderStatus(${order.id})">🔄 Sync</button>
      </div>
    </div>
  `;
}

async function updateOrderStatus(orderId, status) {
  try {
    // Update in Supabase (preferred)
    const response = await fetch(`${ADMIN_API}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Order updated in Supabase:', orderId, '→', status);
      
      // If status is "shipped", notify riders (order becomes available for pickup)
      if (status === 'shipped') {
        console.log('📢 Broadcasting order to available riders:', orderId);
        // Trigger notification to all online riders
        try {
          await fetch(`${ADMIN_API}/api/notify-riders-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
          }).catch(e => console.warn('Could not notify riders:', e.message));
        } catch (error) {
          console.warn('Rider notification failed (non-critical):', error);
        }
      }
      
      alert(`✅ Order #${orderId} updated to ${status.toUpperCase()}${status === 'shipped' ? '\n✓ Riders notified!' : ''}`);
      loadOrders();
      loadDashboard();
    } else {
      const error = await response.json();
      console.error('❌ Error updating order:', error);
      alert(`❌ Failed to update order: ${error.error}`);
    }
  } catch (error) {
    console.error('❌ Error updating order:', error);
    alert('❌ Connection error. Check if backend is running.');
  }
}

// Sync order status from Supabase
async function syncOrderStatus(orderId) {
  try {
    const response = await fetch(`${ADMIN_API}/api/orders/${orderId}/sync-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Order status synced from Supabase:', orderId, '→', data.status);
      alert(`✅ Order synced! Latest status: ${data.status.toUpperCase()}`);
      loadOrders();
    } else {
      const error = await response.json();
      alert(`⚠️ ${error.error}`);
    }
  } catch (error) {
    console.error('❌ Error syncing order:', error);
    alert('❌ Sync failed. Check if backend is running.');
  }
}

function viewOrderDetails(orderId) {
  const order = ordersCache.find(o => o.id == orderId);
  if (!order) {
    alert('Order not found');
    return;
  }

  orderDetailsTitle.textContent = `Order #${order.id}`;
  
  const createdDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  let itemsHTML = order.items.map(item => {
    // Try to get image: first from stored productImage, then try to fetch product data
    let imageUrl = item.productImage || '';
    const imageHtml = imageUrl 
      ? `<img src="${imageUrl}" alt="${item.productName}" class="item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%2312192d%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2240%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📦%3C/text%3E%3C/svg%3E'">` 
      : `<div class="item-image-placeholder">📦</div>`;

    return `
      <div class="order-detail-item">
        <div class="item-image-container">
          ${imageUrl ? imageHtml : '<div class="item-image-placeholder">📦</div>'}
        </div>
        <div class="item-details">
          <strong>${item.productName}</strong>
          <p class="item-quantity">Quantity: ${item.quantity}</p>
          <p class="item-price">₦${item.price.toLocaleString()} each</p>
          <p class="item-total">Total: ₦${(item.price * item.quantity).toLocaleString()}</p>
        </div>
      </div>
    `;
  }).join('');

  orderDetailsContent.innerHTML = `
    <div class="order-info-grid">
      <div class="info-section">
        <h4>Order Information</h4>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${createdDate}</p>
        <p><strong>Status:</strong> <span class="order-status-badge" data-status="${order.status}">${order.status.toUpperCase()}</span></p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : order.paymentMethod}</p>
        ${order.delivery_date || order.deliveryDate ? `<p><strong>📦 Est. Delivery Date:</strong> ${new Date(order.delivery_date || order.deliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
      </div>
      <div class="info-section">
        <h4>Customer Information</h4>
        <p><strong>Name:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.customerEmail}</p>
        <p><strong>Phone:</strong> ${order.phone}</p>
        <p><strong>Address:</strong> ${order.address}</p>
      </div>
    </div>

    <div class="order-items-section">
      <h4>Items Ordered</h4>
      <div class="order-detail-items">
        ${itemsHTML}
      </div>
    </div>

    <div class="order-summary-section">
      <div class="summary-row">
        <span>Subtotal:</span>
        <strong>₦${order.subtotal.toLocaleString()}</strong>
      </div>
      <div class="summary-row">
        <span>Delivery Fee:</span>
        <strong>₦${order.delivery.toLocaleString()}</strong>
      </div>
      <div class="summary-row total">
        <span>Total:</span>
        <strong>₦${order.total.toLocaleString()}</strong>
      </div>
    </div>
  `;

  orderDetailsModal.removeAttribute('hidden');
}

function closeOrderDetailsModal() {
  orderDetailsModal.setAttribute('hidden', '');
  orderDetailsContent.innerHTML = '';
}

async function loadInventory() {
  try {
    const response = await fetch(`${ADMIN_API}/api/products`);
    const products = await response.json();
    const list = document.getElementById('inventory-list');

    if (products.length === 0) {
      list.innerHTML = '<p>No products in inventory</p>';
      return;
    }

    list.innerHTML = products
      .map(
        (product) => `
      <div class="item-card">
        <h3>${product.name}</h3>
        <div class="item-meta">
          <span>📦 Stock: ${Math.floor(Math.random() * 100)} units</span>
          <span>📈 ${product.tag}</span>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading inventory:', error);
    document.getElementById('inventory-list').innerHTML = '<p>Error loading inventory</p>';
  }
}

// Load all customers for messaging
async function loadCustomers() {
  try {
    const response = await fetch(`${ADMIN_API}/api/users`);
    const users = await response.json();
    displayCustomersList(users);
  } catch (error) {
    console.error('Error loading customers:', error);
    const customersListEl = document.getElementById('customers-list');
    const messagesCustomersListEl = document.getElementById('messages-customers-list');
    if (customersListEl) customersListEl.innerHTML = '<p>Error loading customers</p>';
    if (messagesCustomersListEl) messagesCustomersListEl.innerHTML = '<p>Error loading customers</p>';
  }
}

function displayCustomersList(users) {
  const customersList = document.getElementById('customers-list');
  const messagesCustomersList = document.getElementById('messages-customers-list');
  const list = customersList || messagesCustomersList;
  
  if (!users || users.length === 0) {
    list.innerHTML = '<p style="color: #999; text-align: center;">No registered customers</p>';
    return;
  }

  // Extract valid emails for messaging
  const validEmails = users
    .map(user => user.email)
    .filter(email => email && email.includes('@'));

  const validPhones = users
    .map(user => user.phone)
    .filter(phone => phone && phone.trim().length > 0);

  if (validEmails.length === 0 && validPhones.length === 0) {
    list.innerHTML = '<p style="color: #999; text-align: center;">No customer contacts found</p>';
    return;
  }

  // Display customers with name, email, and phone
  const htmlContent = `
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
      <strong style="color: #333;">👥 Total Customers: ${users.length}</strong><br/>
      <small style="color: #666;">📧 ${validEmails.length} emails | 📱 ${validPhones.length} phone numbers</small>
    </div>
    ${users
      .map(
        (user) => `
      <div style="padding: 12px; background: white; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px;">
        <div style="color: #333; font-weight: bold; margin-bottom: 5px;">👤 ${user.name || 'N/A'}</div>
        <div style="color: #666; font-size: 13px; margin-bottom: 3px;">📧 ${user.email || 'N/A'}</div>
        <div style="color: #666; font-size: 13px;">📱 ${user.phone || 'N/A'}</div>
      </div>
    `
      )
      .join('')}
  `;

  // Update both lists if they exist
  if (customersList) customersList.innerHTML = htmlContent;
  if (messagesCustomersList) messagesCustomersList.innerHTML = htmlContent;

  // Store emails and phones for message sending
  window.customerEmails = validEmails;
  window.customerPhones = validPhones;
  console.log(`✅ Loaded ${validEmails.length} customer emails and ${validPhones.length} phone numbers for messaging`);
}

// Handle message form submission
document.getElementById('send-message-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if ((!window.customerEmails || window.customerEmails.length === 0) && 
      (!window.customerPhones || window.customerPhones.length === 0)) {
    showMessageError('No customers to send message to');
    return;
  }

  const subject = document.getElementById('msg-subject').value;
  const message = document.getElementById('msg-content').value;

  if (!subject || !message) {
    showMessageError('Please fill in subject and message');
    return;
  }

  const totalRecipients = (window.customerEmails?.length || 0) + (window.customerPhones?.length || 0);
  const confirmSend = confirm(
    `Send this message to ${totalRecipients} customer(s)?\n\nEmails: ${window.customerEmails?.length || 0}\nPhone numbers: ${window.customerPhones?.length || 0}\n\nSubject: ${subject}`
  );

  if (!confirmSend) return;

  showMessageLoading(true);
  hideMessageMessages();

  try {
    const response = await fetch(`${ADMIN_API}/api/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: window.customerEmails || [],
        phones: window.customerPhones || [],
        subject,
        message,
        senderName: 'Amoo Store',
        senderEmail: adminSession?.email || 'amoostore5@gmail.com'
      })
    });

    if (response.ok) {
      const result = await response.json();
      let successMsg = `✅ ${result.message}`;
      if (result.emailsSent !== undefined && result.smsSent !== undefined) {
        successMsg = `✅ Message sent: ${result.emailsSent} emails, ${result.smsSent} SMS${result.failedCount > 0 ? `, ${result.failedCount} failed` : ''}`;
      }
      showMessageSuccess(successMsg);
      document.getElementById('send-message-form').reset();
    } else {
      const error = await response.json();
      showMessageError(error.error || 'Failed to send message');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    showMessageError('Connection error. Please try again.');
  } finally {
    showMessageLoading(false);
  }
});

function showMessageSuccess(msg) {
  const el = document.getElementById('message-success');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

function showMessageError(msg) {
  const el = document.getElementById('message-error');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

function hideMessageMessages() {
  document.getElementById('message-success').style.display = 'none';
  document.getElementById('message-error').style.display = 'none';
}

function showMessageLoading(show) {
  const btn = document.querySelector('#send-message-form button[type="submit"]');
  btn.disabled = show;
  btn.textContent = show ? '⏳ Sending...' : '📤 Send Message to All Customers';
}

// ========================================
// RIDERS MANAGEMENT
// ========================================

async function loadRiders() {
  try {
    const response = await fetch(`${ADMIN_API}/api/riders`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const riders = await response.json();
      console.log('✅ Riders loaded from Supabase:', riders.length);
      displayRiders(riders);
    } else {
      const error = await response.json();
      console.error('❌ Error loading riders:', error);
      document.getElementById('riders-list').innerHTML = `<p style="color: red;">❌ ${error.error || 'Failed to load riders'}</p>`;
    }
  } catch (error) {
    console.error('❌ Error loading riders:', error);
    document.getElementById('riders-list').innerHTML = `<p style="color: red;">❌ Connection error. Check if backend is running.</p>`;
  }
}

async function displayRiders(riders) {
  if (!riders || riders.length === 0) {
    document.getElementById('riders-list').innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No riders registered yet</p>';
    return;
  }

  // Wait for Supabase to be initialized
  let attempts = 0;
  while ((!window.supabase || !window.supabase.from) && attempts < 20) {
    await new Promise(resolve => setTimeout(resolve, 250));
    attempts++;
  }

  if (!window.supabase || typeof window.supabase.from !== 'function') {
    console.error('❌ Supabase not initialized, cannot fetch completed orders');
    document.getElementById('riders-list').innerHTML = '<p style="color: red;">❌ Unable to load rider data. Please refresh the page.</p>';
    return;
  }

  const ridersList = document.getElementById('riders-list');
  ridersList.innerHTML = '';

  for (const rider of riders) {
    // Fetch completed orders count from delivery_orders table
    let completedOrdersCount = 0;
    try {
      const { data: completedOrders } = await window.supabase
        .from('delivery_orders')
        .select('id')
        .eq('rider_id', rider.id)
        .eq('status', 'delivered');
      
      completedOrdersCount = completedOrders ? completedOrders.length : 0;
    } catch (error) {
      console.error(`Error fetching completed orders for rider ${rider.id}:`, error);
      completedOrdersCount = rider.total_deliveries || 0;
    }

    const riderCard = document.createElement('div');
    riderCard.style.cssText = `
      background: white;
      border-left: 4px solid ${rider.is_online ? '#28a745' : '#999'};
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    const onlineStatus = rider.is_online 
      ? '<span style="color: #28a745; font-weight: bold;">🟢 ONLINE</span>'
      : '<span style="color: #999; font-weight: bold;">⚫ OFFLINE</span>';

    const vehicleIcon = rider.vehicle_type === 'Motorcycle' ? '🏍️' :
                       rider.vehicle_type === 'Car' ? '🚗' :
                       rider.vehicle_type === 'Van' ? '🚐' :
                       '🚲';

    riderCard.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px;">
        <div>
          <strong>${vehicleIcon} ${rider.name}</strong><br>
          <small style="color: #666;">📧 ${rider.email}</small><br>
          <small style="color: #666;">📱 ${rider.phone}</small>
        </div>
        <div>
          <strong>Status:</strong> ${onlineStatus}<br>
          <strong>Rating:</strong> ⭐ ${rider.rating}/5.0<br>
          <strong>Completed Orders:</strong> ${completedOrdersCount} total
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border-top: 1px solid #eee; padding-top: 12px;">
        <div>
          <strong>Vehicle:</strong> ${rider.vehicle_type} (${rider.license_plate})<br>
          <strong>Joined:</strong> ${new Date(rider.join_date).toLocaleDateString()}
        </div>
        <div>
          <strong>This Month Earnings:</strong> NGN ${parseFloat(rider.month_earnings).toLocaleString('en-NG')}<br>
          <strong>Total Earnings:</strong> NGN ${parseFloat(rider.total_earnings).toLocaleString('en-NG')}
        </div>
      </div>
      <div style="margin-top: 12px; text-align: right;">
        <button class="btn btn-small" onclick="viewRiderDetails('${rider.id}')">👁️ View Details</button>
        <button class="btn btn-small" onclick="toggleRiderStatus('${rider.id}', ${rider.is_online})" style="background: ${rider.is_online ? '#dc3545' : '#28a745'};">
          ${rider.is_online ? '🔴 Set Offline' : '🟢 Set Online'}
        </button>
      </div>
    `;
    ridersList.appendChild(riderCard);
  }
}

async function viewRiderDetails(riderId) {
  try {
    const response = await fetch(`${ADMIN_API}/api/riders/${riderId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const rider = await response.json();
      const details = `
        👤 RIDER DETAILS
        ================
        Name: ${rider.name}
        Email: ${rider.email}
        Phone: ${rider.phone}
        Vehicle: ${rider.vehicle_type} (${rider.license_plate})
        
        💰 FINANCIAL INFO
        =================
        Bank: ${rider.bank_name}
        Account: ${rider.account_number}
        Account Name: ${rider.account_name}
        
        📊 STATISTICS
        ==============
        Total Deliveries: ${rider.total_deliveries}
        This Month: ${rider.month_deliveries}
        Rating: ${rider.rating}/5.0
        Total Earnings: NGN ${parseFloat(rider.total_earnings).toLocaleString('en-NG')}
        This Month Earnings: NGN ${parseFloat(rider.month_earnings).toLocaleString('en-NG')}
        Status: ${rider.is_online ? 'ONLINE 🟢' : 'OFFLINE ⚫'}
      `;
      alert(details);
    } else {
      alert('❌ Failed to load rider details');
    }
  } catch (error) {
    console.error('Error viewing rider details:', error);
    alert('❌ Connection error');
  }
}

async function toggleRiderStatus(riderId, currentStatus) {
  try {
    const response = await fetch(`${ADMIN_API}/api/rider/${riderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: !currentStatus })
    });

    if (response.ok) {
      alert(`✅ Rider status updated to ${!currentStatus ? 'ONLINE' : 'OFFLINE'}`);
      loadRiders();
    } else {
      const error = await response.json();
      alert(`❌ ${error.error || 'Failed to update rider status'}`);
    }
  } catch (error) {
    console.error('Error updating rider status:', error);
    alert('❌ Connection error');
  }
}

// Load riders when navigating to riders page
document.addEventListener('DOMContentLoaded', () => {
  // Add this to loadPageData function for riders
  const originalLoadPageData = window.loadPageData;
  window.loadPageData = async function(page) {
    if (page === 'riders') {
      await loadRiders();
    } else if (originalLoadPageData) {
      return originalLoadPageData(page);
    }
  };
});
