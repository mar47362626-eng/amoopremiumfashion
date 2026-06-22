console.log('📜 script.js loaded');

let PRODUCTS = [
  {
    id: 'royal-agbada',
    name: 'Royal Agbada Set',
    category: 'men',
    price: 48000,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
    description: 'Structured native wear with a refined finish for ceremonies and premium events.',
    tag: 'Best seller'
  },
  {
    id: 'city-kurta',
    name: 'City Kurta Combo',
    category: 'men',
    price: 36000,
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=1200&q=80',
    description: 'Comfortable and stylish for work, church, and weekend outings.',
    tag: 'New drop'
  },
  {
    id: 'elegant-wrap',
    name: 'Elegant Wrap Dress',
    category: 'women',
    price: 42000,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
    description: 'A smooth silhouette with a graceful drape and a premium store look.',
    tag: 'Popular'
  },
  {
    id: 'classic-gown',
    name: 'Classic Event Gown',
    category: 'women',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    description: 'Statement fashion built for birthdays, weddings, and special moments.',
    tag: 'Event pick'
  },
  {
    id: 'couple-heritage',
    name: 'Heritage Couple Set',
    category: 'couple',
    price: 86000,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    description: 'Matching attire for portraits, weddings, and anniversary celebrations.',
    tag: 'Bundle'
  },
  {
    id: 'couple-luxe',
    name: 'Luxe Matching Combo',
    category: 'couple',
    price: 92000,
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80',
    description: 'Designed to look coordinated, elegant, and very polished on camera.',
    tag: 'Premium'
  },
  {
    id: 'kids-party',
    name: 'Kids Party Set',
    category: 'kids',
    price: 24000,
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80',
    description: 'Bright, soft, and playful pieces made for comfort and easy movement.',
    tag: 'Cute'
  },
  {
    id: 'kids-smart',
    name: 'Kids Smart Wear',
    category: 'kids',
    price: 27000,
    image: 'https://images.unsplash.com/photo-1503457574469-1bb70703d3b3?auto=format&fit=crop&w=1200&q=80',
    description: 'A clean everyday outfit that still keeps a premium and tidy look.',
    tag: 'Fresh'
  }
];

// Initialize Supabase Client
let supabaseInitPromise = null;
let supabaseInitialized = false;

async function ensureSupabaseLibraryLoaded() {
  // If library is already loaded, resolve immediately
  if (window.supabase?.createClient) {
    console.log('✅ Supabase library already loaded');
    return window.supabase;
  }

  console.log('⏳ Checking for Supabase library from CDN...', {
    windowSupabase: !!window.supabase,
    hasCreateClient: !!window.supabase?.createClient
  });
  
  // Wait for library to load from CDN
  let attempts = 0;
  while (!window.supabase?.createClient) {
    if (attempts > 80) {
      console.warn('⏳ Supabase CDN slow, loading dynamically...');
      console.warn('Current state:', {
        windowSupabase: !!window.supabase,
        supabaseKeys: window.supabase ? Object.keys(window.supabase) : 'undefined'
      });
      
      // Try loading dynamically
      return new Promise((resolve) => {
        console.log('📥 Injecting Supabase script dynamically...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          console.log('✅ Supabase library loaded dynamically');
          resolve(window.supabase);
        };
        script.onerror = (error) => {
          console.error('❌ Failed to load Supabase library dynamically', error);
          resolve(null);
        };
        document.head.appendChild(script);
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    attempts++;
    
    if (attempts % 20 === 0) {
      console.log(`⏳ CDN load progress: ${attempts * 50}ms, window.supabase:`, !!window.supabase);
    }
  }
  
  console.log('✅ Supabase library loaded from CDN');
  return window.supabase;
}

async function initializeSupabase() {
  try {
    console.log('🚀 Starting Supabase initialization...');
    
    // Wait for library to be available
    const supabaseLib = await ensureSupabaseLibraryLoaded();
    if (!supabaseLib?.createClient) {
      console.error('❌ Supabase library not available');
      return false;
    }

    console.log('📡 Fetching Supabase config from backend...');
    
    // Fetch config from backend
    const response = await fetch('https://amoo-store-user-i18d.onrender.com/api/config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch config: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const { supabaseUrl, supabaseAnonKey } = await response.json();
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase credentials in config response');
      return false;
    }

    console.log('🔧 Creating Supabase client...');
    
    // Create Supabase client instance and store it
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify client was created
    if (!window.supabaseClient) {
      console.error('❌ Failed to create Supabase client');
      return false;
    }
    
    // Create a wrapper for backward compatibility
    window.supabase = {
      ...window.supabase,
      from: window.supabaseClient.from.bind(window.supabaseClient),
      select: window.supabaseClient.select?.bind(window.supabaseClient)
    };
    
    console.log('✅ Supabase client initialized successfully');
    supabaseInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Supabase initialization error:', error.message || error);
    return false;
  }
}


// Initialize Supabase when DOM is ready
if (document.readyState === 'loading') {
  console.log('📜 script.js: DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📜 script.js: DOMContentLoaded fired, starting Supabase init...');
    supabaseInitPromise = initializeSupabase();
  });
} else {
  console.log('📜 script.js: DOM already loaded, starting Supabase init immediately...');
  supabaseInitPromise = initializeSupabase();
}

console.log('📜 script.js: Initialization setup complete');



// Fetch products from backend if on shop page
async function loadProductsFromBackend() {
  if (document.querySelector('[data-page="shop"]')) {
    try {
      console.log('🛍️ Fetching products from Supabase...');
      const response = await fetch('https://amoo-store-user-i18d.onrender.com/api/products');
      if (response.ok) {
        PRODUCTS = await response.json();
        console.log(`✅ Loaded ${PRODUCTS.length} products from Supabase`);
        // Re-render products after loading
        renderStoreProducts();
        applyStoreFilters();
      }
    } catch (error) {
      console.error('❌ Supabase connection error:', error);
      console.log('Using local products as fallback');
      renderStoreProducts();
      applyStoreFilters();
    }
  }
}

// Load products on page load
loadProductsFromBackend();

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');
const yearNode = document.getElementById('year');
const revealElements = document.querySelectorAll('.reveal');
const accountButton = document.querySelector('[data-account-open]');
const accountLabel = document.querySelector('[data-account-label]');
const accountModal = document.getElementById('account-modal');
const accountTabButtons = [...document.querySelectorAll('[data-account-tab]')];
const accountForms = [...document.querySelectorAll('[data-account-form]')];
const accountStatus = document.querySelector('[data-account-status]');
const accountGreeting = document.querySelector('[data-account-greeting]');
const accountLogout = document.querySelector('[data-account-logout]');
const accountCloseButtons = [...document.querySelectorAll('[data-account-close]')];

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    });
  });
}

if (accountButton) {
  accountButton.addEventListener('click', openAccountModal);
}

accountCloseButtons.forEach((button) => {
  button.addEventListener('click', closeAccountModal);
});

accountTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    clearAccountStatus();
    setAccountTab(button.dataset.accountTab || 'login');
  });
});

accountForms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    if (form.dataset.accountForm === 'register') {
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      let phone = String(formData.get('phone') || '').trim();
      const address = String(formData.get('address') || '').trim();
      const country = String(formData.get('country') || '').trim();
      const zip = String(formData.get('zip') || '').trim();
      const password = String(formData.get('password') || '').trim();

      if (!name || !email || !phone || !address || !zip || !password) {
        if (accountStatus) {
          accountStatus.textContent = 'Please fill in all registration fields.';
        }
        return;
      }

      // Automatically add country code to phone number
      if (country && countryZipFormats[country] && !phone.startsWith('+')) {
        const countryCode = countryZipFormats[country].code;
        phone = countryCode + phone;
      }

      // Save profile and treat registration as an immediate login
      saveAccountProfile({ name, email, phone, address, country, zip, password });
      updateAccountButton();

      if (accountStatus) {
        accountStatus.textContent = `Registered and signed in as ${name}. Redirecting...`;
      }

      // Close modal and return user to main section
      setTimeout(() => {
        closeAccountModal();
        const mainSection = document.getElementById('home');
        if (mainSection) {
          mainSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 650);

      return;
    }

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!accountProfile) {
      if (accountStatus) {
        accountStatus.textContent = 'No registered account found yet. Please register first.';
      }
      setAccountTab('register');
      return;
    }

    if (accountProfile.email === email && accountProfile.password === password) {
      saveAccountSession(true);
      if (accountStatus) {
        accountStatus.textContent = `Logged in as ${accountProfile.name}. Redirecting...`;
      }
      updateAccountButton();
      setTimeout(() => {
        closeAccountModal();
      }, 450);
      return;
    }

    if (accountStatus) {
      accountStatus.textContent = 'Email or password is incorrect.';
    }
  });
});

if (accountLogout) {
  accountLogout.addEventListener('click', () => {
    saveAccountSession(false);
    updateAccountButton();
    if (accountStatus && accountProfile) {
      accountStatus.textContent = `Signed out from ${accountProfile.name}. Please log in to continue.`;
    }
    setAccountTab('login');
    closeAccountModal();
  });
}

if (accountModal) {
  accountModal.addEventListener('click', (event) => {
    if (event.target === accountModal || event.target.matches('[data-account-close]')) {
      closeAccountModal();
    }
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && accountModal && !accountModal.hidden) {
    closeAccountModal();
  }
});

function setupFilterButtons(buttons, cards) {
  if (!buttons.length || !cards.length) {
    return;
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;

      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');

      cards.forEach((card) => {
        const matches = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !matches);
      });
    });
  });
}

setupFilterButtons(
  [...document.querySelectorAll('.filter-btn[data-filter]')],
  [...document.querySelectorAll('.collection-card')]
);

const storeGrid = document.querySelector('[data-product-grid]');
const searchInput = document.querySelector('[data-product-search]');
const storeFilterButtons = [...document.querySelectorAll('.store-filter-btn')];
const cartCountNodes = [...document.querySelectorAll('[data-cart-count]')];
const cartList = document.querySelector('[data-cart-items]');
const cartEmpty = document.querySelector('[data-cart-empty]');
const cartSubtotal = document.querySelector('[data-cart-subtotal]');
const cartDelivery = document.querySelector('[data-cart-delivery]');
const cartTotal = document.querySelector('[data-cart-total]');
const checkoutLink = document.querySelector('[data-checkout-link]');
const checkoutForm = document.querySelector('[data-checkout-form]');
const checkoutName = document.querySelector('[data-checkout-name]');
const checkoutEmail = document.querySelector('[data-checkout-email]');
const checkoutAccountStatus = document.querySelector('[data-checkout-account-status]');
const checkoutItemsList = document.querySelector('[data-checkout-items]');
const checkoutSubtotalNode = document.querySelector('[data-checkout-subtotal]');
const checkoutDeliveryNode = document.querySelector('[data-checkout-delivery]');
const checkoutTotalNode = document.querySelector('[data-checkout-total]');
const checkoutMessage = document.querySelector('[data-checkout-message]');
const paymentPreview = document.querySelector('[data-payment-preview]');
const paymentInstructions = document.querySelector('[data-payment-instructions]');
const clearCartButton = document.querySelector('[data-clear-cart]');
const cartAdImage = document.querySelector('[data-cart-ad-image]');
const cartAdBadge = document.querySelector('[data-cart-ad-badge]');
const cartAdTitle = document.querySelector('[data-cart-ad-title]');
const cartAdDescription = document.querySelector('[data-cart-ad-description]');
const cartAdPrice = document.querySelector('[data-cart-ad-price]');
const cartAdTag = document.querySelector('[data-cart-ad-tag]');
const cartAdDots = document.querySelector('[data-cart-ad-dots]');
const cartKey = 'ademola-cloth-house-cart';
const accountKey = 'ademola-cloth-house-account';
const accountSessionKey = 'ademola-cloth-house-session';
let cartState = loadCart();
let accountProfile = loadAccountProfile();
let accountSession = loadAccountSession();
const cartAdProducts = PRODUCTS.slice(0, 4);
let cartAdIndex = 0;
let cartAdTimer = null;

updateAccountButton();

function loadCart() {
  try {
    const saved = localStorage.getItem(cartKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(cartState));
}

function loadAccountProfile() {
  try {
    const saved = localStorage.getItem(accountKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveAccountProfile(profile) {
  accountProfile = profile;
  localStorage.setItem(accountKey, JSON.stringify(profile));
  saveAccountSession(true);
  
  // Save to backend as well
  fetch('https://amoostore.onrender.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
    .then(res => {
      if (!res.ok) {
        console.error('Registration error:', res.status, res.statusText);
        return res.json().then(err => {
          console.error('Error details:', err);
          throw new Error(`Server registration failed: ${res.status}`);
        });
      }
      return res.json();
    })
    .then(data => {
      console.log('✅ Registration successful:', data);
    })
    .catch(err => {
      console.error('Backend error:', err);
    });
}

function loadAccountSession() {
  try {
    return localStorage.getItem(accountSessionKey) === 'true';
  } catch {
    return false;
  }
}

function saveAccountSession(isSignedIn) {
  accountSession = Boolean(isSignedIn);
  localStorage.setItem(accountSessionKey, String(accountSession));
}

function isSignedIn() {
  return Boolean(accountSession && accountProfile);
}

function clearAccountStatus() {
  if (accountStatus) {
    accountStatus.textContent = '';
  }
}

function updateAccountButton() {
  if (accountLabel) {
    accountLabel.textContent = accountSession && accountProfile ? accountProfile.name : 'Account';
  }

  if (accountButton) {
    accountButton.setAttribute('aria-label', isSignedIn() ? `Account, ${accountProfile.name}` : 'Open account form');
    accountButton.setAttribute('aria-expanded', accountModal && !accountModal.hidden ? 'true' : 'false');
  }

  if (accountGreeting) {
    accountGreeting.textContent = isSignedIn()
      ? `Welcome back, ${accountProfile.name}. You are signed in.`
      : accountProfile
        ? `Welcome back, ${accountProfile.name}. Please log in to continue.`
        : 'Use your email and password to register, then log in any time.';
  }

  if (accountLogout) {
    accountLogout.hidden = !accountSession;
  }
}

function setAccountTab(tabName) {
  accountTabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.accountTab === tabName);
  });

  accountForms.forEach((form) => {
    form.classList.toggle('active', form.dataset.accountForm === tabName);
    
    // Clear register form when switching to register tab to allow fresh registration
    if (form.dataset.accountForm === 'register' && tabName === 'register') {
      form.reset();
    }
  });
}

function openAccountModal() {
  if (!accountModal) {
    return;
  }

  clearAccountStatus();
  updateAccountButton();
  setAccountTab(accountSession ? 'login' : accountProfile ? 'login' : 'register');
  if (accountStatus && accountSession && accountProfile) {
    accountStatus.textContent = `Signed in as ${accountProfile.name}. Use logout to sign out.`;
  }
  accountModal.hidden = false;
  if (accountButton) {
    accountButton.setAttribute('aria-expanded', 'true');
  }
  document.body.classList.add('menu-open');

  window.requestAnimationFrame(() => {
    const activeForm = accountForms.find((form) => form.classList.contains('active'));
    const firstInput = activeForm ? activeForm.querySelector('input') : null;
    if (firstInput) {
      firstInput.focus();
    }
  });
}

function closeAccountModal() {
  if (!accountModal) {
    return;
  }

  accountModal.hidden = true;
  if (accountButton) {
    accountButton.setAttribute('aria-expanded', 'false');
  }
  document.body.classList.remove('menu-open');
  clearAccountStatus();
}

function syncCartState() {
  cartState = loadCart();
}

function getCartAdvertItems() {
  const cartItems = cartState
    .map((item) => {
      const product = getProduct(item.id);
      if (!product) {
        return null;
      }

      return {
        ...product,
        quantity: item.quantity,
        advertSource: 'cart'
      };
    })
    .filter(Boolean);

  if (cartItems.length) {
    return cartItems;
  }

  return cartAdProducts.map((product) => ({
    ...product,
    quantity: 1,
    advertSource: 'featured'
  }));
}

function getProduct(productId) {
  return PRODUCTS.find((product) => product.id === productId);
}

function cartQuantity() {
  return cartState.reduce((total, item) => total + item.quantity, 0);
}

function cartSubtotalAmount() {
  return cartState.reduce((total, item) => {
    const product = getProduct(item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function updateCartTotals() {
  syncCartState();
  const quantity = cartQuantity();
  const subtotalValue = cartSubtotalAmount();
  const deliveryValue = subtotalValue > 0 ? 3500 : 0;
  const totalValue = subtotalValue + deliveryValue;

  cartCountNodes.forEach((node) => {
    node.textContent = String(quantity);
    // Show red badge if cart has items, hide if empty
    if (quantity > 0) {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });

  if (cartSubtotal) {
    cartSubtotal.textContent = currency.format(subtotalValue);
  }

  if (cartDelivery) {
    cartDelivery.textContent = currency.format(deliveryValue);
  }

  if (cartTotal) {
    cartTotal.textContent = currency.format(totalValue);
  }

  if (checkoutLink) {
    if (!quantity || !isSignedIn()) {
      checkoutLink.setAttribute('href', '#');
      checkoutLink.setAttribute('aria-disabled', 'true');
    } else {
      checkoutLink.setAttribute('href', 'checkout.html');
      checkoutLink.removeAttribute('aria-disabled');
    }
  }
}

function updateCheckoutPage() {
  if (!checkoutName || !checkoutEmail || !checkoutItemsList || !checkoutSubtotalNode || !checkoutDeliveryNode || !checkoutTotalNode) {
    return;
  }

  syncCartState();

  if (!isSignedIn()) {
    checkoutName.textContent = 'Not signed in';
    checkoutEmail.textContent = 'Please login first';
    checkoutItemsList.innerHTML = '<li class="checkout-item">Sign in and return to the cart to continue.</li>';
    checkoutSubtotalNode.textContent = currency.format(0);
    checkoutDeliveryNode.textContent = currency.format(0);
    checkoutTotalNode.textContent = currency.format(0);
    if (checkoutMessage) {
      checkoutMessage.textContent = 'You must sign in before completing checkout.';
    }
    return;
  }

  checkoutName.textContent = accountProfile?.name || 'Unknown';
  checkoutEmail.textContent = accountProfile?.email || 'Unknown';
  if (checkoutAccountStatus) {
    checkoutAccountStatus.textContent = 'Verified & Active';
  }

  if (!cartState.length) {
    checkoutItemsList.innerHTML = '<li class="checkout-item">Your cart is empty. Add products before checking out.</li>';
    checkoutSubtotalNode.textContent = currency.format(0);
    checkoutDeliveryNode.textContent = currency.format(0);
    checkoutTotalNode.textContent = currency.format(0);
    if (checkoutMessage) {
      checkoutMessage.textContent = 'Your cart is empty. Return to the cart to add items.';
    }
    return;
  }

  checkoutItemsList.innerHTML = cartState
    .map((item) => {
      const product = getProduct(item.id);
      if (!product) {
        return '';
      }
      return `
        <li class="checkout-item">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
          <div>
            <strong>${product.name}</strong>
            <span>${item.quantity} x ${currency.format(product.price)}</span>
          </div>
        </li>
      `;
    })
    .join('');

  const subtotalValue = cartSubtotalAmount();
  const deliveryValue = subtotalValue > 0 ? 3500 : 0;
  const totalValue = subtotalValue + deliveryValue;

  checkoutSubtotalNode.textContent = currency.format(subtotalValue);
  checkoutDeliveryNode.textContent = currency.format(deliveryValue);
  checkoutTotalNode.textContent = currency.format(totalValue);
  if (checkoutMessage) {
    checkoutMessage.textContent = '';
  }
}

function renderStoreProducts() {
  if (!storeGrid) {
    return;
  }

  storeGrid.innerHTML = PRODUCTS.map((product) => `
    <article class="product-card" data-category="${product.category}" data-name="${product.name.toLowerCase()}" data-description="${product.description.toLowerCase()}">
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
      </div>
      <div class="product-body">
        <span class="product-tag">${product.tag}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-meta">
          <span class="product-price">${currency.format(product.price)}</span>
          <span class="product-note">Ready to ship</span>
        </div>
        <button class="button button-primary" type="button" data-add-to-cart="${product.id}">Add to cart</button>
      </div>
    </article>
  `).join('');
}

function renderCart() {
  syncCartState();

  if (!cartList || !cartEmpty) {
    updateCartTotals();
    return;
  }

  if (!cartState.length) {
    cartEmpty.hidden = false;
    cartList.innerHTML = '';
    if (clearCartButton) {
      clearCartButton.disabled = true;
    }
    updateCartTotals();
    saveCart();
    return;
  }

  cartEmpty.hidden = true;
  if (clearCartButton) {
    clearCartButton.disabled = false;
  }

  cartList.innerHTML = cartState.map((item) => {
    const product = getProduct(item.id);

    if (!product) {
      return '';
    }

    return `
      <li class="cart-item">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <div>
          <strong>${product.name}</strong>
          <small>${currency.format(product.price)} each</small>
          <div class="cart-controls">
            <button type="button" data-cart-action="decrease" data-product-id="${product.id}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-action="increase" data-product-id="${product.id}">+</button>
            <button type="button" data-cart-action="remove" data-product-id="${product.id}">Remove</button>
          </div>
        </div>
      </li>
    `;
  }).join('');

  updateCartTotals();
  saveCart();
}

function renderCartAdvert() {
  syncCartState();

  if (!cartAdImage || !cartAdBadge || !cartAdTitle || !cartAdDescription || !cartAdPrice || !cartAdTag || !cartAdDots) {
    return;
  }

  const cartAdvertItems = getCartAdvertItems();

  if (!cartAdvertItems.length) {
    return;
  }

  cartAdIndex = cartAdIndex % cartAdvertItems.length;
  const product = cartAdvertItems[cartAdIndex];

  cartAdImage.src = product.image;
  cartAdImage.alt = product.name;
  cartAdBadge.textContent = product.advertSource === 'cart' ? 'In your cart' : product.tag;
  cartAdTitle.textContent = product.name;
  cartAdDescription.textContent = product.advertSource === 'cart'
    ? `${product.description} Added to cart: ${product.quantity} item${product.quantity > 1 ? 's' : ''}.`
    : product.description;
  cartAdPrice.textContent = currency.format(product.price);
  cartAdTag.textContent = product.advertSource === 'cart'
    ? `${product.quantity} in cart`
    : product.category.charAt(0).toUpperCase() + product.category.slice(1);

  cartAdDots.innerHTML = cartAdvertItems
    .map((item, index) => `<button class="cart-advert-dot ${index === cartAdIndex ? 'active' : ''}" type="button" data-cart-ad-dot="${index}" aria-label="Show ${item.name}"></button>`)
    .join('');
}

function advanceCartAdvert() {
  const cartAdvertItems = getCartAdvertItems();

  if (!cartAdvertItems.length) {
    return;
  }

  cartAdIndex = (cartAdIndex + 1) % cartAdvertItems.length;
  renderCartAdvert();
}

function addToCart(productId) {
  if (!isSignedIn()) {
    if (accountStatus) {
      accountStatus.textContent = 'Please log in or register before adding items to your cart.';
    }
    openAccountModal();
    return;
  }

  const existingItem = cartState.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartState.push({ id: productId, quantity: 1 });
  }

  saveCart();
  renderCart();
}

function changeCartItem(productId, action) {
  const itemIndex = cartState.findIndex((item) => item.id === productId);

  if (itemIndex === -1) {
    return;
  }

  const item = cartState[itemIndex];

  if (action === 'increase') {
    item.quantity += 1;
  }

  if (action === 'decrease') {
    item.quantity -= 1;
    if (item.quantity < 1) {
      cartState.splice(itemIndex, 1);
    }
  }

  if (action === 'remove') {
    cartState.splice(itemIndex, 1);
  }

  saveCart();
  renderCart();
}

function applyStoreFilters() {
  if (!storeGrid) {
    return;
  }

  const activeFilter = storeFilterButtons.find((button) => button.classList.contains('active'))?.dataset.filter || 'all';
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const cards = [...storeGrid.querySelectorAll('.product-card')];

  cards.forEach((card) => {
    const category = card.dataset.category || '';
    const name = card.dataset.name || '';
    const description = card.dataset.description || '';
    const matchesFilter = activeFilter === 'all' || category === activeFilter;
    const matchesQuery = !query || name.includes(query) || description.includes(query) || category.includes(query);
    card.classList.toggle('hidden', !(matchesFilter && matchesQuery));
  });
}

if (storeGrid) {
  // Only render if on non-shop pages or if shop page already loaded products
  if (!document.querySelector('[data-page="shop"]')) {
    renderStoreProducts();
    applyStoreFilters();
  }

  storeGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) {
      return;
    }

    addToCart(button.dataset.addToCart);
  });

  storeFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      storeFilterButtons.forEach((btn) => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');
      // Apply filters
      applyStoreFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyStoreFilters);
  }
}

if (cartList) {
  renderCart();
  renderCartAdvert();

  if (cartAdTimer) {
    clearInterval(cartAdTimer);
  }

  cartAdTimer = window.setInterval(advanceCartAdvert, 3000);

  cartList.addEventListener('click', (event) => {
    const control = event.target.closest('[data-cart-action]');
    if (!control) {
      return;
    }

    changeCartItem(control.dataset.productId, control.dataset.cartAction);
  });

  if (clearCartButton) {
    clearCartButton.addEventListener('click', () => {
      cartState.length = 0;
      cartAdIndex = 0;
      renderCart();
      renderCartAdvert();
    });
  }

  if (cartAdDots) {
    cartAdDots.addEventListener('click', (event) => {
      const dot = event.target.closest('[data-cart-ad-dot]');
      if (!dot) {
        return;
      }

      cartAdIndex = Number(dot.dataset.cartAdDot) || 0;
      renderCartAdvert();
    });
  }

  if (checkoutLink) {
    checkoutLink.addEventListener('click', (event) => {
      if (!isSignedIn()) {
        event.preventDefault();
        if (accountStatus) {
          accountStatus.textContent = 'Please log in before placing an order.';
        }
        openAccountModal();
      }
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === cartKey) {
      renderCart();
      renderCartAdvert();
    }
  });

  window.addEventListener('focus', () => {
    renderCart();
    renderCartAdvert();
  });

  window.addEventListener('pageshow', () => {
    renderCart();
    renderCartAdvert();
  });
} else {
  updateCartTotals();
}

if (document.body.dataset.page === 'checkout') {
  updateCheckoutPage();
  if (checkoutForm) {
    // show a small preview when the user selects a payment method
    const paymentInputs = [...checkoutForm.querySelectorAll('input[name="payment-method"]')];

    function renderPaymentPreview() {
      if (!paymentPreview) return;
      paymentPreview.innerHTML = `<strong>Bank transfer selected</strong><div style="margin-top:6px">Account: <strong>Ademola Cloth House</strong><br/>Bank: <strong>FCMB</strong><br/>Account number: <strong>1234567890</strong></div>`;
      paymentPreview.setAttribute('aria-hidden', 'false');
    }

    renderPaymentPreview();

    checkoutForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(checkoutForm);
      let phone = String(formData.get('phone') || '').trim();
      const address = String(formData.get('address') || '').trim();
      const country = String(formData.get('country') || '').trim();
      const paymentMethod = String(formData.get('payment-method') || '').trim();

      if (!phone || !address || !paymentMethod) {
        if (checkoutMessage) {
          checkoutMessage.textContent = 'Please complete all checkout fields before confirming your order.';
        }
        return;
      }

      // Automatically add country code to phone number
      if (country && countryZipFormats[country] && !phone.startsWith('+')) {
        const countryCode = countryZipFormats[country].code;
        phone = countryCode + phone;
      }

      // Generate order summary for WhatsApp
      const orderItems = cartState.map(item => {
        const product = getProduct(item.id);
        return `${product?.name || 'Product'} x${item.quantity}`;
      }).join('\n');
      
      const orderTotal = cartSubtotalAmount() + (cartSubtotalAmount() > 0 ? 3500 : 0);
      const whatsappMessage = `Hi! I just placed an order on AMOO STORE.

Order Details:
${orderItems}

Total: ₦${orderTotal.toLocaleString()}

Name: ${accountProfile?.name || 'Customer'}
Phone: ${phone}
Delivery Address: ${address}
Country: ${country}

Please confirm my order. I will proceed with bank transfer payment.`;

      if (paymentInstructions) {
        paymentInstructions.innerHTML = `
          <div class="bank-details">
            <strong>Bank transfer instructions</strong>
            <div><strong>Account name:</strong> Ademola Cloth House</div>
            <div><strong>Bank:</strong> FCMB</div>
            <div><strong>Account number:</strong> 1234567890</div>
            <div><strong>Branch code:</strong> 050</div>
            <div>Please keep your payment proof and contact us with a photo or reference after transfer.</div>
          </div>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="button button-primary finish-btn" data-payment-confirmed type="button">I have paid</button>
            <a class="button button-secondary" href="https://wa.me/2349138154963?text=${encodeURIComponent(whatsappMessage)}" target="_blank">📱 Message on WhatsApp</a>
          </div>
        `;
        paymentInstructions.removeAttribute('hidden');
      }

      if (checkoutMessage) {
        checkoutMessage.textContent = `Thank you ${accountProfile?.name || 'customer'}. Transfer the amount shown above and then click "I have paid".`;
      }

      // attach payment confirmation handler
      const paymentConfirmedBtn = paymentInstructions?.querySelector('[data-payment-confirmed]');
      if (paymentConfirmedBtn) {
        paymentConfirmedBtn.addEventListener('click', () => {
          // Create and save order
          const order = {
            id: Date.now(),
            customerId: accountProfile?.email || 'unknown',
            customerName: accountProfile?.name || 'Customer',
            customerEmail: accountProfile?.email || 'unknown@example.com',
            phone: phone,
            address: String(formData.get('address') || '').trim(),
            items: cartState.map(item => {
              const product = getProduct(item.id);
              return { productId: item.id, productName: product?.name || 'Unknown', quantity: item.quantity, price: product?.price || 0, productImage: product?.image || '' };
            }),
            subtotal: cartSubtotalAmount(),
            delivery: cartSubtotalAmount() > 0 ? 3500 : 0,
            total: cartSubtotalAmount() + (cartSubtotalAmount() > 0 ? 3500 : 0),
            status: 'pending',
            paymentMethod: 'bank_transfer',
            createdAt: new Date().toISOString()
          };
          
          // Save to localStorage
          let orders = [];
          try {
            const saved = localStorage.getItem('ademola-cloth-house-orders');
            orders = saved ? JSON.parse(saved) : [];
          } catch {
            orders = [];
          }
          orders.push(order);
          localStorage.setItem('ademola-cloth-house-orders', JSON.stringify(orders));

          // Also save to backend
          fetch('https://amoo-store-user-i18d.onrender.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          })
            .then(response => {
              if (!response.ok) {
                console.error('Order save error:', response.status);
                return response.json().then(err => {
                  console.error('Backend error details:', err);
                });
              }
              return response.json();
            })
            .then(data => {
              if (data?.success) {
                console.log('✅ Order saved to backend and Supabase:', order.id);
              }
            })
            .catch(err => {
              console.error('❌ Backend order save failed:', err);
              console.log('Order saved locally, please refresh to sync with Supabase');
            });

          // Show order pending status
          paymentInstructions.innerHTML = `
            <div class="order-confirmation">
              <strong>Order Received!</strong>
              <div>Order ID: <code>#${order.id}</code></div>
              <div>Status: <strong style="color: var(--accent-3)">PENDING</strong></div>
              <div>Your order is pending. The admin will review and confirm shortly.</div>
            </div>
          `;

          checkoutMessage.textContent = `Your order #${order.id} is pending. We will contact you when the admin has accepted it.`;
          
          // Clear cart
          cartState.length = 0;
          saveCart();
          if (cartCountNodes.length) {
            cartCountNodes.forEach((node) => { 
              node.textContent = '0';
              node.classList.remove('active'); // Hide red badge
            });
          }
          if (cartSubtotal) { cartSubtotal.textContent = currency.format(0); }
          if (cartDelivery) { cartDelivery.textContent = currency.format(0); }
          if (cartTotal) { cartTotal.textContent = currency.format(0); }
          updateCheckoutPage();
        }, { once: true });
      }
    });
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealElements.forEach((element) => observer.observe(element));

// Country to ZIP format mapping
const countryZipFormats = {
  'Nigeria': { format: '100001', example: 'Nigerian: 100001', phone: '+2349012345678', code: '+234' },
  'United States': { format: '12345', example: 'US: 12345', phone: '+12015550123', code: '+1' },
  'Canada': { format: 'K1A 0B1', example: 'Canada: K1A 0B1', phone: '+14165551234', code: '+1' },
  'United Kingdom': { format: 'SW1A 1AA', example: 'UK: SW1A 1AA', phone: '+447911123456', code: '+44' },
  'Germany': { format: '10115', example: 'Germany: 10115', phone: '+491234567890', code: '+49' },
  'France': { format: '75001', example: 'France: 75001', phone: '+33123456789', code: '+33' },
  'Italy': { format: '00100', example: 'Italy: 00100', phone: '+393912345678', code: '+39' },
  'Spain': { format: '28001', example: 'Spain: 28001', phone: '+34912345678', code: '+34' },
  'Australia': { format: '2000', example: 'Australia: 2000', phone: '+61212345678', code: '+61' },
  'India': { format: '110001', example: 'India: 110001', phone: '+919876543210', code: '+91' },
  'Ghana': { format: 'GA 100 100', example: 'Ghana: GA 100 100', phone: '+233201234567', code: '+233' },
  'Kenya': { format: '00100', example: 'Kenya: 00100', phone: '+254701234567', code: '+254' },
  'South Africa': { format: '0001', example: 'South Africa: 0001', phone: '+27123456789', code: '+27' },
  'Egypt': { format: '11511', example: 'Egypt: 11511', phone: '+201001234567', code: '+20' },
  'Japan': { format: '100-0001', example: 'Japan: 100-0001', phone: '+81312345678', code: '+81' },
  'China': { format: '100000', example: 'China: 100000', phone: '+8610123456789', code: '+86' },
  'Brazil': { format: '01310-100', example: 'Brazil: 01310-100', phone: '+551123456789', code: '+55' },
  'Mexico': { format: '06500', example: 'Mexico: 06500', phone: '+525512345678', code: '+52' }
};

// Handle country selection change
const countrySelect = document.getElementById('country-select');
const zipInput = document.getElementById('zip-input');
const phoneInput = document.getElementById('phone-input');

if (countrySelect && zipInput) {
  countrySelect.addEventListener('change', (event) => {
    const selectedCountry = event.target.value;
    
    if (selectedCountry && countryZipFormats[selectedCountry]) {
      zipInput.placeholder = countryZipFormats[selectedCountry].example;
      zipInput.setAttribute('data-country', selectedCountry);
      
      // Update phone placeholder too
      if (phoneInput) {
        phoneInput.placeholder = `e.g. ${countryZipFormats[selectedCountry].phone}`;
        phoneInput.setAttribute('data-country', selectedCountry);
      }
    } else {
      zipInput.placeholder = 'Postal / ZIP code';
      zipInput.removeAttribute('data-country');
      
      if (phoneInput) {
        phoneInput.placeholder = 'e.g. +2348012345678';
        phoneInput.removeAttribute('data-country');
      }
    }
  });
  
  // Set initial placeholder if a country is already selected
  if (countrySelect.value && countryZipFormats[countrySelect.value]) {
    zipInput.placeholder = countryZipFormats[countrySelect.value].example;
    if (phoneInput) {
      phoneInput.placeholder = `e.g. ${countryZipFormats[countrySelect.value].phone}`;
    }
  }
}

// Handle checkout country selection
const checkoutCountrySelect = document.getElementById('checkout-country-select');
const checkoutPhoneInput = document.getElementById('checkout-phone');

if (checkoutCountrySelect && checkoutPhoneInput) {
  checkoutCountrySelect.addEventListener('change', (event) => {
    const selectedCountry = event.target.value;
    
    if (selectedCountry && countryZipFormats[selectedCountry]) {
      checkoutPhoneInput.placeholder = `e.g. ${countryZipFormats[selectedCountry].phone}`;
      checkoutPhoneInput.setAttribute('data-country', selectedCountry);
    } else {
      checkoutPhoneInput.placeholder = 'e.g. +2348012345678';
      checkoutPhoneInput.removeAttribute('data-country');
    }
  });
  
  // Set initial placeholder if a country is already selected
  if (checkoutCountrySelect.value && countryZipFormats[checkoutCountrySelect.value]) {
    checkoutPhoneInput.placeholder = `e.g. ${countryZipFormats[checkoutCountrySelect.value].phone}`;
  }
}
