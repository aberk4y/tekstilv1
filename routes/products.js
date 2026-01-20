const express = require('express');
const router = express.Router();
const db = require('../database/database');

// GET /products - List all with optional category filter & search
// GET /products - List all
router.get('/', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/products.html'));
});

// GET /products/:id - Product Detail Route
router.get('/:id', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, '../views/public/product-detail.html'));
});

module.exports = router;
