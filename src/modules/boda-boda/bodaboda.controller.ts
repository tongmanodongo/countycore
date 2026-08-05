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
    countyId: String,
    isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);

// Middleware for JWT verification
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

// User Registration
app.post('/register', async (req, res) => {
    const { username, password, countyId } = req.body;
    const newUser = new User({ username, password, countyId });
    await newUser.save();
    res.status(201).send('User registered');
});

// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        const token = jwt.sign({ username: user.username, countyId: user.countyId }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.send('Username or password incorrect');
    }
});

// Protected Route
app.get('/transactions', authenticateJWT, (req, res) => {
    // Fetch transactions for the user's county
    res.send('Transactions data');
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});