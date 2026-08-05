const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');

const app = express();
app.use(bodyParser.json());

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'postgres'
});

// User model
const User = sequelize.define('User', {
    username: { type: Sequelize.STRING, unique: true },
    password: Sequelize.STRING,
});

// Authentication middleware
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        jwt.verify(token, 'your_jwt_secret', (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// Login route
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (user && user.password === password) {
        const token = jwt.sign({ id: user.id }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.sendStatus(401);
    }
});

// Start server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});