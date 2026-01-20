const express = require('express');
const router = express.Router();
const db = require('../database/database');
const multer = require('multer');
const path = require('path');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    // Redirect to login if not admin, or show error
    res.redirect('/auth/login');
};

router.use(isAdmin);

// Multer Setup for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// GET Admin Dashboard (HTML)
router.get('/', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/admin/dashboard.html'));
});

// GET Dashboard Data (API)
router.get('/data', (req, res) => {
    db.all(`
        SELECT p.*, 
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as first_image 
        FROM products p ORDER BY id DESC
    `, [], (err, products) => {
        if (err) products = [];
        
        // Fetch All Sizes
        db.all("SELECT * FROM product_sizes", [], (err, allSizes) => {
            if (err) allSizes = [];
            
            // Map sizes to products
            products.forEach(p => {
                p.sizes = allSizes.filter(s => s.product_id === p.id);
            });

            // Fetch Orders
            db.all("SELECT orders.*, users.username FROM orders JOIN users ON orders.user_id = users.id ORDER BY created_at DESC", [], (err, orders) => {
                if (err) orders = [];

                // Fetch All Order Items with Product Names
                const itemSql = `
                    SELECT oi.order_id, oi.quantity, oi.size, p.name_tr, p.name_en, oi.product_id
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                `;

                db.all(itemSql, [], (err, items) => {
                    if (err) items = [];
                    
                    // Attach items to their orders
                    orders.forEach(o => {
                        o.items = items.filter(i => i.order_id === o.id);
                    });

                    res.json({ products, orders });
                });
            });
        });
    });
});

// POST Add Product
router.post('/product/add', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'images', maxCount: 10 }]), (req, res) => {
    const { name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, stock } = req.body;
    
    let coverImageUrl = null;
    if (req.files && req.files['cover_image']) {
        coverImageUrl = '/images/' + req.files['cover_image'][0].filename;
    }

    const stmt = db.prepare(`
        INSERT INTO products (name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, stock, cover_image_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, stock, coverImageUrl, function(err) {
        if(err) {
            console.error(err);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        
        const productId = this.lastID;
        
        if (req.files && req.files['images'] && req.files['images'].length > 0) {
            const imgStmt = db.prepare("INSERT INTO product_images (product_id, image_url) VALUES (?, ?)");
            const promises = req.files['images'].map(file => {
                return new Promise((resolve, reject) => {
                    imgStmt.run(productId, '/images/' + file.filename, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });

            Promise.all(promises)
                .then(() => {
                    imgStmt.finalize();
                    // Handle Sizes
                    handleSizes(productId);
                })
                .catch(err => {
                    console.error("Image upload error:", err);
                    // Still try to add sizes
                     handleSizes(productId);
                });
        } else {
             handleSizes(productId);
        }

        function handleSizes(pId) {
             if (req.body.sizes) {
                 try {
                     const sizes = JSON.parse(req.body.sizes);
                     const sizeStmt = db.prepare("INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)");
                     sizes.forEach(s => {
                         sizeStmt.run(pId, s.size, s.stock);
                     });
                     sizeStmt.finalize();
                 } catch (e) {
                     console.error("Size parse error:", e);
                 }
             }
             res.json({ success: true, message: 'Ürün eklendi.' });
        }
    });
    stmt.finalize();
});

// POST Update Product
router.post('/product/update/:id', (req, res) => {
    const { name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, stock } = req.body;
    
    const sql = `UPDATE products SET 
                 name_tr = ?, name_en = ?, description_tr = ?, description_en = ?, 
                 fabric_info = ?, return_info = ?, price = ?, category = ?, stock = ? 
                 WHERE id = ?`;
                 
    db.run(sql, [name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, stock, req.params.id], (err) => {
        if(err) {
            console.error(err);
            return res.status(500).json({ error: 'Hata.' });
        }
        
        // Update Sizes
        if (req.body.sizes) {
            const pId = req.params.id;
            db.run("DELETE FROM product_sizes WHERE product_id = ?", [pId], (err) => {
                 if (!err) {
                     try {
                         const sizes = JSON.parse(req.body.sizes);
                         const sizeStmt = db.prepare("INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)");
                         sizes.forEach(s => {
                             sizeStmt.run(pId, s.size, s.stock);
                         });
                         sizeStmt.finalize();
                     } catch (e) {
                         console.error("Size parse error:", e);
                     }
                 }
                 res.json({ success: true });
            });
        } else {
             res.json({ success: true });
        }
    });
});

// POST Delete Product
router.post('/product/delete/:id', (req, res) => {
    const productId = req.params.id;

    // 1. DELETE FROM order_items (Force Delete History)
    db.run("DELETE FROM order_items WHERE product_id = ?", [productId], (err) => {
        if (err) {
            console.error("Error deleting order items:", err);
            return res.status(500).json({ error: 'Sipariş kayıtları silinemedi.' });
        }

        // 2. Delete associated sizes
        db.run("DELETE FROM product_sizes WHERE product_id = ?", [productId], (err) => {
            if (err) {
                console.error("Error deleting sizes:", err);
                return res.status(500).json({ error: 'Ürün bedenleri silinemedi.' });
            }

            // 3. Delete associated images
            db.run("DELETE FROM product_images WHERE product_id = ?", [productId], (err) => {
                if (err) {
                    console.error("Error deleting images:", err);
                    return res.status(500).json({ error: 'Ürün resimleri silinemedi.' });
                }

                // 4. Delete the product
                db.run("DELETE FROM products WHERE id = ?", [productId], (err) => {
                    if(err) {
                        console.error("Delete Product Error:", err);
                        return res.status(500).json({ error: 'Silme Hatası: ' + err.message });
                    }
                    res.json({ success: true, message: 'Ürün ve tüm geçmiş verileri kalıcı olarak silindi.' });
                });
            });
        });
    });
});


// POST Update Order Status
router.post('/order/update/:id', (req, res) => {
    const { status } = req.body;
    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if(err) return res.status(500).json({ error: 'Hata.' });
        res.json({ success: true });
    });
});

module.exports = router;
