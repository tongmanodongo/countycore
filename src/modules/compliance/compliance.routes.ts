const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { User } = require('./models'); // Assuming you have a User model defined

const app = express();
app.use(bodyParser.json());

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    // Validate input
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    // Hash password and save user
    const newUser = await User.create({ username, password: hashPassword(password) });
    res.status(201).send({ id: newUser.id, username: newUser.username });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});