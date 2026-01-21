const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/cristobal.db');
const db = new sqlite3.Database(dbPath);

const imagesDir = path.resolve(__dirname, '../public/images');
const categories = ['ceketler', 'kaban', 'sismemont', 'yelekler'];

const categoryMap = {
    'ceketler': 'Ceket',
    'kaban': 'Kaban',
    'sismemont': 'Mont',
    'yelekler': 'Yelek'
};

db.serialize(() => {
    // Prepare statements
    const productStmt = db.prepare(`INSERT INTO products (name_tr, name_en, description_tr, description_en, fabric_info, return_info, price, category, cover_image_url, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const imageStmt = db.prepare(`INSERT INTO product_images (product_id, image_url) VALUES (?, ?)`);
    const sizeStmt = db.prepare(`INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)`);

    categories.forEach(catFolder => {
        const catPath = path.join(imagesDir, catFolder);
        if (!fs.existsSync(catPath)) return;

        // In these folders, it seems images are grouped by subfolders or just files?
        // Let's assume subfolders represent products, OR files are grouped.
        // Git logs showed: ürünler/yelekler/6/4A09... (folder '6'?)
        // and ürünler/yelekler/yelek1/2904...
        // So we iterate subdirectories.
        
        const productsDirs = fs.readdirSync(catPath).filter(f => fs.statSync(path.join(catPath, f)).isDirectory());

        productsDirs.forEach(prodDirName => {
            const prodPath = path.join(catPath, prodDirName);
            const images = fs.readdirSync(prodPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
            
            if (images.length === 0) return;

            // Generate Product Info
            const nameTr = `${categoryMap[catFolder]} - ${prodDirName}`;
            const nameEn = `${catFolder.charAt(0).toUpperCase() + catFolder.slice(1)} - ${prodDirName}`;
            const descTr = "Otomatik kurtarılan ürün açıklaması.";
            const descEn = "Automatically recovered product description.";
            const fabric = "Standart Kumaş";
            const retInfo = "14 gün iade";
            const price = 5000; // Default price
            const stock = 10;
            
            // First image is cover
            const coverImage = `/images/${catFolder}/${prodDirName}/${images[0]}`;

            productStmt.run(nameTr, nameEn, descTr, descEn, fabric, retInfo, price, categoryMap[catFolder], coverImage, stock, function(err) {
                if (err) {
                    console.error("Error inserting product:", err);
                    return;
                }
                const productId = this.lastID;
                console.log(`Recovered: ${nameTr} (ID: ${productId}) with ${images.length} images`);

                // Insert Images
                images.forEach(img => {
                    const imgUrl = `/images/${catFolder}/${prodDirName}/${img}`;
                    imageStmt.run(productId, imgUrl);
                });
                
                // Insert Sizes
                ['S', 'M', 'L', 'XL'].forEach(size => {
                    sizeStmt.run(productId, size, 5);
                });
            });
        });
    });
    
    // Wait for completion (simple timeout for simplicity in script)
    setTimeout(() => {
        console.log("Recovery complete.");
    }, 2000);
});
