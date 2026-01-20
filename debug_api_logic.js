const db = require('./database/database');

const userId = 3; // Based on debug_db output for order #7 and #6

const getAllOrders = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getOrderItems = (orderId) => {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT oi.*, p.name_tr, p.name_en, p.cover_image_url 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?`, [orderId], (err, rows) => {
            if (err) reject(err);
            else {
                // Determine missing products manually if needed? No, LEFT JOIN handles it.
                // But let's log if rows are empty
                console.log(`Order ${orderId} items found: ${rows.length}`);
                resolve(rows);
            }
        });
    });
};

console.log("Simulating API for user " + userId);
getAllOrders()
    .then(async (orders) => {
        console.log(`Found ${orders.length} orders`);
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await getOrderItems(order.id);
            return { ...order, items };
        }));
        
        console.log("Final API Response Sample (Order #7):");
        const order7 = ordersWithItems.find(o => o.id === 7);
        console.log(JSON.stringify(order7, null, 2));
    })
    .catch(err => console.error(err));
