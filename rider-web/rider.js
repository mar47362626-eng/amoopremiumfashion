// ===== API BASE URL =====
const API_BASE = 'https://amoo-store-user-i18d.onrender.com';

// ===== RIDER DATA =====
let riderData = null;
let orders = [];
let currentDeliveryStatus = {};
let currentDeliveryCode = null;
let currentOrder = null;
let monthlyEarnings = 0;
let totalEarnings = 0;

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
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);

    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closeOrderModal);
    document.getElementById('closeDeliveryModal').addEventListener('click', closeDeliveryModal);
    document.getElementById('closeCodeModal').addEventListener('click', closeCodeModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('orderModal')) closeOrderModal();
        if (event.target === document.getElementById('deliveryModal')) closeDeliveryModal();
        if (event.target === document.getElementById('codeModal')) closeCodeModal();
    });

    // Order modal actions
    document.getElementById('acceptOrderModalBtn').addEventListener('click', acceptOrder);
    document.getElementById('rejectOrderBtn').addEventListener('click', rejectOrder);

    // Delivery status modal
    document.getElementById('updateStatusBtn').addEventListener('click', updateDeliveryStatus);
    document.getElementById('cancelStatusBtn').addEventListener('click', closeDeliveryModal);
    document.getElementById('status-arrived').addEventListener('change', showCodeSection);

    // Code verification
    document.getElementById('verifyCodeBtn').addEventListener('click', verifyDeliveryCode);
    document.getElementById('cancelCodeBtn').addEventListener('click', closeCodeModal);

    // Search and filter
    document.getElementById('searchOrders').addEventListener('input', filterAvailableOrders);
    document.getElementById('filterDate').addEventListener('change', filterCompletedOrders);

    // Profile
    document.getElementById('editProfileBtn').addEventListener('click', editProfile);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Status toggle
    document.getElementById('riderStatusToggle').addEventListener('click', toggleOnlineStatus);

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
        // Fetch available orders from rider_orders table
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
            <span class="order-distance">${order.distance} km</span>
        </div>
    `;

    card.addEventListener('click', () => openOrderModal(order));
    return card;
}

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

// ===== ORDER MODAL =====
function openOrderModal(order) {
    currentOrder = order;
    document.getElementById('modalOrderId').textContent = `Order ${order.id}`;
    document.getElementById('modalCustomerName').textContent = order.customerName;
    document.getElementById('modalCustomerPhone').textContent = order.customerPhone;
    document.getElementById('modalCustomerEmail').textContent = order.customerEmail;
    document.getElementById('modalDeliveryAddress').textContent = order.address;
    document.getElementById('modalAmount').textContent = order.total.toLocaleString();
    document.getElementById('modalPaymentMethod').textContent = order.paymentMethod;

    const itemsList = document.getElementById('modalItemsList');
    itemsList.innerHTML = '';
    order.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.name} (x${item.qty}) - ₦${item.price.toLocaleString()}`;
        itemsList.appendChild(li);
    });

    document.getElementById('orderModal').classList.add('show');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
    currentOrder = null;
}

// ===== ACCEPT/REJECT ORDER =====
async function acceptOrder() {
    if (!currentOrder) return;

    try {
        const riderId = localStorage.getItem('riderId');
        const token = localStorage.getItem('riderToken');
        const riderAssignmentId = currentOrder.riderAssignmentId;

        // Use new order-riders endpoint
        const response = await fetch(`${API_BASE}/api/order-riders/${riderAssignmentId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ riderId })
        });

        if (response.ok) {
            currentOrder.status = 'assigned';
            currentOrder.riderId = riderId;
            currentDeliveryStatus[currentOrder.id] = 'picked';
            
            closeOrderModal();
            await loadAvailableOrders();
            updateDashboardStats();
            showNotification(`Order ${currentOrder.id} accepted! Heading to pickup.`, 'success');
        }
    } catch (error) {
        console.error('Error accepting order:', error);
        showNotification('Error accepting order', 'danger');
    }
}

function rejectOrder() {
    closeOrderModal();
    showNotification('Order rejected', 'info');
    currentOrder = null;
}

// ===== ACTIVE DELIVERIES =====
async function loadActiveDeliveries() {
    try {
        const riderId = localStorage.getItem('riderId');
        const token = localStorage.getItem('riderToken');

        // Fetch active orders assigned to this rider from order_riders table
        const response = await fetch(`${API_BASE}/api/order-riders/rider/${riderId}?status=active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const activeOrderRiders = await response.json();
            // Filter out delivered orders (those are for completed page)
            const activeOrders = activeOrderRiders
                .filter(ord => ord.status !== 'delivered')
                .map(ord => {
                    // Handle nested orders data
                    const orderData = ord.orders || ord;
                    return {
                        id: ord.order_id || ord.id,
                        orderId: ord.order_id || ord.id,
                        riderAssignmentId: ord.id || ord.riderAssignmentId,
                        customerName: orderData.customerName || 'Unknown',
                        customerPhone: orderData.customerPhone || 'N/A',
                        customerEmail: orderData.customerEmail || 'N/A',
                        items: (orderData.items && Array.isArray(orderData.items)) ? orderData.items : [],
                        total: orderData.total || 0,
                        address: orderData.address || orderData.deliveryAddress || 'N/A',
                        distance: orderData.distance || 0,
                        paymentMethod: orderData.paymentMethod || 'N/A',
                        status: ord.status
                    };
                });
            displayActiveDeliveries(activeOrders);
        }
    } catch (error) {
        console.error('Error loading active deliveries:', error);
    }
}

function displayActiveDeliveries(activeOrders) {
    const container = document.getElementById('activeDeliveriesList');
    container.innerHTML = '';

    if (activeOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No active deliveries</p>';
        return;
    }

    activeOrders.forEach(order => {
        const card = createActiveDeliveryCard(order);
        card.addEventListener('click', () => openDeliveryModal(order));
        container.appendChild(card);
    });
}

function createActiveDeliveryCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.borderLeftColor = '#00796b';
    
    const status = currentDeliveryStatus[order.id] || 'pending';
    const statusLabels = {
        'pending': '📋 Pending',
        'picked': '📍 Picked Up',
        'on-way': '🚚 On the Way',
        'arrived': '📍 Arrived',
        'delivered': '✅ Delivered'
    };

    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">${order.id}</span>
            <span class="order-status status-active">${statusLabels[status]}</span>
        </div>
        <div class="order-customer">
            <p class="customer-name">${order.customerName}</p>
            <p class="customer-phone">${order.customerPhone}</p>
        </div>
        <div class="order-details-list">
            <p><strong>Address:</strong> ${order.address}</p>
            <p><strong>Distance:</strong> ${order.distance} km</p>
        </div>
        <div class="order-footer">
            <span class="order-amount">₦${order.total.toLocaleString()}</span>
            <button class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Update Status</button>
        </div>
    `;

    return card;
}

// ===== DELIVERY STATUS & CODE =====
function openDeliveryModal(order) {
    currentOrder = order;
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
    const code = generateDeliveryCode();
    currentDeliveryCode = code;
    document.getElementById('generatedCode').textContent = code;
    document.getElementById('codeMessage').textContent = `Code will be sent to ${currentOrder.customerEmail}`;
}

function generateDeliveryCode() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

async function updateDeliveryStatus() {
    if (!currentOrder) return;

    const status = document.querySelector('input[name="status"]:checked')?.value;
    if (!status) {
        showNotification('Please select a status', 'warning');
        return;
    }

    try {
        const token = localStorage.getItem('riderToken');
        const riderAssignmentId = currentOrder.riderAssignmentId;
        
        const updateData = {
            status: status,
            notes: document.getElementById('statusNotes').value
        };

        // If status is arrived, send code to customer email
        if (status === 'arrived' && currentDeliveryCode) {
            updateData.deliveryCode = currentDeliveryCode;
            updateData.customerEmail = currentOrder.customerEmail;

            // Send email with code
            await fetch(`${API_BASE}/api/send-delivery-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId: currentOrder.id,
                    customerEmail: currentOrder.customerEmail,
                    customerName: currentOrder.customerName,
                    code: currentDeliveryCode
                })
            });
        }

        // Update order status using new order-riders endpoint
        const response = await fetch(`${API_BASE}/api/order-riders/${riderAssignmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            currentDeliveryStatus[currentOrder.id] = status;
            
            if (status === 'arrived') {
                showNotification(`Code sent to customer: ${currentDeliveryCode}`, 'success');
            } else {
                showNotification(`Status updated to ${status}`, 'success');
            }
            
            closeDeliveryModal();
            await loadActiveDeliveries();
            updateDashboardStats();
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'danger');
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

        // Mark as delivered
        const response = await fetch(`${API_BASE}/api/order/${currentOrder.id}/delivered`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                code: enteredCode,
                customerEmail: currentOrder.customerEmail
            })
        });

        if (response.ok) {
            currentDeliveryStatus[currentOrder.id] = 'delivered';
            closeCodeModal();
            showNotification('Delivery completed! Emails sent to customer and admin.', 'success');
            
            await loadActiveDeliveries();
            await loadCompletedOrders();
            updateDashboardStats();
        }
    } catch (error) {
        console.error('Error verifying code:', error);
        errorElement.textContent = 'Error verifying code. Try again.';
    }
}

// ===== COMPLETED ORDERS =====
async function loadCompletedOrders() {
    try {
        const riderId = localStorage.getItem('riderId');
        const token = localStorage.getItem('riderToken');

        // Fetch completed orders assigned to this rider from order_riders table
        const response = await fetch(`${API_BASE}/api/order-riders/rider/${riderId}?status=delivered`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const completedOrderRiders = await response.json();
            // Filter to only delivered orders
            const completedOrders = completedOrderRiders
                .filter(ord => ord.status === 'delivered')
                .map(ord => {
                    // Handle nested orders data
                    const orderData = ord.orders || ord;
                    return {
                        id: ord.order_id || ord.id,
                        orderId: ord.order_id || ord.id,
                        riderAssignmentId: ord.id || ord.riderAssignmentId,
                        customerName: orderData.customerName || 'Unknown',
                        customerPhone: orderData.customerPhone || 'N/A',
                        customerEmail: orderData.customerEmail || 'N/A',
                        items: (orderData.items && Array.isArray(orderData.items)) ? orderData.items : [],
                        total: orderData.total || 0,
                        address: orderData.address || orderData.deliveryAddress || 'N/A',
                        distance: orderData.distance || 0,
                        paymentMethod: orderData.paymentMethod || 'N/A',
                        deliveredAt: ord.delivered_at,
                        status: 'delivered'
                    };
                });
            displayCompletedOrders(completedOrders);
        }
    } catch (error) {
        console.error('Error loading completed orders:', error);
    }
}

function displayCompletedOrders(completedOrders) {
    const container = document.getElementById('completedList');
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
    card.style.borderLeftColor = '#28a745';
    
    const completedTime = order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : '-';
    
    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">${order.id}</span>
            <span class="order-status status-completed">✅ Completed</span>
        </div>
        <div class="order-customer">
            <p class="customer-name">${order.customerName}</p>
            <p class="customer-phone">${order.customerPhone}</p>
        </div>
        <div class="order-details-list">
            <p><strong>Address:</strong> ${order.address}</p>
            <p><strong>Completed at:</strong> ${completedTime}</p>
        </div>
        <div class="order-footer">
            <span class="order-amount">₦${order.total.toLocaleString()}</span>
        </div>
    `;

    return card;
}

function filterCompletedOrders(e) {
    // Implementation for filtering by date
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
