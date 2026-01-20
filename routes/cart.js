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

    res.json({ cart: cartItems, subtotal, shipping, total });
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

// POST Checkout
router.post('/checkout', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Giriş yapmalısınız.' });
    
    // 1. Capture Cart
    const cart = req.session.cart || [];
    if (cart.length === 0) return res.status(400).json({ error: 'Sepet boş.' });

    // 2. Optimistic Clear (Prevent Double Submit Race)
    // We save the cart to a local variable (cart) and clear the session immediately.
    // If anything fails, we must restore it.
    req.session.cart = [];

    // Helper to restore cart on error
    const restoreCart = () => {
        req.session.cart = cart;
    };

    try {
        // 3. Fetch Products & Calculate Total
        // Fetch all products in parallel
        const productPromises = cart.map(item => getProduct(item.productId));
        const products = await Promise.all(productPromises);

        let total = 0;
        const validItems = [];

        // Validate products and calculate total
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const item = cart[i];
            
            if (!product) {
                // Product might have been deleted. Skip or Error? 
                // Currently skipping implies free item or error. Let's error to be safe.
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

        // 4. Database Transaction
        // Wrap everything in a Promise to use await with standard sqlite3 callbacks if needed, 
        // or just use await if using a wrapper (we seem to be using standard sqlite3 which is callback based).
        // We'll wrap the transaction flow in a single Promise for clean async/await usage.

        await new Promise((resolve, reject) => {
            db.serialize(() => {
                // A. Begin
                db.run("BEGIN TRANSACTION");

                // B. Insert Order
                db.run("INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)", 
                    [req.session.user.id, total, 'Hazırlanıyor'], 
                    function(err) {
                        if (err) {
                            return reject(err); // Will trigger rollback in catch
                        }
                        const orderId = this.lastID;

                        // C. Insert Items
                        const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)");
                        
                        // We use a counter or promise loop to track statement completion? 
                        // Parallel execution inside serialization might be tricky. 
                        // It's safer to execute sequentially or track specific completion.
                        
                        let completed = 0;
                        let hasError = false;

                        if (validItems.length === 0) {
                             // Should not happen check above
                             db.run("COMMIT", (err) => {
                                if (err) reject(err);
                                else resolve();
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
                                        // D. Commit
                                        db.run("COMMIT", (err) => {
                                            if (err) reject(err);
                                            else resolve();
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
        res.json({ success: true, redirectUrl: '/user/orders' });

    } catch (err) {
        console.error("Checkout Error:", err);
        // Rollback
        db.run("ROLLBACK");
        restoreCart();
        res.status(500).json({ error: 'Sipariş oluşturulurken bir hata oluştu.' });
    }
});

module.exports = router;
