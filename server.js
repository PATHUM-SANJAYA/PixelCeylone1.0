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
const Message = process.env.MONGO_URI ? require('./models/Message') : require('./models/MessageLocal');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure Multer for profile pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/profiles';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.user ? req.user.id : uuidv4()}-${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
});

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
    color: String,
    author: String
}, { _id: false });
const Pixel = mongoose.model('Pixel', pixelSchema);

// Storage State
let pixels = new Map();
let useMongo = false;

// Initialize Data Storage
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
                pixels.set(doc._id, { color: doc.color, author: doc.author });
            });
            console.log(`Loaded ${pixels.size} pixels from MongoDB`);
        } catch (err) {
            console.error('MongoDB connection error:', err);
            loadLocalFile();
        }
    } else {
        loadLocalFile();
        // AUTO-SAVE INTERVAL (Local Mode Only)
        setInterval(() => {
            try {
                if (pixels.size > 0) {
                    const pixelArray = Array.from(pixels.entries());
                    fs.writeFileSync(PIXEL_DATA_FILE, JSON.stringify(pixelArray));
                }
            } catch (err) { console.error('Auto-save failed:', err); }
        }, 5000); // Pulse save every 5 seconds
    }
}

function loadLocalFile() {
    try {
        if (fs.existsSync(PIXEL_DATA_FILE)) {
            const savedData = JSON.parse(fs.readFileSync(PIXEL_DATA_FILE, 'utf8'));
            pixels = new Map(savedData.map(([k, v]) => {
                if (typeof v === 'string') return [k, { color: v, author: 'System' }];
                return [k, v];
            }));
            console.log(`Loaded ${pixels.size} pixels from local file`);
        }
    } catch (err) { console.error('Local load failed:', err); }
}

async function updatePixel(key, data) {
    if (useMongo) {
        if (!data) {
            await Pixel.deleteOne({ _id: key });
        } else {
            await Pixel.findOneAndUpdate(
                { _id: key },
                { _id: key, color: data.color, author: data.author },
                { upsert: true, new: true }
            );
        }
    }
}

initStorage();

// ==========================================
// AUTH ROUTES
// ==========================================

// Check if user is logged in
app.get('/auth/user', (req, res) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json(req.user || null);
});

// LOGIN
app.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json({ success: false, message: (info && info.message) || 'Login failed' });
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
        const newUser = await User.create({
            username,
            password: hashedPassword,
            displayName: username,
            bio: 'New Artist'
        });

        // Removed auto-login (req.logIn) - User must log in manually after registration
        res.json({ success: true, message: 'Registration successful! Please log in.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET DM HISTORY
app.get('/api/messages/:username', async (req, res) => {
    if (!req.user) return res.status(401).send('Login required');
    try {
        const history = await Message.find({
            $or: [
                { from: req.user.username, to: req.params.username },
                { from: req.params.username, to: req.user.username }
            ]
        });
        res.json(history);
    } catch (err) { res.status(500).send(err.message); }
});

// GET ALL DISTINCT CONVERSATIONS (Inbox List)
app.get('/api/messages/all-conversations', async (req, res) => {
    if (!req.user || !req.user.username) return res.status(200).json([]); // Return empty if guest/not logged in
    try {
        const username = req.user.username;
        const allMsgs = await Message.find({
            $or: [{ from: username }, { to: username }]
        });

        // Group by user
        const chatsMap = {};
        for (const m of allMsgs) {
            const partner = (m.from === username) ? m.to : m.from;
            if (!chatsMap[partner] || new Date(m.timestamp) > new Date(chatsMap[partner].timestamp)) {
                chatsMap[partner] = {
                    username: partner,
                    lastMessage: m.message,
                    timestamp: m.timestamp,
                    unread: (m.to === username && !m.read) ? 1 : 0
                };
            } else if (m.to === username && !m.read) {
                chatsMap[partner].unread++;
            }
        }

        // Fetch avatars
        const conversations = await Promise.all(Object.values(chatsMap).map(async (chat) => {
            const partnerUser = await User.findOne({ username: chat.username });
            return {
                ...chat,
                avatar: partnerUser ? partnerUser.profilePicture : '/images/default-avatar.png',
                online: partnerUser ? partnerUser.onlineStatus : false
            };
        }));

        res.json(conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (err) { res.status(500).send(err.message); }
});

// MARK MESSAGES AS READ
app.post('/api/messages/read/:username', async (req, res) => {
    if (!req.user) return res.status(401).send('Login required');
    try {
        await Message.updateMany(
            { from: req.params.username, to: req.user.username, read: false },
            { read: true }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
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
    console.log('Logout requested for user:', req.user ? req.user.username : 'Unknown');
    req.logout((err) => {
        if (err) return next(err);
        res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({ success: true });
    });
});

// UPDATE USERNAME (For Google Users and Username Changes)
app.post('/auth/set-username', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const { username } = req.body;

    // Basic validation
    if (!username || username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username too short' });
    }
    if (username.length > 15) {
        return res.status(400).json({ success: false, message: 'Username too long' });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser && existingUser.id !== req.user.id) {
            return res.status(400).json({ success: false, message: 'Username taken' });
        }

        req.user.username = username;
        req.user.displayName = username;
        await req.user.save();

        // Update session if needed
        req.login(req.user, (err) => {
            if (err) return res.status(500).send(err.message);
            res.json({ success: true, user: req.user });
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// GET USER PROFILE
app.get('/api/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Don't send sensitive info
        const profileData = {
            username: user.username,
            displayName: user.displayName,
            profilePicture: user.profilePicture,
            bio: user.bio,
            pixelCount: user.pixelCount,
            likesCount: user.likesCount,
            onlineStatus: user.onlineStatus,
            createdAt: user.createdAt
        };
        res.json(profileData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPLOAD PROFILE PICTURE
app.post('/api/profile/upload-picture', upload.single('profilePicture'), async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    try {
        let filePath;
        if (req.file) {
            filePath = `/uploads/profiles/${req.file.filename}`;
        } else if (req.body.profilePicture) {
            filePath = req.body.profilePicture;
        } else {
            return res.status(400).send('No file or URL provided');
        }

        req.user.profilePicture = filePath;
        await req.user.save();
        res.json({ success: true, profilePicture: filePath });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// UPDATE BIO
app.post('/api/profile/update-bio', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    try {
        req.user.bio = req.body.bio;
        await req.user.save();
        res.json({ success: true, bio: req.user.bio });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// LIKE PROFILE
app.post('/api/profile/like/:username', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Login to like profiles' });
    try {
        const userToLike = await User.findOne({ username: req.params.username });
        if (!userToLike) return res.status(404).json({ message: 'User not found' });

        if (userToLike.username === req.user.username) {
            return res.status(400).json({ message: "You can't like your own profile" });
        }

        // Check if already liked
        const alreadyLiked = userToLike.likedBy.some(id => id.toString() === req.user.id.toString());

        if (alreadyLiked) {
            // Unlike
            userToLike.likedBy = userToLike.likedBy.filter(id => id.toString() !== req.user.id.toString());
            userToLike.likesCount = Math.max(0, userToLike.likesCount - 1);
        } else {
            // Like
            userToLike.likedBy.push(req.user.id);
            userToLike.likesCount += 1;
        }

        await userToLike.save();
        res.json({ success: true, likesCount: userToLike.likesCount, isLiked: !alreadyLiked });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

    socket.on('request init', () => {
        console.log(`Manual Sync requested by user ${socket.id}. Sending ${pixels.size} pixels.`);
        socket.emit('init', Array.from(pixels.entries()));
    });

    let pixelSaveCounter = 0;
    socket.on('pixel', async (data) => {
        const key = `${data.x},${data.y}`;
        const author = data.username || 'Guest';

        if (data.color === null) {
            pixels.delete(key);
            updatePixel(key, null);
        } else {
            const pixelVal = { color: data.color, author: author };
            pixels.set(key, pixelVal);
            updatePixel(key, pixelVal);

            // Increment pixel count for the user
            if (data.username) {
                try {
                    const user = await User.findOne({ username: data.username });
                    if (user) {
                        user.pixelCount = (user.pixelCount || 0) + 1;
                        await user.save();
                    }
                } catch (err) { console.error('Error updating pixel count:', err); }
            }
        }
        socket.broadcast.emit('pixel', { ...data, author });

        // Save to disk every 10 pixels for higher redundancy
        if (!useMongo) {
            pixelSaveCounter++;
            if (pixelSaveCounter >= 10) {
                pixelSaveCounter = 0;
                try {
                    const pixelArray = Array.from(pixels.entries());
                    fs.writeFileSync(PIXEL_DATA_FILE, JSON.stringify(pixelArray));
                    console.log(`Checkpoint saved: ${pixels.size} pixels.`);
                } catch (e) { }
            }
        }
    });

    socket.on('user join', async (username) => {
        users.set(socket.id, username);
        io.emit('user joined', username);
        // Ensure count is synchronized for the new joiner
        io.emit('online count', onlineCount);

        try {
            const user = await User.findOne({ username });
            if (user) {
                user.onlineStatus = true;
                await user.save();
                io.emit('user status', { username, online: true });
            }
        } catch (err) { console.error(err); }
    });

    socket.on('chat message', async (data) => {
        users.set(socket.id, data.username);

        // Fetch user profile picture
        try {
            const user = await User.findOne({ username: data.username });
            if (user) {
                data.profilePicture = user.profilePicture;
            }
        } catch (err) {
            console.error('Error fetching user for chat:', err);
        }

        io.emit('chat message', data);
    });

    socket.on('get online count', () => {
        socket.emit('online count', onlineCount);
    });

    // DIRECT MESSAGE
    socket.on('direct message', async (data) => {
        // data: { to: 'username', from: 'username', message: 'text', timestamp: Date }
        const recipientSocketId = [...users.entries()].find(([id, name]) => name === data.to)?.[0];

        // Save message to DB for persistence
        try {
            const newMsg = new Message({
                from: data.from,
                to: data.to,
                message: data.message,
                timestamp: data.timestamp || new Date()
            });
            await newMsg.save();
        } catch (e) { console.error('Error saving DM:', e); }

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('direct message', data);
            socket.emit('dm success', data);
        } else {
            socket.emit('dm error', { message: 'User is offline' });
        }
    });

    socket.on('dm read', async (data) => {
        // data: { to: 'originalSender', from: 'receiver' }
        try {
            await Message.updateMany(
                { from: data.to, to: data.from, read: false },
                { read: true }
            );
        } catch (e) { }

        const senderSocketId = [...users.entries()].find(([id, name]) => name === data.to)?.[0];
        if (senderSocketId) {
            io.to(senderSocketId).emit('dm read', { from: data.from });
        }
    });

    socket.on('disconnect', async () => {
        if (users.has(socket.id)) {
            const username = users.get(socket.id);
            users.delete(socket.id);
            io.emit('user left', username);

            try {
                const user = await User.findOne({ username });
                if (user) {
                    user.onlineStatus = false;
                    await user.save();
                    io.emit('user status', { username, online: false });
                }
            } catch (err) { console.error(err); }
        }
        onlineCount--;
        io.emit('online count', onlineCount);
    });
});

// HANDLE UNHANDLED REJECTIONS (Catch MongoDB SSL/IP Errors)
process.on('unhandledRejection', (reason, promise) => {
    console.error('--- UNHANDLED GLOBAL ERROR ---');
    console.error('Reason:', reason);
    if (reason && reason.toString().includes('MongoServerSelectionError')) {
        console.error('🚨 SOLUTION: Your Render server IP is not whitelisted in MongoDB Atlas.');
        console.error('🚨 Go to MongoDB Atlas -> Network Access -> Add IP -> Select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0)');
    }
});

http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});

// SUCCESSFUL EXIT HANDLERS (Local Persistence Assurance)
const flushToDisk = () => {
    if (!useMongo && pixels.size > 0) {
        try {
            const pixelArray = Array.from(pixels.entries());
            fs.writeFileSync(PIXEL_DATA_FILE, JSON.stringify(pixelArray));
            console.log('Final auto-save complete. Server shutting down.');
        } catch (e) { }
    }
    process.exit();
};

process.on('SIGINT', flushToDisk);
process.on('SIGTERM', flushToDisk);
