const express = require('express');
const router = express.Router();
const db = require('../database/database');
const bcrypt = require('bcryptjs');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
};

router.use(isAuthenticated);

// GET Profile
router.get('/profile', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/user/profile.html'));
});

// POST Update Profile (Password)
router.post('/profile/update', (req, res) => {
    const { password } = req.body;
    if(password) {
        const hash = bcrypt.hashSync(password, 10);
        db.run("UPDATE users SET password = ? WHERE id = ?", [hash, req.session.user.id], (err) => {
            if(err) {
                console.error(err);
                return res.status(500).json({ error: 'Hatası oluştu.' });
            }
            res.json({ success: true, message: 'Şifre güncellendi.' });
        });
    } else {
        res.json({ success: false, message: 'Şifre boş olamaz.' });
    }
});

// GET Orders
router.get('/orders', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/user/orders.html'));
});

// GET Addresses Page
router.get('/addresses', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/user/addresses.html'));
});

// GET Payment Methods Page
router.get('/payment-methods', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/user/payment-methods.html'));
});

module.exports = router;
