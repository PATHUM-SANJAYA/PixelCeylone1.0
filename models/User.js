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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
