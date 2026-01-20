const express = require('express');
const router = express.Router();
const db = require('../database/database');

// GET /api/products - List all products with filtering
router.get('/products', (req, res) => {
    const category = req.query.category;
    const search = req.query.q;
    let query = "SELECT * FROM products";
    let params = [];
    let whereClauses = [];

    if (category) {
        whereClauses.push("category = ?");
        params.push(category);
    } 
    
    if (search) {
        whereClauses.push("(name_tr LIKE ? OR name_en LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(' AND ');
    }

    query += " ORDER BY id DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET /api/products/latest - Get latest 3 products (for home page)
router.get('/products/latest', (req, res) => {
    db.all("SELECT * FROM products ORDER BY id DESC LIMIT 3", [], (err, rows) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET /api/products/:id - Product details
router.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        if (!product) {
             return res.status(404).json({ error: 'Product not found' });
        }
        
        // Fetch Images
        db.all("SELECT image_url FROM product_images WHERE product_id = ?", [productId], (err, images) => {
             if (err) {
                 // Non-critical error, just return product with empty images or cover
                 console.error(err);
                 images = [];
             }
             
             let imgList = images.map(i => i.image_url);
             if (product.cover_image_url) {
                 imgList.unshift(product.cover_image_url);
             }
             
             // Attach images to product object
             product.images = imgList;
             
             // Fetch Sizes
             db.all("SELECT size, stock FROM product_sizes WHERE product_id = ?", [productId], (err, sizes) => {
                 if (err) {
                     console.error(err);
                     sizes = [];
                 }
                 product.sizes = sizes;
                 res.json(product);
             });
        });
    });
});

// Language Endpoint (Optional, if we want to fetch translations)
router.get('/translations', (req, res) => {
    const lang = req.session.lang || 'tr';
    const fs = require('fs');
    const path = require('path');
    const langFile = path.join(__dirname, '../locales', `${lang}.json`);
    
    if (fs.existsSync(langFile)) {
        res.json(JSON.parse(fs.readFileSync(langFile, 'utf8')));
    } else {
        res.json({});
    }
});

// Current User Endpoint
router.get('/user/me', (req, res) => {
    res.json({ 
        user: req.session.user || null,
        lang: req.session.lang || 'tr'
    });
});

// GET User Orders (List)
router.get('/user/orders', (req, res) => {
    if(!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [req.session.user.id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET Single Order (Detail)
router.get('/user/orders/:id', (req, res) => {
    if(!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const orderId = req.params.id;

    // Get Order
    db.get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [orderId, req.session.user.id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı.' });

        // Get Items
        db.all(`
            SELECT oi.*, p.name_tr, p.name_en, p.cover_image_url 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?`, [orderId], (err, items) => {
            
            if (err) {
                 console.error(err);
                 // Return order without items if items fail? Or error? Error is safer.
                 return res.status(500).json({ error: 'Ürün bilgileri alınamadı.' });
            }
            
            order.items = items;
            res.json(order);
        });
    });
});

// --- ADDRESSES API ---

// GET Addresses
router.get('/user/addresses', (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.all("SELECT * FROM addresses WHERE user_id = ?", [req.session.user.id], (err, rows) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST Add Address
router.post('/user/addresses', (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, full_address, city, district, phone } = req.body;
    db.run("INSERT INTO addresses (user_id, title, full_address, city, district, phone) VALUES (?, ?, ?, ?, ?, ?)",
        [req.session.user.id, title, full_address, city, district, phone], function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// DELETE Address
router.delete('/user/addresses/:id', (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.run("DELETE FROM addresses WHERE id = ? AND user_id = ?", [req.params.id, req.session.user.id], function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- PAYMENT METHODS API ---

// GET Payment Methods
router.get('/user/payment-methods', (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.all("SELECT * FROM payment_methods WHERE user_id = ?", [req.session.user.id], (err, rows) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST Add Payment Method
router.post('/user/payment-methods', (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { card_title, card_number, expiry_date, card_holder_name } = req.body;
    
    // Simple masking: take last 4 chars
    const masked = card_number.slice(-4); 
    // In a real app we would NOT store even this without more security, but for this demo:
    const finalMasked = "**** **** **** " + masked;

    db.run("INSERT INTO payment_methods (user_id, card_title, card_number_masked, expiry_date, card_holder_name) VALUES (?, ?, ?, ?, ?)",
        [req.session.user.id, card_title, finalMasked, expiry_date, card_holder_name], function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// DELETE Payment Method
router.delete('/user/payment-methods/:id', (req, res) => {
    if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.run("DELETE FROM payment_methods WHERE id = ? AND user_id = ?", [req.params.id, req.session.user.id], function(err) {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
