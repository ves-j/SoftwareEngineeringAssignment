const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Hardcoded user credentials
const users = [
    { id: 1, username: 'admin', password: 'password123', email: 'admin@example.com' },
    { id: 2, username: 'user1', password: '123456', email: 'user1@example.com' }
];

// Routes

// Serve login page as homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else {
        res.send(`
            <script>
                alert('Invalid credentials!');
                window.location.href = '/';
            </script>
        `);
    }
});

// Signup endpoint
app.post('/signup', (req, res) => {
    const { username, password, email } = req.body;
    
    const existingUser = users.find(u => u.username === username || u.email === email);
    
    if (existingUser) {
        res.send(`
            <script>
                alert('User already exists!');
                window.location.href = '/signup';
            </script>
        `);
    } else {
        const newUser = {
            id: users.length + 1,
            username,
            password,
            email
        };
        users.push(newUser);
        
        req.session.user = newUser;
        res.redirect('/dashboard');
    }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/');
    }
});

// Logout endpoint
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Get user data
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});