// ===== API BASE URL =====
const API_BASE = 'https://amoostore.onrender.com';

// ===== RIDER DATA =====
let riderData = null;
let orders = [];
let currentDeliveryStatus = {};
let currentDeliveryCode = null;
let currentOrder = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const riderId = localStorage.getItem('riderId');
    const riderToken = localStorage.getItem('riderToken');
    
    if (!riderId || !riderToken) {
        showRegistrationModal();
    } else {
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
    document.getElementById('riderStatus').addEventListener('click', toggleOnlineStatus);
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
    errorElement.textContent = '';

    try {
        const response = await fetch(`${API_BASE}/api/rider/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorElement.textContent = data.error || 'Login failed';
            return;
        }

        localStorage.setItem('riderId', data.riderId);
        localStorage.setItem('riderToken', data.token);
        localStorage.setItem('riderEmail', email);

        document.getElementById('loginModal').classList.remove('show');
        loadRiderData();
        loadAvailableOrders();
        showNotification('Logged in successfully!', 'success');

    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = 'Connection error: ' + error.message;
    }
}

function logout() {
    localStorage.removeItem('riderId');
    localStorage.removeItem('riderToken');
    localStorage.removeItem('riderEmail');
    showRegistrationModal();
    showNotification('Logged out successfully', 'info');
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
        const response = await fetch(`${API_BASE}/api/orders?status=shipped`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            orders = await response.json();
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
            <p><strong>Items:</strong> ${order.items.length} item${order.items.length > 1 ? 's' : ''}</p>
            <p><strong>Distance:</strong> ${order.distance} km</p>
        </div>
        <div class="order-footer">
            <span class="order-amount">₦${order.total.toLocaleString()}</span>
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

        const response = await fetch(`${API_BASE}/api/order/${currentOrder.id}/assign-rider`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ riderId })
        });

        if (response.ok) {
            currentOrder.status = 'active';
            currentOrder.riderId = riderId;
            currentDeliveryStatus[currentOrder.id] = 'picked';
            
            closeOrderModal();
            await loadAvailableOrders();
            updateDashboardStats();
            showNotification(`Order ${currentOrder.id} accepted! On the way.`, 'success');
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

        const response = await fetch(`${API_BASE}/api/rider/${riderId}/active-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const activeOrders = await response.json();
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

        // Update order status
        const response = await fetch(`${API_BASE}/api/order/${currentOrder.id}/status`, {
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

        const response = await fetch(`${API_BASE}/api/rider/${riderId}/completed-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const completedOrders = await response.json();
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

    document.getElementById('availableCount').textContent = availableCount;
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('completedCount').textContent = Object.keys(currentDeliveryStatus).filter(id => currentDeliveryStatus[id] === 'delivered').length;
    
    if (riderData) {
        document.getElementById('earningsValue').textContent = `₦${(riderData.monthEarnings || 0).toLocaleString()}`;
    }
}

// ===== ONLINE STATUS =====
async function toggleOnlineStatus() {
    if (!riderData) return;

    riderData.isOnline = !riderData.isOnline;
    const statusElement = document.getElementById('riderStatus');
    
    try {
        const token = localStorage.getItem('riderToken');
        await fetch(`${API_BASE}/api/rider/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isOnline: riderData.isOnline })
        });
    } catch (error) {
        console.error('Error updating status:', error);
    }

    if (riderData.isOnline) {
        statusElement.innerHTML = '<span class="status-dot online"></span>Online';
        showNotification('You are now online', 'success');
    } else {
        statusElement.innerHTML = '<span class="status-dot offline"></span>Offline';
        showNotification('You are now offline', 'info');
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
