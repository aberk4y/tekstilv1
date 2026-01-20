const db = require('./database/database');

db.serialize(() => {
    // Addresses Table
    db.run(`CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        full_address TEXT,
        city TEXT,
        district TEXT,
        phone TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.error("Error creating addresses table:", err);
        else console.log("Addresses table ready.");
    });

    // Payment Methods Table
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_title TEXT,
        card_number_masked TEXT,
        expiry_date TEXT,
        card_holder_name TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.error("Error creating payment_methods table:", err);
        else console.log("Payment Methods table ready.");
    });
});
