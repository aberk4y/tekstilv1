const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Helper to get product details
const getProduct = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// GET Cart Page (HTML)
router.get('/', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/cart.html'));
});

// GET Cart Data (API)
router.get('/data', async (req, res) => {
    const cart = req.session.cart || [];
    let cartItems = [];
    let subtotal = 0;
    let shipping = 300;
    
    for (let item of cart) {
        let product = await getProduct(item.productId);
        if (product) {
            const price = parseFloat(product.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            
            cartItems.push({
                product: product,
                quantity: quantity,
                size: item.size,
                lineTotal: price * quantity
            });
            subtotal += price * quantity;
        }
    }
    
    let total = subtotal + shipping;
    if (cartItems.length === 0) {
         total = 0;
         shipping = 0;
    }

    // Fetch User Addresses and Payment Methods if Logged In
    let addresses = null;
    let paymentMethods = null;
    if (req.session.user) {
        addresses = [];
        paymentMethods = [];
        try {
            addresses = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM addresses WHERE user_id = ?", [req.session.user.id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            paymentMethods = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM payment_methods WHERE user_id = ?", [req.session.user.id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (e) {
            console.error("Error fetching user details for cart:", e);
        }
    }

    res.json({ cart: cartItems, subtotal, shipping, total, addresses, paymentMethods });
});

// POST Add to Cart
router.post('/add', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Giriş yapmalısınız.' });
    }

    const { productId, quantity, size } = req.body;
    let cart = req.session.cart || [];

    let existingItem = cart.find(item => item.productId == productId && item.size === size);
    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        cart.push({ productId: parseInt(productId), quantity: parseInt(quantity), size });
    }

    req.session.cart = cart;
    res.json({ success: true, message: 'Sepete eklendi.' });
});

// POST Remove from Cart
router.post('/remove', (req, res) => {
    const { productId, size } = req.body;
    let cart = req.session.cart || [];
    
    req.session.cart = cart.filter(item => !(item.productId == productId && item.size === size));
    res.json({ success: true });
});

// GET Checkout Page
router.get('/checkout', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/checkout.html'));
});

// GET Success Page
router.get('/success', (req, res) => {
     const path = require('path');
     res.sendFile(path.join(__dirname, '../views/public/success.html'));
});

// POST Place Order (Final Step)
router.post('/place-order', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Giriş yapmalısınız.' });
    
    // 1. Capture Payload
    const { addressId, paymentId } = req.body;
    if (!addressId || !paymentId) {
        return res.status(400).json({ error: 'Adres ve ödeme yöntemi zorunludur.' });
    }

    // 2. Capture Cart
    const cart = req.session.cart || [];
    if (cart.length === 0) return res.status(400).json({ error: 'Sepet boş.' });

    // 3. Optimistic Clear
    req.session.cart = [];
    const restoreCart = () => { req.session.cart = cart; };

    try {
        // 4. Fetch Products & Calculate Total
        const productPromises = cart.map(item => getProduct(item.productId));
        const products = await Promise.all(productPromises);

        let total = 0;
        const validItems = [];

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const item = cart[i];
            
            if (!product) {
                restoreCart();
                return res.status(400).json({ error: `Ürün bulunamadı: ID ${item.productId}` });
            }
            
            total += product.price * item.quantity;
            validItems.push({
                product: product,
                cartItem: item
            });
        }
        
        total += 300; // Shipping

        // 5. Database Transaction
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                // Insert Order with Address and Payment IDs
                db.run("INSERT INTO orders (user_id, total_amount, status, address_id, payment_id) VALUES (?, ?, ?, ?, ?)", 
                    [req.session.user.id, total, 'Hazırlanıyor', addressId, paymentId], 
                    function(err) {
                        if (err) return reject(err);
                        
                        const orderId = this.lastID;
                        const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)");
                        
                        let completed = 0;
                        let hasError = false;

                        if (validItems.length === 0) {
                             db.run("COMMIT", (err) => {
                                if (err) reject(err);
                                else resolve(orderId);
                             });
                             return;
                        }

                        validItems.forEach(vi => {
                            if (hasError) return;
                            stmt.run(orderId, vi.cartItem.productId, vi.cartItem.quantity, vi.product.price, vi.cartItem.size, (err) => {
                                if (hasError) return;
                                if (err) {
                                    hasError = true;
                                    reject(err);
                                } else {
                                    completed++;
                                    if (completed === validItems.length) {
                                        stmt.finalize();
                                        db.run("COMMIT", (err) => {
                                            if (err) reject(err);
                                            else resolve(orderId);
                                        });
                                    }
                                }
                            });
                        });
                    }
                );
            });
        });

        // Success
        res.json({ success: true, orderId: orderId }); // Send orderId for success page

    } catch (err) {
        console.error("Place Order Error:", err);
        db.run("ROLLBACK");
        restoreCart();
        res.status(500).json({ error: 'Sipariş oluşturulurken bir hata oluştu.' });
    }
});

module.exports = router;
