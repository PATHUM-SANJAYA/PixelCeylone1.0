const fs = require('fs');
const path = require('path');

const USER_FILE = path.join(__dirname, '../users.json');

// Helper to read users
function getUsers() {
    try {
        if (!fs.existsSync(USER_FILE)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
    } catch (err) {
        return [];
    }
}

// Helper to save users
function saveUsers(users) {
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
}

class LocalUser {
    constructor(data) {
        Object.assign(this, data);
        if (!this.id && this._id) this.id = this._id;
        if (!this.id) this.id = Math.random().toString(36).substr(2, 9);

        // Default values for new profile fields
        if (this.profilePicture === undefined) this.profilePicture = '/images/default-avatar.png';
        if (this.bio === undefined) this.bio = 'Hello, I am a pixel artist!';
        if (this.pixelCount === undefined) this.pixelCount = 0;
        if (this.likesCount === undefined) this.likesCount = 0;
        if (this.likedBy === undefined) this.likedBy = [];
        if (this.onlineStatus === undefined) this.onlineStatus = false;
    }

    async save() {
        const users = getUsers();
        // Crucial fix: Only match username if it exists!
        const existingIndex = users.findIndex(u => {
            if (u.id === this.id) return true;
            if (this.username && u.username === this.username) return true;
            return false;
        });

        if (existingIndex >= 0) {
            users[existingIndex] = this;
        } else {
            users.push(this);
        }
        saveUsers(users);
        return this;
    }

    // Static Mock for findOne to support chaining .select()
    static findOne(query) {
        const queryBuilder = {
            _query: query,
            _select: null,

            select: function (fields) {
                this._select = fields;
                return this; // Return self for chaining
            },

            // Make it "thenable" so it can be awaited directly
            then: function (resolve, reject) {
                try {
                    const users = getUsers();
                    let user = null;

                    if (this._query.googleId) {
                        user = users.find(u => u.googleId === this._query.googleId);
                    } else if (this._query.username) {
                        user = users.find(u => u.username === this._query.username);
                    }

                    if (user) {
                        // In a real Mongo app with select: false, password wouldn't be here.
                        // In our JSON, it IS here. 
                        // If .select('+password') is called, we definitely want it.
                        // If NOT called, we should ideally obscure it, but for a local mock, 
                        // passing it along is usually fine unless logic strictly depends on its absence.
                        // However, let's return a clean instance.
                        resolve(new LocalUser(user));
                    } else {
                        resolve(null);
                    }
                } catch (err) {
                    reject(err);
                }
            },

            // Allow calling .exec() directly if code uses it
            exec: async function () {
                return new Promise((resolve, reject) => this.then(resolve, reject));
            }
        };

        return queryBuilder;
    }

    static async findById(id) {
        const users = getUsers();
        const user = users.find(u => u.id === id);
        if (user) return new LocalUser(user);
        return null;
    }

    static async create(data) {
        // Ensure exact same check as findOne to prevent duplicates
        const users = getUsers();
        if (data.username && users.find(u => u.username === data.username)) {
            throw new Error('Username taken');
        }
        const user = new LocalUser(data);
        await user.save();
        return user;
    }
}

module.exports = LocalUser;
