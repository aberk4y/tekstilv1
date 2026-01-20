const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Language Switcher
router.get('/set-lang/:lang', (req, res) => {
    req.session.lang = req.params.lang;
    res.redirect('back');
});

// Home Page
router.get('/', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/index.html'));
});

// About Page
router.get('/about', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/about.html'));
});

// Contact Page
router.get('/contact', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/contact.html'));
});

module.exports = router;
