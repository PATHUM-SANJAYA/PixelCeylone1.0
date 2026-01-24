const express = require('express');
const app = express();
require('dotenv').config(); // Load .env
const http = require('http').createServer(app);
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const bcrypt = require('bcryptjs');
const User = process.env.MONGO_URI ? require('./models/User') : require('./models/UserLocal');

// Passport Config
require('./config/passport')(passport);

const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});
const path = require('path');
const fs = require('fs');

// Render sets the PORT env variable suitable for your service.
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable CORS/Body Parsing
app.set('trust proxy', 1); // Trust Render/Heroku proxy for secure cookies

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'pixelSecretKey2026', // Use env var in production!!
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Secure cookies in production
        maxAge: 1000 * 60 * 60 * 24 * 365 // 1 Year
    }
};

// Only use MongoDB for sessions if a URI is provided (Production)
// Otherwise fallback to MemoryStore (Development/Local)
if (process.env.MONGO_URI) {
    sessionConfig.store = MongoStore.create({ mongoUrl: process.env.MONGO_URI });
}

const sessionMiddleware = session(sessionConfig);

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Serve static files with security
app.use((req, res, next) => {
    const sensitiveFiles = ['.env', 'package.json', 'package-lock.json', 'server.js', 'pixel_data.json', 'railway.json', 'Procfile', 'models', 'config'];

    // Also protect the folders themselves if listed
    const requestedFile = path.basename(req.url);
    if (sensitiveFiles.includes(requestedFile) || req.url.includes('/models/') || req.url.includes('/config/')) {
        return res.status(403).send('Access Forbidden');
    }
    next();
});

app.use(express.static(path.join(__dirname, '/')));

// ==========================================
// DATABASE & PIXEL LOGIC
// ==========================================
const PIXEL_DATA_FILE = path.join(__dirname, 'pixel_data.json');

// MongoDB Schema for Pixels
const pixelSchema = new mongoose.Schema({
    _id: String,
    color: String
}, { _id: false });
const Pixel = mongoose.model('Pixel', pixelSchema);

// Storage State
let pixels = new Map();
let useMongo = false;

// Initialize Data Storage
async function initStorage() {
    if (process.env.MONGO_URI) {
        try {
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(process.env.MONGO_URI);
            }
            console.log('Connected to MongoDB');
            useMongo = true;

            const docs = await Pixel.find({});
            docs.forEach(doc => {
                pixels.set(doc._id, doc.color);
            });
            console.log(`Loaded ${pixels.size} pixels from MongoDB`);
        } catch (err) {
            console.error('MongoDB connection error:', err);
            loadLocalFile();
        }
    } else {
        loadLocalFile();
    }
}

function loadLocalFile() {
    try {
        if (fs.existsSync(PIXEL_DATA_FILE)) {
            const savedData = JSON.parse(fs.readFileSync(PIXEL_DATA_FILE, 'utf8'));
            pixels = new Map(savedData);
            console.log('Loaded saved pixel from local file');
        }
    } catch (err) { console.log('No local data'); }
}

async function updatePixel(key, color) {
    if (useMongo) {
        if (color === null) {
            await Pixel.deleteOne({ _id: key });
        } else {
            await Pixel.findOneAndUpdate({ _id: key }, { _id: key, color: color }, { upsert: true, new: true });
        }
    } else {
        const pixelArray = Array.from(pixels.entries());
        fs.writeFileSync(PIXEL_DATA_FILE, JSON.stringify(pixelArray));
    }
}

initStorage();

// ==========================================
// AUTH ROUTES
// ==========================================

// Check if user is logged in
app.get('/auth/user', (req, res) => {
    res.json(req.user || null);
});

// LOGIN
app.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json({ success: false, message: info.message });
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.json({ success: true, user });
        });
    })(req, res, next);
});

// REGISTER
app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (await User.findOne({ username })) {
            return res.status(400).json({ success: false, message: 'Username taken' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, password: hashedPassword, displayName: username });
        req.logIn(newUser, (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, user: newUser });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GOOGLE AUTH
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication
        // Redirect to home with a query param
        res.redirect('/?loggedin=true');
    }
);

// LOGOUT
app.post('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.json({ success: true });
    });
});

// UPDATE USERNAME (For Google Users)
app.post('/auth/set-username', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const { username } = req.body;
    try {
        if (await User.findOne({ username })) return res.status(400).json({ success: false, message: 'Username taken' });
        req.user.username = username;
        req.user.displayName = username;
        await req.user.save();
        res.json({ success: true, user: req.user });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ==========================================
// SOCKET.IO
// ==========================================
const users = new Map();
let onlineCount = 0;

io.on('connection', (socket) => {
    console.log('User connected');
    onlineCount++;
    io.emit('online count', onlineCount);
    socket.emit('init', Array.from(pixels.entries()));

    socket.on('pixel', (data) => {
        const key = `${data.x},${data.y}`;
        if (data.color === null) {
            pixels.delete(key);
            updatePixel(key, null);
        } else {
            pixels.set(key, data.color);
            updatePixel(key, data.color);
        }
        socket.broadcast.emit('pixel', data);
    });

    socket.on('user join', (username) => {
        users.set(socket.id, username);
        io.emit('user joined', username);
    });

    socket.on('chat message', (data) => {
        users.set(socket.id, data.username);
        io.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        if (users.has(socket.id)) {
            const username = users.get(socket.id);
            users.delete(socket.id);
            io.emit('user left', username);
        }
        onlineCount--;
        io.emit('online count', onlineCount);
    });
});

http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
