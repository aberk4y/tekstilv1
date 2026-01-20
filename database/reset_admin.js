const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'cristobal.db');
const db = new sqlite3.Database(dbPath);

const adminPassword = 'admin'; 
const adminHash = bcrypt.hashSync(adminPassword, 10);

db.serialize(() => {
    // Check if admin exists
    db.get("SELECT * FROM users WHERE email = ?", ['admin@cristobal.com'], (err, row) => {
        if (row) {
            // Update
            db.run("UPDATE users SET password = ?, role = 'admin' WHERE email = ?", [adminHash, 'admin@cristobal.com'], (err) => {
                if(err) console.error(err);
                console.log("Admin password reset to 'admin'.");
            });
        } else {
            // Insert
            const stmt = db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
            stmt.run('Admin', 'admin@cristobal.com', adminHash, 'admin');
            stmt.finalize();
            console.log("Admin user created with password 'admin'.");
        }
    });
});

// Close later to ensure async runs
setTimeout(() => db.close(), 1000);
