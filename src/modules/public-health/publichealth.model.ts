const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/countycore', { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: { type: String, default: 'user' }
});

const User = mongoose.model('User', UserSchema);

// Middleware for authentication
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

// Register User
app.post('/api/users', async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
});

// Login User
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && user.password === req.body.password) {
        const token = jwt.sign({ username: user.username, role: user.role }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.send('Username or password incorrect');
    }
});

// Protected Route
app.get('/api/transactions', authenticateJWT, (req, res) => {
    // Logic to retrieve transactions
    res.send('Transactions data');
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});