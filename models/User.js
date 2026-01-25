const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple users to have no username initially (e.g. just Google ID)
        trim: true
    },
    password: {
        type: String,
        select: false // Don't return password by default in queries
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    displayName: String,
    profilePicture: {
        type: String,
        default: '/images/default-avatar.png'
    },
    bio: {
        type: String,
        default: 'Hello, I am a pixel artist!'
    },
    pixelCount: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    onlineStatus: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
