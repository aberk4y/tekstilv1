const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database/cristobal.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Add address_id column
    db.run("ALTER TABLE orders ADD COLUMN address_id INTEGER", (err) => {
        if (err && err.message.includes("duplicate column")) {
            console.log("address_id column already exists.");
        } else if (err) {
            console.error("Error adding address_id column:", err);
        } else {
            console.log("Added address_id column to orders table.");
        }
    });

    // Add payment_id column
    db.run("ALTER TABLE orders ADD COLUMN payment_id INTEGER", (err) => {
        if (err && err.message.includes("duplicate column")) {
            console.log("payment_id column already exists.");
        } else if (err) {
            console.error("Error adding payment_id column:", err);
        } else {
            console.log("Added payment_id column to orders table.");
        }
    });
});
