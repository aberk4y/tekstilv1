const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'cristobal.db');
const db = new sqlite3.Database(dbPath);

const adminPassword = 'admin'; 
const adminHash = bcrypt.hashSync(adminPassword, 10);

db.serialize(() => {
    // Drop tables to ensure fresh schema
    db.run("DROP TABLE IF EXISTS product_images");
    db.run("DROP TABLE IF EXISTS order_items");
    db.run("DROP TABLE IF EXISTS orders");
    db.run("DROP TABLE IF EXISTS products");
    db.run("DROP TABLE IF EXISTS users");

    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Products Table Update
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_tr TEXT,
        name_en TEXT,
        description_tr TEXT,
        description_en TEXT,
        fabric_info TEXT, -- Tab 2
        return_info TEXT, -- Tab 3
        price REAL,
        category TEXT,
        cover_image_url TEXT, -- New dedicated cover image
        stock INTEGER DEFAULT 10
    )`);

    // Product Images Table (One-to-Many)
    db.run(`CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        image_url TEXT,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Product Sizes Table (One-to-Many)
    db.run(`CREATE TABLE IF NOT EXISTS product_sizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        size TEXT,
        stock INTEGER DEFAULT 0,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Orders Table & Items (Unchanged)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_amount REAL,
        status TEXT DEFAULT 'Hazırlanıyor',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL,
        size TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);
    
    // 3. Seed Admin (Ensuring it exists)
    db.get("SELECT * FROM users WHERE role = 'admin'", [], (err, row) => {
         if(!row) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            db.run("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)", 
                ['Admin', 'admin@cristobal.com', hash, 'admin']);
            console.log("Admin user seeded.");
         }
    });

    // Seed Products & Images (Re-seeding)
    db.run("DELETE FROM product_images");
    db.run("DELETE FROM products", [], (err) => {
        if(err) console.log("Error deleting products:", err);
        
        const products = [
            {
                name_tr: "Siyah Yün Karışımlı Kaban",
                name_en: "Black Wool Blend Coat",
                desc_tr: "İtalyan yünü karışımlı, kış ayları için ideal, şık ve sofistike uzun kaban. Geniş kırlangıç yaka detayı.",
                desc_en: "Italian wool blend, ideal for winter, stylish and sophisticated long coat.",
                fabric: "%70 Yün, %30 Polyamid. Kuru temizleme önerilir.",
                return: "14 gün içinde ücretsiz iade ve değişim garantisi.",
                price: 8500,
                category: "Kaban",
                stock: 50,
                cover_image: "/images/ACE007261066SYH_20.jpg",
                images: ["/images/ACE007261066SYH_20.jpg", "/images/ACE007261066SYH_23.jpg", "/images/ACE007261066SYH_25.jpg"]
            },
            {
                name_tr: "Klasik Siyah Kaban",
                name_en: "Classic Black Coat",
                desc_tr: "Minimalist tasarım, her kombinle uyumlu klasik kesim.",
                desc_en: "Minimalist design, classic cut compatible with every outfit.",
                fabric: "%60 Yün, %40 Viskoz. Sadece kuru temizleme.",
                return: "Kullanılmamış ürünlerde 30 gün değişim hakkı.",
                price: 7200,
                category: "Kaban",
                stock: 45,
                cover_image: "/images/ACE007261066SYH_23.jpg",
                images: ["/images/ACE007261066SYH_23.jpg", "/images/ACE007261066SYH_26.jpg"]
            },
             {
                name_tr: "Lacivert Slim Fit Kaban",
                name_en: "Navy Blue Slim Fit Coat",
                desc_tr: "Vücuda oturan kesim, modern ve dinamik görünüm.",
                desc_en: "Slim fit, modern and dynamic look.",
                fabric: "%80 Yün, %20 Kaşmir. Hassas kullanım.",
                return: "14 gün içinde iade.",
                price: 7900,
                category: "Kaban",
                stock: 30,
                cover_image: "/images/ACE007261066SYH_25.jpg",
                images: ["/images/ACE007261066SYH_25.jpg", "/images/ACE007261066SYH_20.jpg"]
            },
            {
                name_tr: "Haki Şişme Mont",
                name_en: "Khaki Puffer Jacket",
                desc_tr: "Su geçirmez kumaş, kaz tüyü dolgulu, maksimum sıcaklık.",
                desc_en: "Waterproof fabric, goose down filled, maximum warmth.",
                fabric: "%100 Polyester, Kaz Tüyü Dolgu.",
                return: "Etiketi koparılmamış ürünlerde iade.",
                price: 6500,
                category: "Mont",
                stock: 60,
                cover_image: "/images/ACE007261047SYH_13.jpg",
                images: ["/images/ACE007261047SYH_13.jpg", "/images/ACE007261047SYH_14.jpg"]
            },
            {
                name_tr: "Siyah Kapüşonlu Mont",
                name_en: "Black Hooded Puffer",
                desc_tr: "Çıkarılabilir kapüşon, fonksiyonel cepler ve rahat kesim.",
                desc_en: "Detachable hood, functional pockets and comfortable fit.",
                fabric: "Teknolojik su itici kumaş.",
                return: "Yurtiçi Kargo ile ücretsiz iade.",
                price: 6800,
                category: "Mont",
                stock: 55,
                cover_image: "/images/ACE007261047SYH_14.jpg",
                images: ["/images/ACE007261047SYH_14.jpg", "/images/ACE007261047SYH_15.jpg", "/images/ACE007261047SYH_9.jpg"]
            }
        ];

        const stmt = db.prepare("INSERT INTO products (name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, cover_image_url, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        products.forEach(p => {
            stmt.run(p.name_tr, p.name_en, p.desc_tr, p.desc_en, p.fabric, p.return, p.price, p.category, p.cover_image, p.stock, function(err) {
                if(err) console.error(err);
                const productId = this.lastID;
                if(p.images && p.images.length > 0) {
                    const imgStmt = db.prepare("INSERT INTO product_images (product_id, image_url) VALUES (?, ?)");
                    p.images.forEach(img => imgStmt.run(productId, img));
                    imgStmt.finalize();
                }

                // Insert Default Sizes
                const sizeStmt = db.prepare("INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)");
                ['48', '50', '52', '54', '56'].forEach(size => sizeStmt.run(productId, size, Math.floor(p.stock / 5))); // Distribute stock roughly
                sizeStmt.finalize();
            });
        });
        stmt.finalize();
        console.log("Seeded products with details and images.");
    });

    console.log("Database tables created.");
});
// db.close() removed to prevent early closure. Process exit will handle it.
// End of script

