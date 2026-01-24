const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = process.env.MONGO_URI ? require('../models/User') : require('../models/UserLocal');

module.exports = function (passport) {
    // 1. SERIALIZATION (How to store user in session)
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // 2. LOCAL STRATEGY (Username/Password)
    passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
        try {
            // Find user
            const user = await User.findOne({ username: username }).select('+password');
            if (!user) {
                return done(null, false, { message: 'Username not found' });
            }

            // Check password
            if (!user.password) {
                return done(null, false, { message: 'Please login with Google' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password' });
            }
        } catch (err) {
            return done(err);
        }
    }));

    // 3. GOOGLE STRATEGY
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user exists
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        return done(null, user);
                    } else {
                        // Create new user (No username yet, they will pick later)
                        user = await User.create({
                            googleId: profile.id,
                            displayName: profile.displayName
                        });
                        return done(null, user);
                    }
                } catch (err) {
                    return done(err);
                }
            }));
    }
};
