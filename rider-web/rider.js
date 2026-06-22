// ===== API BASE URL =====
const API_BASE = 'https://amoo-store-user-i18d.onrender.com';

// ===== RIDER DATA =====

let riderData = null;
let orders = [];
let acceptedOrders = [];
let completedOrders = [];
let currentDeliveryStatus = {};
let currentDeliveryCode = null;
let currentOrder = null;
let currentRiderOrderId = null;
let monthlyEarnings = 0;
let totalEarnings = 0;

function bindEvent(id, event, handler) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`bindEvent: element not found: ${id}`);
        return;
    }
    element.addEventListener(event, handler);
}

function bindIfExists(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const riderId = localStorage.getItem('riderId');
    const riderToken = localStorage.getItem('riderToken');
    
    // Hide both modals first
    document.getElementById('registrationModal').classList.remove('show');
    document.getElementById('loginModal').classList.remove('show');
    
    if (!riderId || !riderToken) {
        // No session - show registration modal
        showRegistrationModal();
    } else {
        // Session exists - load rider data and show dashboard
        loadRiderData();
        loadAvailableOrders();
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Registration
    bindEvent('registrationForm', 'submit', handleRegistration);

    // Login
    bindEvent('loginForm', 'submit', handleLogin);

    // Modal controls
    bindEvent('closeModal', 'click', closeOrderModal);
    bindEvent('closeDeliveryModal', 'click', closeDeliveryModal);
    bindEvent('closeCodeModal', 'click', closeCodeModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('orderModal')) closeOrderModal();
        if (event.target === document.getElementById('deliveryModal')) closeDeliveryModal();
        if (event.target === document.getElementById('codeModal')) closeCodeModal();
    });

    // Order modal actions
    bindEvent('acceptOrderModalBtn', 'click', acceptOrder);
    bindEvent('rejectOrderBtn', 'click', rejectOrder);

    // Delivery status modal
    bindEvent('updateStatusBtn', 'click', updateDeliveryStatus);
    bindIfExists('cancelStatusBtn', 'click', closeDeliveryModal);
    bindIfExists('status-arrived', 'change', showCodeSection);

    // Code verification
    bindEvent('verifyCodeBtn', 'click', verifyDeliveryCode);
    bindEvent('cancelCodeBtn', 'click', closeCodeModal);

    // Search and filter
    bindEvent('searchOrders', 'input', filterAvailableOrders);
    bindEvent('filterDate', 'change', filterCompletedOrders);

    // Profile
    bindEvent('editProfileBtn', 'click', editProfile);

    // Logout
    bindEvent('logoutBtn', 'click', logout);

    // Status toggle
    bindEvent('riderStatusToggle', 'click', toggleOnlineStatus);

    // Earnings card click - open withdrawal modal
    const earningsCard = document.getElementById('earningsCard');
    if (earningsCard) {
        earningsCard.addEventListener('click', openWithdrawalModal);
    }

    // Withdrawal modal controls
    document.getElementById('closeWithdrawalModal')?.addEventListener('click', closeWithdrawalModal);
    document.getElementById('cancelWithdrawalBtn')?.addEventListener('click', closeWithdrawalModal);
    document.getElementById('submitWithdrawalBtn')?.addEventListener('click', submitWithdrawal);
    document.getElementById('withdrawMaxBtn')?.addEventListener('click', withdrawMaxAmount);

    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('withdrawalModal')) closeWithdrawalModal();
    });

    // Registration and Login modal buttons
    const regCancelBtn = document.getElementById('regCancelBtn');
    if (regCancelBtn) {
        regCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registrationModal').classList.remove('show');
            document.getElementById('loginModal').classList.add('show');
        });
    }

    const loginCancelBtn = document.getElementById('loginCancelBtn');
    if (loginCancelBtn) {
        loginCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').classList.remove('show');
            document.getElementById('registrationModal').classList.add('show');
        });
    }

    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registrationModal').classList.remove('show');
            document.getElementById('loginModal').classList.add('show');
        });
    }

    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').classList.remove('show');
            document.getElementById('registrationModal').classList.add('show');
        });
    }
}

// ===== REGISTRATION =====
function showRegistrationModal() {
    document.getElementById('registrationModal').classList.add('show');
    document.getElementById('loginModal').classList.remove('show');
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const errorElement = document.getElementById('regError');
    const successElement = document.getElementById('regSuccess');
    const registrationForm = document.getElementById('registrationForm');
    
    errorElement.textContent = '';
    successElement.textContent = '';

    const formData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: document.getElementById('regPassword').value,
        confirmPassword: document.getElementById('regConfirmPassword').value,
        vehicleType: document.getElementById('regVehicleType').value,
        licensePlate: document.getElementById('regLicensePlate').value,
        bankName: document.getElementById('regBankName').value,
        accountNumber: document.getElementById('regAccountNumber').value,
        accountName: document.getElementById('regAccountName').value
    };

    // Validation
    if (formData.password !== formData.confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        return;
    }

    if (formData.password.length < 6) {
        errorElement.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/rider/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            errorElement.textContent = data.error || 'Registration failed';
            return;
        }

        successElement.textContent = 'Registration successful! Logging you in...';
        localStorage.setItem('riderId', data.riderId);
        localStorage.setItem('riderToken', data.token);
        localStorage.setItem('riderEmail', formData.email);
        
        // Clear form
        registrationForm.reset();

        setTimeout(() => {
            location.reload();
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        errorElement.textContent = 'Connection error: ' + error.message;
    }
}

// ===== AUTHENTICATION =====
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    const loginForm = document.getElementById('loginForm');
    errorElement.textContent = '';

    try {
        const response = await fetch(`${API_BASE}/api/rider/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // Improve error message
            if (data.error && data.error.toLowerCase().includes('password')) {
                errorElement.textContent = '❌ Incorrect password';
            } else if (data.error && (data.error.toLowerCase().includes('email') || data.error.toLowerCase().includes('not found'))) {
                errorElement.textContent = '❌ Email not registered';
            } else {
                errorElement.textContent = '❌ ' + (data.error || 'Login failed');
            }
            return;
        }

        localStorage.setItem('riderId', data.riderId);
        localStorage.setItem('riderToken', data.token);
        localStorage.setItem('riderEmail', email);

        // Clear form
        loginForm.reset();
        
        // Hide login modal
        document.getElementById('loginModal').classList.remove('show');
        document.getElementById('registrationModal').classList.remove('show');
        
        loadRiderData();
        loadAvailableOrders();
        showNotification('✅ Logged in successfully!', 'success');

    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = 'Connection error: ' + error.message;
    }
}

function logout() {
    // Clear all session data
    localStorage.removeItem('riderId');
    localStorage.removeItem('riderToken');
    localStorage.removeItem('riderEmail');
    
    // Clear riderData
    riderData = null;
    orders = [];
    
    // Hide all modals and clear forms
    document.getElementById('loginModal').classList.remove('show');
    document.getElementById('registrationModal').classList.remove('show');
    document.getElementById('loginForm').reset();
    document.getElementById('registrationForm').reset();
    
    // Clear error messages
    document.getElementById('loginError').textContent = '';
    document.getElementById('regError').textContent = '';
    document.getElementById('regSuccess').textContent = '';
    
    // Show registration modal
    showRegistrationModal();
    showNotification('👋 Logged out successfully', 'info');
}

// ===== LOAD RIDER DATA =====
async function loadRiderData() {
    try {
        const riderId = localStorage.getItem('riderId');
        const token = localStorage.getItem('riderToken');

        const response = await fetch(`${API_BASE}/api/rider/${riderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            riderData = await response.json();
            loadRiderProfile();
            document.getElementById('registrationModal').classList.remove('show');
        }
    } catch (error) {
        console.error('Error loading rider data:', error);
    }
}

function loadRiderProfile() {
    if (!riderData) return;

    document.getElementById('profileName').textContent = riderData.name || 'Rider';
    document.getElementById('profilePhone').textContent = `Phone: ${riderData.phone}`;
    document.getElementById('profileEmail').textContent = riderData.email;
    document.getElementById('profileRating').textContent = `${riderData.rating || 5} ⭐`;
    document.getElementById('totalDeliveries').textContent = riderData.totalDeliveries || 0;
    document.getElementById('monthDeliveries').textContent = riderData.monthDeliveries || 0;
    document.getElementById('vehicleType').textContent = riderData.vehicleType;
    document.getElementById('licensePlate').textContent = riderData.licensePlate;
    document.getElementById('bankAccount').textContent = riderData.accountNumber;
    document.getElementById('joinDate').textContent = riderData.joinDate ? new Date(riderData.joinDate).toLocaleDateString() : 'Today';
    document.getElementById('totalEarnings').textContent = `₦${(riderData.totalEarnings || 0).toLocaleString()}`;
    document.getElementById('earningsValue').textContent = `₦${(riderData.monthEarnings || 0).toLocaleString()}`;
}

function editProfile() {
    showNotification('Profile editing feature coming soon', 'info');
}

// ===== NAVIGATION =====
function handleNavigation(e) {
    e.preventDefault();
    const page = e.target.getAttribute('data-page');
    switchPage(page);
}

function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedPage = document.getElementById(pageName);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
}

// ===== ORDERS =====
async function loadAvailableOrders() {
    try {
        const token = localStorage.getItem('riderToken');
        // Fetch available orders from rider_order_table_2
        const response = await fetch(`${API_BASE}/api/rider-orders/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const riderOrders = await response.json();
            // Map rider_orders data directly
            orders = riderOrders.map(riderOrder => ({
                id: riderOrder.order_id,
                orderId: riderOrder.order_id,
                riderOrderId: riderOrder.id,
                riderAssignmentId: riderOrder.id,
                customerId: riderOrder.rider_id,
                customerName: riderOrder.customer_name || 'Unknown',
                customerPhone: riderOrder.customer_phone || 'N/A',
                customerEmail: riderOrder.customer_email || 'N/A',
                items: (riderOrder.order_items && Array.isArray(riderOrder.order_items)) ? riderOrder.order_items : [],
                total: riderOrder.order_total || 0,
                address: riderOrder.delivery_address || 'N/A',
                city: riderOrder.delivery_city || '',
                state: riderOrder.delivery_state || '',
                distance: 0,
                paymentMethod: 'Pending',
                status: 'available',
                assignedAt: riderOrder.assigned_at
            }));
            displayAvailableOrders();
            updateDashboardStats();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        // Load mock data for testing
        loadMockOrders();
    }
}

function loadMockOrders() {
    orders = [
        {
            id: '#12345',
            customerName: 'Chioma Okafor',
            customerPhone: '+234 805 123 4567',
            customerEmail: 'chioma@email.com',
            items: [{ name: 'Women\'s Dress - M', qty: 1, price: 8500 }],
            total: 12500,
            address: '123 Ikoyi Road, Lagos',
            distance: 2.3,
            paymentMethod: 'Cash on Delivery',
            status: 'shipped'
        },
        {
            id: '#12346',
            customerName: 'Tunde Adeyemi',
            customerPhone: '+234 803 987 6543',
            customerEmail: 'tunde@email.com',
            items: [{ name: 'Men\'s Shirt - L', qty: 1, price: 6500 }],
            total: 6500,
            address: '456 Victoria Island, Lagos',
            distance: 4.1,
            paymentMethod: 'Cash on Delivery',
            status: 'shipped'
        }
    ];
    displayAvailableOrders();
    updateDashboardStats();
}

function displayAvailableOrders() {
    const container = document.getElementById('availableOrdersList');
    const recentContainer = document.getElementById('recentOrdersList');
    
    container.innerHTML = '';
    recentContainer.innerHTML = '';

    const availableOrders = orders.filter(o => o.status === 'shipped' || o.status === 'available');
    
    if (availableOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No available orders</p>';
        recentContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No recent orders</p>';
        return;
    }

    availableOrders.forEach((order, index) => {
        const orderCard = createOrderCard(order);
        container.appendChild(orderCard);
        
        if (index < 3) {
            const recentCard = createOrderCard(order);
            recentContainer.appendChild(recentCard);
        }
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    // Ensure items is an array
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.length || 0;
    
    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">${order.id}</span>
            <span class="order-status status-pending">📋 Available</span>
        </div>
        <div class="order-customer">
            <p class="customer-name">${order.customerName}</p>
            <p class="customer-phone">${order.customerPhone}</p>
        </div>
        <div class="order-details-list">
            <p><strong>Items:</strong> ${itemCount} item${itemCount > 1 ? 's' : ''}</p>
            <p><strong>Distance:</strong> ${order.distance} km</p>
        </div>
        <div class="order-footer">
            <span class="order-amount">₦${(order.total || 0).toLocaleString()}</span>
            <button class="btn-action" style="
                padding: 0.5rem 1rem;
                background-color: #27ae60;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 0.85rem;
            ">🔐 Request Code</button>
        </div>
    `;

    const button = card.querySelector('.btn-action');
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        // Go straight to Request Code flow - no Accept step
        currentOrder = order;
        currentRiderOrderId = order.riderOrderId;
        openDeliveryDetailModal(order);
    });

    return card;
}

// Accept order and transition to Request Code flow
function filterAvailableOrders(e) {
    const searchTerm = e.target.value.toLowerCase();
    const container = document.getElementById('availableOrdersList');
    const cards = container.querySelectorAll('.order-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterCompletedOrders(e) {
    const searchTerm = e.target.value ? e.target.value.toLowerCase() : '';
    const container = document.getElementById('completedList');
    if (!container) return;
    
    const cards = container.querySelectorAll('.order-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (searchTerm === '' || text.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== ORDER MODAL =====
function openOrderModal(order) {
    currentOrder = order;
    currentRiderOrderId = order.riderOrderId || order.id;
    
    document.getElementById('modalOrderId').textContent = `Order ${order.id}`;
    document.getElementById('modalCustomerName').textContent = order.customerName;
    document.getElementById('modalCustomerPhone').textContent = order.customerPhone;
    document.getElementById('modalCustomerEmail').textContent = order.customerEmail;
    document.getElementById('modalDeliveryAddress').textContent = order.address;
    document.getElementById('modalAmount').textContent = order.total.toLocaleString();
    document.getElementById('modalPaymentMethod').textContent = order.paymentMethod || 'N/A';

    const itemsList = document.getElementById('modalItemsList');
    itemsList.innerHTML = '';
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
        const li = document.createElement('li');
        if (item.productName) {
            li.textContent = `${item.productName} (x${item.quantity}) - ₦${(item.price * item.quantity).toLocaleString()}`;
        } else {
            li.textContent = `${item.name} (x${item.qty || 1}) - ₦${(item.price || 0).toLocaleString()}`;
        }
        itemsList.appendChild(li);
    });

    // Update modal buttons based on order status
    const actionButtons = document.getElementById('modalActionButtons');
    if (actionButtons) {
        actionButtons.innerHTML = '';
        
        if (order.status === 'shipped' || order.status === 'available') {
            // Show Accept button for available orders
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = '✅ Accept Order';
            acceptBtn.className = 'btn-primary';
            acceptBtn.style.marginRight = '0.5rem';
            acceptBtn.onclick = acceptOrder;
            actionButtons.appendChild(acceptBtn);
        } else if (order.status === 'accepted') {
            // Show Send Code button for accepted orders
            const codeBtn = document.createElement('button');
            codeBtn.textContent = '🔐 Send Delivery Code';
            codeBtn.className = 'btn-primary';
            codeBtn.style.marginRight = '0.5rem';
            codeBtn.onclick = sendDeliveryCode;
            actionButtons.appendChild(codeBtn);
        }
    }

    document.getElementById('orderModal').classList.add('show');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
    currentOrder = null;
    currentRiderOrderId = null;
}

// ===== ACCEPT/REJECT ORDER =====
async function acceptOrder() {
    if (!currentOrder) {
        showNotification('No order selected to accept', 'danger');
        return;
    }

    const riderId = localStorage.getItem('riderId');
    const token = localStorage.getItem('riderToken');
    const riderOrderId = currentRiderOrderId || currentOrder.riderOrderId || currentOrder.orderId || currentOrder.id;

    if (!riderId || !token) {
        showNotification('Please log in again before accepting orders', 'danger');
        return;
    }

    if (!riderOrderId) {
        console.warn('acceptOrder: missing riderOrderId', currentOrder);
        showNotification('Order identifier is missing', 'danger');
        return;
    }

    try {
        // Call accept endpoint
        const response = await fetch(`${API_BASE}/api/rider-orders/${riderOrderId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ riderId })
        });

        if (response.ok) {
            const result = await response.json();
            const acceptedOrderId = currentOrder.id; // Save before closing modal
            closeOrderModal();
            await loadAvailableOrders();
            updateDashboardStats();
            showNotification(`Order ${acceptedOrderId} accepted! Ready for code.`, 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to accept order', 'danger');
        }
    } catch (error) {
        console.error('Error accepting order:', error);
        showNotification('Error accepting order', 'danger');
    }
}

// ===== SEND DELIVERY CODE =====
async function sendDeliveryCode() {
    if (!currentRiderOrderId) return;

    try {
        const token = localStorage.getItem('riderToken');
        
        const response = await fetch(`${API_BASE}/api/rider-orders/${currentRiderOrderId}/send-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('Delivery code sent to customer email!', 'success');
            // Show code verification input
            showCodeVerificationModal();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to send code', 'danger');
        }
    } catch (error) {
        console.error('Error sending code:', error);
        showNotification('Error sending code', 'danger');
    }
}

// ===== VERIFY DELIVERY CODE =====
function rejectOrder() {
    closeOrderModal();
    showNotification('Order rejected', 'info');
    currentOrder = null;
}

// ===== ACTIVE DELIVERIES =====
// ===== DELIVERY HISTORY =====
async function loadCompletedDeliveries() {
    try {
        const riderId = localStorage.getItem('riderId');
        const token = localStorage.getItem('riderToken');

        // Fetch completed orders from delivery_orders table (status: delivered)
        const response = await fetch(`${API_BASE}/api/rider/${riderId}/delivery-orders/completed`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const completedRiderOrders = await response.json();
            completedOrders = completedRiderOrders.map(ord => ({
                id: ord.order_id,
                orderId: ord.order_id,
                deliveryOrderId: ord.id,
                customerName: ord.customer_name || 'Unknown',
                customerPhone: ord.customer_phone || 'N/A',
                customerEmail: ord.customer_email || 'N/A',
                items: (ord.order_items && Array.isArray(ord.order_items)) ? ord.order_items : [],
                total: ord.order_total || 0,
                address: ord.delivery_address || 'N/A',
                city: ord.delivery_city || '',
                state: ord.delivery_state || '',
                status: 'delivered',
                deliveredAt: ord.delivered_at
            }));
            displayCompletedDeliveries();
        }
    } catch (error) {
        console.error('Error loading completed deliveries:', error);
    }
}

function displayCompletedDeliveries() {
    const container = document.getElementById('completedList');
    if (!container) return;
    
    container.innerHTML = '';

    if (completedOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No completed deliveries</p>';
        return;
    }

    completedOrders.forEach(order => {
        const card = createCompletedOrderCard(order);
        container.appendChild(card);
    });
}

function createCompletedOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.borderLeftColor = '#27ae60';
    
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.length || 0;
    const deliveredTime = order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'N/A';

    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">${order.id}</span>
            <span class="order-status" style="background-color: #27ae60; color: white;">✅ Delivered</span>
        </div>
        <div class="order-customer">
            <p class="customer-name">${order.customerName}</p>
            <p class="customer-phone">${order.customerPhone}</p>
        </div>
        <div class="order-details-list">
            <p><strong>Items:</strong> ${itemCount}</p>
            <p><strong>Delivered:</strong> ${deliveredTime}</p>
        </div>
        <div class="order-footer">
            <span class="order-amount">₦${(order.total || 0).toLocaleString()}</span>
        </div>
    `;

    return card;
}

// ===== CODE VERIFICATION MODAL =====
function showCodeVerificationModal() {
    // Remove any existing modal
    const existingModal = document.getElementById('codeVerificationModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'codeVerificationModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    `;
    
    content.innerHTML = `
        <h2 style="margin-top: 0; color: #333;">🔐 Verify Delivery Code</h2>
        <p style="color: #666;">Ask the customer for the verification code sent to their email:</p>
        <input 
            type="text" 
            id="deliveryCodeInput" 
            placeholder="Enter 6-digit code" 
            style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #ddd;
                border-radius: 4px;
                font-size: 1.2rem;
                letter-spacing: 2px;
                text-align: center;
                font-weight: bold;
                box-sizing: border-box;
                margin: 1rem 0;
            "
            maxlength="6"
        />
        <div id="codeVerifyError" style="color: #dc3545; margin: 0.5rem 0; font-size: 0.9rem;"></div>
        <div style="display: flex; gap: 0.5rem;">
            <button id="verifyCodeBtn" type="button" style="
                flex: 1;
                padding: 0.75rem;
                background-color: #27ae60;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
            ">Verify Code</button>
            <button id="cancelCodeBtn" type="button" style="
                flex: 1;
                padding: 0.75rem;
                background-color: #95a5a6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
            ">Cancel</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Attach click handlers AFTER elements are in the DOM
    setTimeout(() => {
        const verifyBtn = document.getElementById('verifyCodeBtn');
        const cancelBtn = document.getElementById('cancelCodeBtn');
        const codeInput = document.getElementById('deliveryCodeInput');
        
        console.log('Verify button found:', verifyBtn ? 'YES' : 'NO');
        console.log('Cancel button found:', cancelBtn ? 'YES' : 'NO');
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Verify Code button clicked!');
                verifyDeliveryCodeFromModal();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked!');
                closeCodeVerificationModal();
            });
        }
        
        // Allow Enter key to verify
        if (codeInput) {
            codeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyDeliveryCodeFromModal();
                }
            });
            codeInput.focus();
        }
    }, 0);
    
    // Close modal when clicking outside content area
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeCodeVerificationModal();
        }
    });
}

function closeCodeVerificationModal() {
    const modal = document.getElementById('codeVerificationModal');
    if (modal) {
        modal.remove();
    }
}

function openCodeVerificationModal(order) {
    currentOrder = order;
    currentRiderOrderId = order.deliveryOrderId;
    showCodeVerificationModal();
}

function openDeliveryDetailModal(order) {
    // New modal for showing delivery details and requesting code
    currentOrder = order;
    currentRiderOrderId = order.deliveryOrderId || order.riderOrderId;
    
    // Create modal
    let modal = document.getElementById('deliveryDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deliveryDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Delivery Details - Order ${order.orderId}</h2>
                <button onclick="closeDeliveryDetailModal()" class="modal-close" style="cursor: pointer; background: none; border: none; font-size: 1.5rem;">×</button>
            </div>
            <div class="modal-body">
                <div style="padding: 1rem;">
                    <h3 style="margin-top: 0; color: #333;">Customer Information</h3>
                    <p><strong>Name:</strong> ${order.customerName}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone}</p>
                    <p><strong>Email:</strong> ${order.customerEmail}</p>
                    <p><strong>Address:</strong> ${order.address}</p>
                    <p><strong>City:</strong> ${order.city}</p>
                    
                    <h3 style="color: #333;">Order Details</h3>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Total Amount:</strong> ₦${order.total.toLocaleString()}</p>
                    <p><strong>Status:</strong> ${order.status === 'accepted' ? '📋 Ready to Deliver' : '📧 Code Sent'}</p>
                    
                    <h3 style="color: #333;">Items</h3>
                    <ul>
                        ${order.items && order.items.length > 0 ? 
                            order.items.map(item => `<li>${item.name || item.productName} (x${item.qty || item.quantity})</li>`).join('') :
                            '<li>No items information</li>'
                        }
                    </ul>
                    
                    <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                        <button onclick="sendDeliveryCodeToCustomer()" class="btn-primary" style="flex: 1; padding: 0.75rem;">
                            🔐 Request Code from Customer
                        </button>
                        <button onclick="closeDeliveryDetailModal()" class="btn-secondary" style="flex: 1; padding: 0.75rem;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeDeliveryDetailModal() {
    const modal = document.getElementById('deliveryDetailModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ===== SEND DELIVERY CODE TO CUSTOMER =====
async function sendDeliveryCodeToCustomer() {
    if (!currentOrder || !currentRiderOrderId) {
        showNotification('Order information missing', 'danger');
        return;
    }

    try {
        const token = localStorage.getItem('riderToken');
        const riderId = localStorage.getItem('riderId');
        
        // Step 1: Accept order first
        const acceptResponse = await fetch(`${API_BASE}/api/rider-orders/${currentRiderOrderId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ riderId })
        });

        if (!acceptResponse.ok) {
            const error = await acceptResponse.json();
            showNotification(error.error || 'Failed to accept order', 'danger');
            return;
        }

        // Extract delivery_orders ID from response
        const acceptResult = await acceptResponse.json();
        const deliveryOrderId = acceptResult.order?.id; // UUID from delivery_orders table
        
        if (!deliveryOrderId) {
            showNotification('Failed to get delivery order ID', 'danger');
            return;
        }

        // Step 2: Generate and send code
        const deliveryCode = generateDeliveryCode();
        
        // Send code to backend - it will store in delivery_orders and send email
        const response = await fetch(`${API_BASE}/api/rider-orders/${deliveryOrderId}/send-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                code: deliveryCode,
                customerEmail: currentOrder.customerEmail,
                customerName: currentOrder.customerName,
                orderId: currentOrder.orderId
            })
        });

        if (response.ok) {
            const result = await response.json();
            currentDeliveryCode = deliveryCode; // Store for verification
            closeDeliveryDetailModal();
            showNotification('✉️ Delivery code sent to customer email!', 'success');
            
            // Show code verification modal after a short delay
            setTimeout(() => {
                openCodeVerificationModal(currentOrder);
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to send code', 'danger');
        }
    } catch (error) {
        console.error('Error sending code:', error);
        showNotification('Error sending code', 'danger');
    }
}

// ===== DELIVERY STATUS & CODE =====
function openDeliveryModal(order) {
    currentOrder = order;
    currentRiderOrderId = order.deliveryOrderId;
    document.getElementById('deliveryModal').classList.add('show');
    document.getElementById('codeSection').style.display = 'none';
    document.getElementById('generatedCode').textContent = '-';
    
    document.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('statusNotes').value = '';
}

function closeDeliveryModal() {
    document.getElementById('deliveryModal').classList.remove('show');
    currentOrder = null;
}

function showCodeSection() {
    document.getElementById('codeSection').style.display = 'block';
    document.getElementById('codeMessage').textContent = `Requesting code to be sent to ${currentOrder.customerEmail}...`;
}

function generateDeliveryCode() {
    return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

async function updateDeliveryStatus() {
    // This function now just sends the delivery code
    if (!currentOrder || !currentRiderOrderId) {
        showNotification('Order information missing', 'danger');
        return;
    }

    try {
        const token = localStorage.getItem('riderToken');
        
        // Send code request to customer
        const response = await fetch(`${API_BASE}/api/rider-orders/${currentRiderOrderId}/send-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            closeDeliveryModal();
            showNotification('✉️ Delivery code sent to customer email!', 'success');
            // Show code verification modal
            showCodeVerificationModal();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to send code', 'danger');
        }
    } catch (error) {
        console.error('Error sending code:', error);
        showNotification('Error sending code', 'danger');
    }
}

// ===== CODE VERIFICATION (from customer email) =====
function openCodeModal() {
    document.getElementById('codeModal').classList.add('show');
    document.getElementById('deliveryCode').value = '';
    document.getElementById('codeError').textContent = '';
}

function closeCodeModal() {
    document.getElementById('codeModal').classList.remove('show');
}

async function verifyDeliveryCodeFromModal() {
    const enteredCode = document.getElementById('deliveryCodeInput').value;
    const errorElement = document.getElementById('codeVerifyError');

    if (!enteredCode) {
        errorElement.textContent = 'Please enter the code';
        return;
    }

    if (!currentOrder || !currentRiderOrderId) {
        errorElement.textContent = 'Order information missing';
        return;
    }

    try {
        const token = localStorage.getItem('riderToken');
        
        // Call verify-code endpoint - updates delivery_orders status to "delivered"
        const response = await fetch(`${API_BASE}/api/rider-orders/${currentRiderOrderId}/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                code: enteredCode
            })
        });

        if (response.ok) {
            closeCodeVerificationModal();
            showNotification('✅ Delivery completed! Confirmation emails sent.', 'success');
            
            // Reload deliveries after delay
            setTimeout(() => {
                loadCompletedDeliveries();
                loadAvailableOrders();
                updateDashboardStats();
            }, 500);
        } else {
            const error = await response.json();
            errorElement.textContent = error.error || 'Invalid code. Please try again.';
        }
    } catch (error) {
        console.error('Error verifying code:', error);
        errorElement.textContent = 'Error verifying code. Try again.';
    }
}

async function verifyDeliveryCode() {
    const enteredCode = document.getElementById('deliveryCode').value;
    const errorElement = document.getElementById('codeError');

    if (!enteredCode) {
        errorElement.textContent = 'Please enter the code';
        return;
    }

    if (enteredCode !== currentDeliveryCode) {
        errorElement.textContent = 'Invalid code. Please try again.';
        return;
    }

    try {
        const token = localStorage.getItem('riderToken');
        
        // Call new verify-code endpoint with delivery order ID
        const response = await fetch(`${API_BASE}/api/rider-orders/${currentRiderOrderId}/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                code: enteredCode
            })
        });

        if (response.ok) {
            currentDeliveryStatus[currentOrder.id] = 'delivered';
            closeCodeModal();
            closeCodeVerificationModal();
            showNotification('✅ Delivery completed! Confirmation emails sent.', 'success');
            
            await loadCompletedDeliveries();
            await loadAvailableOrders();
            updateDashboardStats();
        } else {
            const error = await response.json();
            errorElement.textContent = error.error || 'Invalid code or verification failed';
        }
    } catch (error) {
        console.error('Error verifying code:', error);
        errorElement.textContent = 'Error verifying code. Try again.';
    }
}


// ===== DASHBOARD =====
function updateDashboardStats() {
    const availableCount = orders.filter(o => o.status === 'shipped' || o.status === 'available').length;
    const activeCount = Object.keys(currentDeliveryStatus).filter(id => {
        const status = currentDeliveryStatus[id];
        return status && status !== 'delivered';
    }).length;
    
    const completedCount = Object.keys(currentDeliveryStatus).filter(id => currentDeliveryStatus[id] === 'delivered').length;
    
    // Calculate earnings: 1500 per completed delivery
    const earningsPerOrder = 1500;
    const monthEarnings = completedCount * earningsPerOrder;
    const totalEarnings = (riderData?.totalDeliveries || 0) * earningsPerOrder;

    document.getElementById('availableCount').textContent = availableCount;
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('completedCount').textContent = completedCount;
    
    // Update sidebar earnings
    const sidebarEarningsElement = document.getElementById('sidebarEarnings');
    if (sidebarEarningsElement) {
        sidebarEarningsElement.textContent = `₦${monthEarnings.toLocaleString()}`;
    }
    
    if (riderData) {
        document.getElementById('earningsValue').textContent = `₦${monthEarnings.toLocaleString()}`;
        document.getElementById('totalEarnings').textContent = `₦${totalEarnings.toLocaleString()}`;
    }
}

// ===== ONLINE STATUS =====
async function toggleOnlineStatus() {
    if (!riderData) return;

    const riderId = localStorage.getItem('riderId');
    const isOnline = !riderData.is_online;
    const statusToggle = document.getElementById('riderStatusToggle');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    try {
        const token = localStorage.getItem('riderToken');
        const response = await fetch(`${API_BASE}/api/rider/${riderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_online: isOnline })
        });

        if (response.ok) {
            riderData.is_online = isOnline;
            
            if (isOnline) {
                statusDot.classList.remove('offline');
                statusDot.classList.add('online');
                statusText.textContent = 'Online';
                statusToggle.classList.remove('offline');
                statusToggle.title = 'Click to go offline';
                showNotification('✅ You are now online', 'success');
            } else {
                statusDot.classList.remove('online');
                statusDot.classList.add('offline');
                statusText.textContent = 'Offline';
                statusToggle.classList.add('offline');
                statusToggle.title = 'Click to go online';
                showNotification('⏸️ You are now offline', 'info');
            }
            console.log('✅ Online status updated:', isOnline ? 'ONLINE' : 'OFFLINE');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('❌ Failed to update status', 'error');
    }
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        background-color: ${getNotificationColor(type)};
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationColor(type) {
    const colors = {
        'success': '#28a745',
        'danger': '#dc3545',
        'warning': '#ffc107',
        'info': '#004E89'
    };
    return colors[type] || colors['info'];
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize
window.addEventListener('load', () => {
    switchPage('dashboard');
    loadAvailableOrders();
});

// ===== WITHDRAWAL SYSTEM =====
function openWithdrawalModal() {
    if (!riderData) return;

    const completedCount = Object.keys(currentDeliveryStatus).filter(id => currentDeliveryStatus[id] === 'delivered').length;
    const earningsPerOrder = 1500;
    monthlyEarnings = completedCount * earningsPerOrder;
    totalEarnings = (riderData?.totalDeliveries || 0) * earningsPerOrder;

    // Update withdrawal modal display
    document.getElementById('totalEarningsDisplay').textContent = `₦${totalEarnings.toLocaleString()}`;
    document.getElementById('monthEarningsDisplay').textContent = `₦${monthlyEarnings.toLocaleString()}`;
    document.getElementById('completedOrdersDisplay').textContent = completedCount;

    // Set bank account from rider data
    const accountSelect = document.getElementById('withdrawalAccount');
    accountSelect.innerHTML = `
        <option value="${riderData.id}" selected>
            ${riderData.bankName} - ${riderData.accountNumber}
        </option>
    `;

    // Show modal
    document.getElementById('withdrawalModal').classList.add('show');
}

function closeWithdrawalModal() {
    document.getElementById('withdrawalModal').classList.remove('show');
    document.getElementById('withdrawalAmount').value = '';
}

function withdrawMaxAmount() {
    document.getElementById('withdrawalAmount').value = monthlyEarnings;
}

async function submitWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const token = localStorage.getItem('riderToken');
    const riderId = localStorage.getItem('riderId');

    if (!amount || amount < 1000) {
        showNotification('Minimum withdrawal amount is ₦1,000', 'warning');
        return;
    }

    if (amount > monthlyEarnings) {
        showNotification('Insufficient balance for withdrawal', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/rider/${riderId}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: amount,
                bankName: riderData.bankName,
                accountNumber: riderData.accountNumber,
                accountName: riderData.accountName
            })
        });

        if (response.ok) {
            showNotification('Withdrawal request submitted! Payment processing within 7 days.', 'success');
            closeWithdrawalModal();
            // Update earnings
            monthlyEarnings -= amount;
            updateDashboardStats();
        } else {
            showNotification('Failed to process withdrawal', 'danger');
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        showNotification('Error processing withdrawal', 'danger');
    }
}
