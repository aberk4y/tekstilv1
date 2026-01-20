const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/database');

// GET Login Page
router.get('/login', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/login.html'));
});

// GET Register Page
router.get('/register', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/register.html'));
});

// POST Register
router.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    
    // Simple Validation
    if(!username || !email || !password) {
        return res.status(400).json({ error: 'Tüm alanları doldurun.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    stmt.run(username, email, hashedPassword, function(err) {
        if (err) {
            console.error(err);
            if(err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Bu email adresi zaten kullanımda.' });
            }
            return res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
        }
        // Success
        res.json({ success: true, redirectUrl: '/auth/login' });
    });
    stmt.finalize();
});

// POST Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Sistem hatası.' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Hatalı email veya şifre.' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            // Success
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };

            // Redirect based on role
            const redirectUrl = (user.role === 'admin') ? '/admin' : '/';
            res.json({ success: true, redirectUrl });
        } else {
            return res.status(401).json({ error: 'Hatalı email veya şifre.' });
        }
    });
});

// GET Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
