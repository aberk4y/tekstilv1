const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/cristobal.db');

db.serialize(() => {
    console.log("--- Products ---");
    db.each("SELECT id, name_tr, cover_image_url FROM products ORDER BY id DESC LIMIT 20", (err, row) => {
        console.log(`ID: ${row.id}, Name: ${row.name_tr}, Cover: ${row.cover_image_url}`);
    });
    
    console.log("\n--- Product Images ---");
    db.each("SELECT * FROM product_images ORDER BY id DESC LIMIT 10", (err, row) => {
        console.log(`ID: ${row.id}, ProdID: ${row.product_id}, URL: ${row.image_url}`);
    });
});

setTimeout(() => { db.close(); }, 2000);
