const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const mysql = require('mysql2');
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = require('./database');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'attendance-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000,
        secure: false
    } 
}));

// Routes
app.use(require('./routes'));

// Server start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});