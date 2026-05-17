const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'niva_jewels_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for product images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage });

// Database setup
const db = new sqlite3.Database('./database.sqlite');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        image_url TEXT,
        stock INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total REAL NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        pincode TEXT NOT NULL,
        phone TEXT NOT NULL,
        payment_method TEXT DEFAULT 'UPI_9706011300',
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Insert default admin if not exists
    const adminEmail = 'admin@nivajewels.com';
    db.get(`SELECT * FROM users WHERE email = ?`, [adminEmail], (err, row) => {
        if (!row) {
            bcrypt.hash('admin123', 10, (err, hash) => {
                db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
                    ['Admin', adminEmail, hash, 'admin']);
            });
        }
    });

    // Insert sample products if none
    db.get(`SELECT COUNT(*) as count FROM products`, (err, row) => {
        if (row.count === 0) {
            const sampleProducts = [
                ['Diamond Solitaire Ring', 'Beautiful 1 carat diamond ring in 18k gold', 29999, 'rings', '/uploads/sample-ring.jpg', 15],
                ['Pearl Necklace', 'Elegant freshwater pearl necklace', 14999, 'necklaces', '/uploads/sample-necklace.jpg', 10],
                ['Gold Hoop Earrings', 'Classic 22k gold hoop earrings', 8999, 'earrings', '/uploads/sample-earrings.jpg', 20],
                ['Emerald Bracelet', 'Green emerald stone bracelet', 19999, 'bracelets', '/uploads/sample-bracelet.jpg', 8],
                ['Sapphire Pendant', 'Blue sapphire pendant with chain', 24999, 'pendants', '/uploads/sample-pendant.jpg', 12]
            ];
            sampleProducts.forEach(p => {
                db.run(`INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)`, p);
            });
        }
    });
});

// Helper: Verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
};

// ========== PUBLIC ROUTES ==========
// Get all products
app.get('/api/products', (req, res) => {
    db.all(`SELECT * FROM products ORDER BY id DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

// ========== AUTH ROUTES ==========
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
                return res.status(500).json({ error: err.message });
            }
            const token = jwt.sign({ id: this.lastID, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: this.lastID, name, email, role: 'user' } });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});

// ========== ORDER ROUTES ==========
app.post('/api/orders', authenticateToken, (req, res) => {
    const { items, total, address, city, pincode, phone, paymentMethod } = req.body;
    if (!items || !items.length || !address || !city || !pincode || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(`INSERT INTO orders (user_id, total, address, city, pincode, phone, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, total, address, city, pincode, phone, paymentMethod || 'UPI_9706011300'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = this.lastID;
            
            // Insert order items
            const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`);
            items.forEach(item => {
                stmt.run(orderId, item.productId, item.quantity, item.price);
                // Update stock
                db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.quantity, item.productId]);
            });
            stmt.finalize();
            
            res.json({ orderId, message: 'Order placed successfully. Please complete payment to UPI ID: 9706011300' });
        });
});

app.get('/api/orders', authenticateToken, (req, res) => {
    const query = `
        SELECT o.*, 
               GROUP_CONCAT(oi.product_id || ':' || oi.quantity || ':' || oi.price) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    db.all(query, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ========== ADMIN ROUTES ==========
// Get all orders (admin)
app.get('/api/admin/orders', authenticateToken, isAdmin, (req, res) => {
    db.all(`SELECT o.*, u.name as user_name, u.email as user_email 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update order status (admin)
app.put('/api/admin/orders/:id', authenticateToken, isAdmin, (req, res) => {
    const { payment_status, order_status } = req.body;
    db.run(`UPDATE orders SET payment_status = COALESCE(?, payment_status), order_status = COALESCE(?, order_status) WHERE id = ?`,
        [payment_status, order_status, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Order updated' });
        });
});

// Create product (admin)
app.post('/api/admin/products', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
    const { name, description, price, category, stock } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : '';
    db.run(`INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, category, image_url, stock || 10], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Product added' });
        });
});

// Update product (admin)
app.put('/api/admin/products/:id', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
    const { name, description, price, category, stock } = req.body;
    let query = `UPDATE products SET name=?, description=?, price=?, category=?, stock=?`;
    let params = [name, description, price, category, stock];
    
    if (req.file) {
        query += `, image_url=?`;
        params.push(`/uploads/${req.file.filename}`);
    }
    query += ` WHERE id=?`;
    params.push(req.params.id);
    
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product updated' });
    });
});

// Delete product (admin)
app.delete('/api/admin/products/:id', authenticateToken, isAdmin, (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product deleted' });
    });
});

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    db.all(`SELECT id, name, email, role, created_at FROM users`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
