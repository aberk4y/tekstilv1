const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Check
if (!fs.existsSync('./database/cristobal.db')) {
    console.log("Veritabanı dosyası bulunamadı. Lütfen 'npm run init-db' komutunu çalıştırın.");
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
    store: new SQLiteStore({ dir: './database', db: 'sessions.db' }),
    secret: 'cristobal_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

// View Engine
// View Engine Setup - REMOVED for CSR
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// Global Middleware (User & Language) - Keep for session, but response locals might not be needed for CSR as much, 
// though we might still use them if we were serving templates. For CSR, we rely on /api/user/me.
app.use((req, res, next) => {
    // Keep language logic for session
    if (!req.session.lang) {
        req.session.lang = 'tr';
    }
    if (req.query.lang) {
        req.session.lang = req.query.lang;
    }
    next();
});

// Routes
app.use('/api', require('./routes/api'));

// HTML Routes (to be refactored to sendFile)
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/admin', require('./routes/admin'));
app.use('/cart', require('./routes/cart'));
app.use('/user', require('./routes/user'));


/*
app.get('/', (req, res) => {
    res.send('Cristobal Backend is Running. Please complete setup.'); // Temporary
});
*/


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
