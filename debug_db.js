const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database/cristobal.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Checking Orders ---");
    db.all("SELECT * FROM orders", (err, orders) => {
        if(err) console.error(err);
        console.log("Orders found:", orders.length);
        console.log(orders);

        console.log("\n--- Checking Order Items ---");
        db.all("SELECT * FROM order_items", (err, items) => {
            if(err) console.error(err);
            console.log("Order Items found:", items.length);
            console.log(items);

            console.log("\n--- Checking Join Query ---");
            const itemSql = `
                SELECT oi.order_id, oi.quantity, oi.size, p.name_tr, p.id as product_id
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
            `;
            db.all(itemSql, (err, joinedItems) => {
                if(err) console.error(err);
                console.log("Joined Items found:", joinedItems.length);
                console.log(joinedItems);
            });
        });
    });
});
