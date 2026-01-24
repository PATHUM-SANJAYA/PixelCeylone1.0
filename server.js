const express = require('express');
const app = express();
const http = require('http').createServer(app);
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

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable CORS for Glitch
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Serve static files with security
app.use((req, res, next) => {
    const sensitiveFiles = ['.env', 'package.json', 'package-lock.json', 'server.js', 'pixel_data.json', 'railway.json', 'Procfile'];
    const requestedFile = path.basename(req.url);
    if (sensitiveFiles.includes(requestedFile)) {
        return res.status(403).send('Access Forbidden');
    }
    next();
});

app.use(express.static(path.join(__dirname, '/')));

const mongoose = require('mongoose');

// File to store pixel data (Fallback)
const PIXEL_DATA_FILE = path.join(__dirname, 'pixel_data.json');

// MongoDB Schema
const pixelSchema = new mongoose.Schema({
    _id: String, // format "x,y"
    color: String
}, { _id: false }); // We manually set _id

const Pixel = mongoose.model('Pixel', pixelSchema);

// Load saved pixels or start with empty map
let pixels = new Map();
let useMongo = false;

// Initialize Data Storage
async function initStorage() {
    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
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
            console.log('Loaded saved pixel data from local file');
        }
    } catch (err) {
        console.log('No saved pixel data found, starting fresh');
    }
}

// Store connected users
const users = new Map();
let onlineCount = 0;

// Save pixels helper
async function updatePixel(key, color) {
    if (useMongo) {
        if (color === null) {
            await Pixel.deleteOne({ _id: key });
        } else {
            await Pixel.findOneAndUpdate(
                { _id: key },
                { _id: key, color: color },
                { upsert: true, new: true }
            );
        }
    } else {
        // Local file fallback (debounced/throttled in real apps, but simple here)
        savePixelsToFile();
    }
}

function savePixelsToFile() {
    const pixelArray = Array.from(pixels.entries());
    fs.writeFileSync(PIXEL_DATA_FILE, JSON.stringify(pixelArray));
}

// Initialize storage immediately
initStorage();

io.on('connection', (socket) => {
    console.log('User connected');
    onlineCount++;
    io.emit('online count', onlineCount);

    // Send current canvas state to new users
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
        console.log(`${username} joined`);
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
        console.log('User disconnected');
    });
});

// Start server
http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
