// Get orders for the logged-in customer
const ordersList = document.querySelector('[data-orders-list]');
const ordersEmpty = document.querySelector('[data-orders-empty]');

async function fetchCustomerOrders() {
  if (!isSignedIn() || !accountProfile) {
    ordersList.innerHTML = '<div class="orders-alert"><strong>Please log in to view your orders.</strong><a href="index.html" class="button button-primary">Go to home</a></div>';
    return;
  }

  try {
    // Show loading state
    ordersList.innerHTML = '<div class="orders-alert"><strong>Loading your orders...</strong></div>';
    
    console.log('📋 Fetching orders from Supabase for:', accountProfile.email);
    
    // Fetch from Supabase directly using customer email
    const { data: orders, error } = await window.supabase
      .from('orders')
      .select('*')
      .eq('customerEmail', accountProfile.email)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching orders from Supabase:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No orders found for user:', accountProfile.email);
      ordersEmpty.removeAttribute('hidden');
      ordersList.innerHTML = '';
      return;
    }

    console.log(`✅ Found ${orders.length} orders for user:`, accountProfile.email);
    
    // Transform Supabase order format to match the UI format
    const formattedOrders = orders.map(order => ({
      id: order.id,
      status: order.status || 'pending',
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      phone: order.phone,
      address: order.address,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      delivery: order.delivery || 0,
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'unknown'
    }));

    ordersEmpty.setAttribute('hidden', '');
    ordersList.innerHTML = formattedOrders.map(order => renderOrderCard(order)).join('');
    
    // Attach refresh status listeners to all orders
    document.querySelectorAll('[data-refresh-order-status]').forEach(btn => {
      btn.addEventListener('click', () => refreshOrderStatus(btn.dataset.refreshOrderStatus));
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    ordersList.innerHTML = `<div class="orders-alert"><strong>Error loading orders:</strong> ${error.message}</div>`;
  }
}

// Fetch latest order status from Supabase
async function refreshOrderStatus(orderId) {
  try {
    console.log('🔄 Refreshing order status for:', orderId);
    
    // Fetch directly from Supabase
    const { data: order, error } = await window.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      console.error('❌ Error fetching order status:', error?.message || 'Order not found');
      alert('Unable to fetch latest status. Please try again.');
      return;
    }

    const updatedOrder = order;
    console.log('✅ Latest order status from Supabase:', orderId, '→', updatedOrder.status);
    
    // Update the order card
    const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
    if (orderCard) {
      const statusElement = orderCard.querySelector('.order-status');
      const statusNoteElement = orderCard.querySelector('.order-status-note');
      
      if (statusElement) {
        statusElement.textContent = updatedOrder.status.toUpperCase();
        statusElement.style.backgroundColor = getStatusColor(updatedOrder.status);
      }
      
      if (statusNoteElement) {
        statusNoteElement.innerHTML = getStatusMessage(updatedOrder.status);
      }
      
      alert(`✅ Order status updated: ${updatedOrder.status.toUpperCase()}`);
    }
  } catch (error) {
    console.error('❌ Error refreshing order status:', error);
    alert('Error refreshing order status. Please try again.');
  }
}

// Get status message based on status
function getStatusMessage(status) {
  const messages = {
    pending: '<p style="color: var(--accent-3)">⏳ Your order is pending admin approval. We will notify you soon.</p>',
    accepted: '<p style="color: var(--accent-2)">✓ Your order has been accepted! Prepare for shipment.</p>',
    shipped: '<p style="color: var(--accent-2)">📦 Your order has shipped! Check for updates.</p>',
    delivered: '<p style="color: var(--accent-2)">🎉 Your order has been delivered!</p>'
  };
  return messages[status] || '<p>Unknown status</p>';
}

function renderOrderCard(order) {
  const statusColor = getStatusColor(order.status);
  const createdDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <div class="order-card" data-order-id="${order.id}">
      <div class="order-header">
        <div class="order-info">
          <strong>Order #${order.id}</strong>
          <span class="order-status" style="background-color: ${statusColor}">${order.status.toUpperCase()}</span>
        </div>
        <div class="order-date">${createdDate}</div>
      </div>

      <div class="order-customer">
        <div class="order-section-title">Customer Details</div>
        <div class="customer-grid">
          <div><strong>Name:</strong> ${order.customerName}</div>
          <div><strong>Email:</strong> ${order.customerEmail}</div>
          <div><strong>Phone:</strong> ${order.phone}</div>
          <div><strong>Address:</strong> ${order.address}</div>
        </div>
      </div>

      <div class="order-products">
        <div class="order-section-title">Products Ordered</div>
        <div class="order-items">
          ${order.items.map(item => renderOrderItem(item)).join('')}
        </div>
      </div>

      <div class="order-summary">
        <div class="summary-row"><span>Subtotal</span><strong>₦${order.subtotal.toLocaleString()}</strong></div>
        <div class="summary-row"><span>Delivery</span><strong>₦${order.delivery.toLocaleString()}</strong></div>
        <div class="summary-row summary-total"><span>Total</span><strong>₦${order.total.toLocaleString()}</strong></div>
      </div>

      <div class="order-footer">
        <div><strong>Payment Method:</strong> ${order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : order.paymentMethod}</div>
        <div class="order-status-note">
          ${getStatusMessage(order.status)}
        </div>
        <button class="button button-secondary" type="button" data-refresh-order-status="${order.id}" style="margin-top: 12px;">🔄 Check Status</button>
      </div>
    </div>
  `;
}

function renderOrderItem(item) {
  // Use stored productImage if available, otherwise try to get from product
  let image = item.productImage;
  if (!image) {
    const product = getProduct(item.productId);
    image = product ? product.image : 'https://via.placeholder.com/100?text=No+Image';
  }

  return `
    <div class="order-item">
      <img src="${image}" alt="${item.productName}" loading="lazy" />
      <div class="order-item-details">
        <strong>${item.productName}</strong>
        <p>Quantity: ${item.quantity}</p>
        <p>Price: ₦${item.price.toLocaleString()} each</p>
      </div>
      <div class="order-item-subtotal">₦${(item.price * item.quantity).toLocaleString()}</div>
    </div>
  `;
}

function getStatusColor(status) {
  const colors = {
    pending: '#ff8fa3',
    accepted: '#7ed3c3',
    shipped: '#e2b46a',
    delivered: '#7ed3c3'
  };
  return colors[status] || '#b4b9ca';
}

// Load orders on page load
if (document.body.dataset.page === 'order') {
  // Wait for Supabase to be initialized
  async function waitForSupabase() {
    let attempts = 0;
    while ((!window.supabase || !window.supabase.from) && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 250));
      attempts++;
    }
    if (window.supabase && typeof window.supabase.from === 'function') {
      fetchCustomerOrders();
    } else {
      console.error('❌ Supabase client not properly initialized after waiting');
      console.error('window.supabase:', window.supabase);
      console.error('window.supabase.from:', window.supabase?.from);
    }
  }
  waitForSupabase();
}
