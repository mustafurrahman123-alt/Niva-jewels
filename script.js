// Global state
let currentUser = null;
let currentPage = 'home';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// API base URL
const API_URL = '';

// Helper: Update cart count in navbar
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = count;
}

// Helper: Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Helper: Add to cart
function addToCart(productId, productName, price, image, quantity = 1) {
    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ productId, productName, price, image, quantity });
    }
    saveCart();
    showToast('Added to cart!', 'success');
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-20 right-6 z-50 px-4 py-2 rounded shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-blue-500'} transition-opacity duration-300`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Fetch products
async function fetchProducts() {
    const res = await fetch(`${API_URL}/api/products`);
    products = await res.json();
    return products;
}

// Render home page
async function renderHome() {
    await fetchProducts();
    const featured = products.slice(0, 4);
    return `
        <div class="text-center mb-12">
            <h1 class="text-4xl md:text-5xl font-bold text-gray-800">Welcome to Niva Jewels</h1>
            <p class="text-gray-600 mt-4 text-lg">Discover timeless elegance and craftsmanship</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div class="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl p-8 text-center">
                <i class="fas fa-ring text-5xl text-yellow-700 mb-4"></i>
                <h3 class="text-2xl font-semibold">Exclusive Rings</h3>
                <p class="mt-2">Diamond & Gold collections</p>
            </div>
            <div class="bg-gradient-to-r from-gray-100 to-stone-100 rounded-xl p-8 text-center">
                <i class="fas fa-gem text-5xl text-yellow-700 mb-4"></i>
                <h3 class="text-2xl font-semibold">Fine Jewelry</h3>
                <p class="mt-2">Necklaces, Earrings & Bracelets</p>
            </div>
        </div>
        <h2 class="text-2xl font-bold mb-6">Featured Collection</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${featured.map(product => `
                <div class="bg-white rounded-lg shadow product-card overflow-hidden">
                    <img src="${product.image_url || 'https://via.placeholder.com/300'}" alt="${product.name}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <h3 class="font-semibold text-lg">${product.name}</h3>
                        <p class="text-yellow-600 font-bold mt-1">₹${product.price.toLocaleString()}</p>
                        <button onclick="addToCart(${product.id}, '${product.name}', ${product.price}, '${product.image_url}')" class="mt-3 w-full btn-primary">Add to Cart</button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-8">
            <button onclick="showPage('products')" class="btn-primary px-6">View All Products</button>
        </div>
    `;
}

// Render products page
async function renderProducts() {
    await fetchProducts();
    return `
        <h1 class="text-3xl font-bold mb-6">All Jewelry</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${products.map(product => `
                <div class="bg-white rounded-lg shadow product-card">
                    <img src="${product.image_url || 'https://via.placeholder.com/300'}" alt="${product.name}" class="w-full h-48 object-cover rounded-t-lg">
                    <div class="p-4">
                        <h3 class="font-semibold text-lg">${product.name}</h3>
                        <p class="text-gray-600 text-sm mt-1">${product.description.substring(0, 60)}</p>
                        <p class="text-yellow-600 font-bold mt-2">₹${product.price.toLocaleString()}</p>
                        <p class="text-xs text-gray-500">Stock: ${product.stock}</p>
                        <button onclick="addToCart(${product.id}, '${product.name}', ${product.price}, '${product.image_url}')" class="mt-3 w-full btn-primary">Add to Cart</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render cart page
function renderCart() {
    if (cart.length === 0) {
        return `<div class="text-center py-12"><i class="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i><p class="text-gray-500">Your cart is empty</p><button onclick="showPage('products')" class="mt-4 btn-primary">Shop Now</button></div>`;
    }
    
    let total = 0;
    const itemsHtml = cart.map((item, idx) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="flex flex-col md:flex-row justify-between items-center border-b py-4">
                <div class="flex items-center space-x-4 w-full md:w-2/3">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" class="w-16 h-16 object-cover rounded">
                    <div>
                        <h3 class="font-semibold">${item.productName}</h3>
                        <p class="text-yellow-600">₹${item.price.toLocaleString()}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2 mt-2 md:mt-0">
                    <button onclick="updateQuantity(${idx}, -1)" class="bg-gray-200 px-2 py-1 rounded">-</button>
                    <span class="w-8 text-center">${item.quantity}</span>
                    <button onclick="updateQuantity(${idx}, 1)" class="bg-gray-200 px-2 py-1 rounded">+</button>
                    <button onclick="removeFromCart(${idx})" class="text-red-500 ml-4"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <h1 class="text-2xl font-bold mb-6">Shopping Cart</h1>
        <div class="flex flex-col lg:flex-row gap-8">
            <div class="lg:w-2/3">
                ${itemsHtml}
            </div>
            <div class="lg:w-1/3 bg-gray-100 p-6 rounded-lg h-fit">
                <h2 class="text-xl font-semibold mb-4">Order Summary</h2>
                <div class="flex justify-between py-2">
                    <span>Subtotal</span>
                    <span>₹${total.toLocaleString()}</span>
                </div>
                <div class="flex justify-between py-2 border-t">
                    <span class="font-bold">Total</span>
                    <span class="font-bold text-yellow-600">₹${total.toLocaleString()}</span>
                </div>
                ${currentUser ? `<button onclick="showPage('checkout')" class="w-full mt-4 btn-primary">Proceed to Checkout</button>` : `<p class="text-sm text-red-500 mt-2">Please <a href="#" onclick="showPage('login')" class="underline">login</a> to checkout</p>`}
            </div>
        </div>
    `;
}

function updateQuantity(index, delta) {
    const newQty = cart[index].quantity + delta;
    if (newQty < 1) {
        cart.splice(index, 1);
    } else {
        cart[index].quantity = newQty;
    }
    saveCart();
    showPage('cart');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    showPage('cart');
}

// Render checkout
function renderCheckout() {
    if (!currentUser) {
        showPage('login');
        return '<div>Please login</div>';
    }
    if (cart.length === 0) {
        showPage('cart');
        return '';
    }
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    return `
        <h1 class="text-2xl font-bold mb-6">Checkout</h1>
        <div class="flex flex-col lg:flex-row gap-8">
            <div class="lg:w-2/3">
                <form id="checkoutForm" class="bg-white p-6 rounded shadow">
                    <h2 class="text-lg font-semibold mb-4">Shipping Details</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" id="address" placeholder="Street Address" class="border p-2 rounded" required>
                        <input type="text" id="city" placeholder="City" class="border p-2 rounded" required>
                        <input type="text" id="pincode" placeholder="Pincode" class="border p-2 rounded" required>
                        <input type="tel" id="phone" placeholder="Phone Number" class="border p-2 rounded" required>
                    </div>
                    <div class="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
                        <h3 class="font-semibold flex items-center"><i class="fas fa-phone-alt mr-2"></i>UPI Payment</h3>
                        <p>Pay to UPI ID: <span class="font-mono bg-white px-2 py-1 rounded">9706011300@ybl</span> or use number <strong>9706011300</strong></p>
                        <p class="text-sm text-gray-600 mt-1">After payment, click "Place Order" and admin will verify your payment.</p>
                    </div>
                    <button type="submit" class="mt-6 w-full btn-primary">Place Order (₹${total.toLocaleString()})</button>
                </form>
            </div>
            <div class="lg:w-1/3 bg-gray-100 p-6 rounded h-fit">
                <h2 class="font-semibold">Order Items</h2>
                ${cart.map(i => `<div class="flex justify-between py-1"><span>${i.productName} x${i.quantity}</span><span>₹${(i.price*i.quantity).toLocaleString()}</span></div>`).join('')}
                <div class="border-t pt-2 mt-2 font-bold flex justify-between"><span>Total</span><span>₹${total.toLocaleString()}</span></div>
            </div>
        </div>
    `;
}

// Submit order
async function submitOrder(e) {
    e.preventDefault();
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const orderData = {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
        total,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        pincode: document.getElementById('pincode').value,
        phone: document.getElementById('phone').value,
        paymentMethod: 'UPI_9706011300'
    };
    
    const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(orderData)
    });
    if (res.ok) {
        cart = [];
        saveCart();
        showToast('Order placed! Admin will confirm payment via UPI: 9706011300', 'success');
        showPage('home');
    } else {
        const err = await res.json();
        showToast(err.error || 'Order failed', 'error');
    }
}

// Admin dashboard
async function renderAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        showPage('home');
        return '<div>Access denied</div>';
    }
    const [ordersRes, productsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/orders`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    ]);
    const orders = await ordersRes.json();
    const productsAdmin = await productsRes.json();
    const users = await usersRes.json();
    
    return `
        <h1 class="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div class="mb-8">
            <button onclick="showAdminProductForm()" class="btn-primary mb-2">+ Add New Product</button>
            <div class="overflow-x-auto">
                <table class="admin-table">
                    <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${productsAdmin.map(p => `
                            <tr>
                                <td>${p.id}</td><td>${p.name}</td><td>₹${p.price}</td><td>${p.stock}</td>
                                <td><button onclick="deleteProduct(${p.id})" class="text-red-600 mr-2">Delete</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="mb-8">
            <h2 class="text-xl font-semibold mb-2">Orders</h2>
            <div class="overflow-x-auto">
                <table class="admin-table">
                    <thead><tr><th>Order ID</th><th>User</th><th>Total</th><th>Payment Status</th><th>Order Status</th><th>Action</th></tr></thead>
                    <tbody>
                        ${orders.map(o => `
                            <tr>
                                <td>${o.id}</td><td>${o.user_name}</td><td>₹${o.total}</td>
                                <td><span class="px-2 py-1 rounded text-xs ${o.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${o.payment_status}</span></td>
                                <td>${o.order_status}</td>
                                <td>
                                    <select onchange="updateOrder(${o.id}, this.value, '${o.payment_status}')" class="border rounded p-1">
                                        <option value="pending" ${o.order_status==='pending'?'selected':''}>Pending</option>
                                        <option value="processing" ${o.order_status==='processing'?'selected':''}>Processing</option>
                                        <option value="shipped" ${o.order_status==='shipped'?'selected':''}>Shipped</option>
                                        <option value="delivered" ${o.order_status==='delivered'?'selected':''}>Delivered</option>
                                    </select>
                                    <button onclick="markPaymentPaid(${o.id})" class="ml-2 bg-green-500 text-white px-2 py-1 rounded text-xs">Mark Paid</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div>
            <h2 class="text-xl font-semibold mb-2">Users</h2>
            <table class="admin-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>${users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td></tr>`).join('')}</tbody>
            </table>
        </div>
        <div id="adminProductForm" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"><div class="bg-white rounded p-6 w-full max-w-md"></div></div>
    `;
}

async function updateOrder(orderId, status, currentPayment) {
    await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ order_status: status })
    });
    showToast('Order updated');
    showPage('admin');
}

async function markPaymentPaid(orderId) {
    await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ payment_status: 'paid' })
    });
    showToast('Payment marked as paid');
    showPage('admin');
}

async function deleteProduct(id) {
    if (confirm('Delete product?')) {
        await fetch(`${API_URL}/api/admin/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        showPage('admin');
    }
}

function showAdminProductForm() {
    alert('Product form - implement via modal or separate page for simplicity. Use API endpoint.');
}

// Login/Register forms
function renderLogin() {
    return `
        <div class="max-w-md mx-auto bg-white p-8 rounded shadow">
            <h2 class="text-2xl font-bold mb-6 text-center">Login to Niva Jewels</h2>
            <form id="loginForm">
                <input type="email" id="loginEmail" placeholder="Email" class="w-full border p-2 mb-3 rounded" required>
                <input type="password" id="loginPassword" placeholder="Password" class="w-full border p-2 mb-4 rounded" required>
                <button type="submit" class="w-full btn-primary">Login</button>
            </form>
            <p class="text-center mt-4">Don't have an account? <a href="#" onclick="showPage('register')" class="text-yellow-600">Register</a></p>
        </div>
    `;
}

function renderRegister() {
    return `
        <div class="max-w-md mx-auto bg-white p-8 rounded shadow">
            <h2 class="text-2xl font-bold mb-6 text-center">Register</h2>
            <form id="registerForm">
                <input type="text" id="regName" placeholder="Full Name" class="w-full border p-2 mb-3 rounded" required>
                <input type="email" id="regEmail" placeholder="Email" class="w-full border p-2 mb-3 rounded" required>
                <input type="password" id="regPassword" placeholder="Password" class="w-full border p-2 mb-4 rounded" required>
                <button type="submit" class="w-full btn-primary">Register</button>
            </form>
            <p class="text-center mt-4">Already have an account? <a href="#" onclick="showPage('login')" class="text-yellow-600">Login</a></p>
        </div>
    `;
}

// Auth handlers
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user) {
            currentUser = user;
            updateAuthUI();
        }
    }
    showPage('home');
});

function updateAuthUI() {
    const authLink = document.getElementById('authLink');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    if (currentUser) {
        authLink.textContent = currentUser.name;
        authLink.onclick = () => showPage('orders');
        logoutBtn.style.display = 'inline-block';
        if (currentUser.role === 'admin') {
            adminLink.style.display = 'inline-block';
        }
    } else {
        authLink.textContent = 'Login';
        authLink.onclick = () => showPage('login');
        logoutBtn.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

async function showPage(page) {
    currentPage = page;
    const app = document.getElementById('app');
    if (page === 'home') app.innerHTML = await renderHome();
    else if (page === 'products') app.innerHTML = await renderProducts();
    else if (page === 'cart') app.innerHTML = renderCart();
    else if (page === 'checkout') app.innerHTML = renderCheckout();
    else if (page === 'login') app.innerHTML = renderLogin();
    else if (page === 'register') app.innerHTML = renderRegister();
    else if (page === 'admin') app.innerHTML = await renderAdmin();
    else if (page === 'orders') app.innerHTML = await renderOrders();
    
    if (page === 'checkout') {
        document.getElementById('checkoutForm')?.addEventListener('submit', submitOrder);
    }
    if (page === 'login') {
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUser = data.user;
                updateAuthUI();
                showPage('home');
            } else alert('Login failed');
        });
    }
    if (page === 'register') {
        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const res = await fetch(`${API_URL}/api/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                currentUser = data.user;
                updateAuthUI();
                showPage('home');
            } else alert('Registration failed');
        });
    }
}

async function renderOrders() {
    const res = await fetch(`${API_URL}/api/orders`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const orders = await res.json();
    if (!orders.length) return '<div class="text-center py-12">No orders yet</div>';
    return `<h1 class="text-2xl font-bold mb-6">My Orders</h1><div class="space-y-4">${orders.map(o => `<div class="bg-white p-4 rounded shadow"><p><strong>Order #${o.id}</strong> - Total: ₹${o.total} - Status: ${o.order_status} - Payment: ${o.payment_status}</p><p class="text-sm text-gray-500">${new Date(o.created_at).toLocaleDateString()}</p></div>`).join('')}</div>`;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI();
    showPage('home');
}

window.showPage = showPage;
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.logout = logout;
window.deleteProduct = deleteProduct;
window.updateOrder = updateOrder;
window.markPaymentPaid = markPaymentPaid;