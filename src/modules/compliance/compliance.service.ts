// Example using Node.js and Express
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.post('/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    // Save user with hashed password to the database
});

app.post('/login', async (req, res) => {
    const user = await findUser(req.body.username);
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user.id }, 'your_jwt_secret');
        res.json({ token });
    } else {
        res.status(401).send('Unauthorized');
    }
});