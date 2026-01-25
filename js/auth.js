document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const errorMsg = document.getElementById('auth-error');

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            if (target === 'login') {
                document.getElementById('login-form').classList.add('active');
            } else {
                document.getElementById('register-form').classList.add('active');
            }
            errorMsg.textContent = '';
        });
    });

    // Password Toggle
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetId = icon.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Check Login Status on Load
    checkUserStatus();

    // Login Handler
    document.getElementById('login-btn').addEventListener('click', async () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) return showError('Please fill all fields');

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                startGame(data.user);
            } else {
                showError(data.message);
            }
        } catch (err) {
            showError('Server error');
        }
    });

    // Register Handler
    document.getElementById('register-btn').addEventListener('click', async () => {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;

        if (!username || !password) return showError('Please fill all fields');

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                // REDIRECT TO LOGIN AS REQUESTED
                showError('Registration successful! Now login below.');
                const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
                if (loginTab) loginTab.click();

                // Pre-fill login username
                document.getElementById('login-username').value = username;
                document.getElementById('login-password').value = '';
            } else {
                showError(data.message);
            }
        } catch (err) {
            showError('Server error');
        }
    });

    // Determine if URL indicates google success
    if (window.location.search.includes('loggedin=true')) {
        // Clean URL
        window.history.replaceState({}, document.title, "/");
        // Check status will handle the rest
    }
});

function showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.animation = 'none';
    el.offsetHeight; /* trigger reflow */
    el.style.animation = 'fadeIn 0.3s';
}

async function checkUserStatus() {
    try {
        const res = await fetch('/auth/user');
        const user = await res.json();

        if (user) {
            if (!user.username) {
                // User logged in (probably Google) but no username yet
                promptForUsername(user);
            } else {
                startGame(user);
            }
        }
    } catch (e) {
        console.log('Not logged in');
    }
}

function promptForUsername(user) {
    // For Google users, we now use the main onboarding flow instead of this custom one
    // But let's call startGame directly, it will handle the missing username.
    user.username = null; // Ensure it's null so startGame detects it
    startGame(user);
}

function startGame(user) {
    console.log('--- START GAME SEQUENCE ---');
    console.log('User State:', user ? { u: user.username, b: user.bio } : 'NO USER');

    if (!user) {
        console.error('startGame called without user object');
        return;
    }

    // NEW FLOW: Check if profile is complete
    const isProfileIncomplete = !user.username || !user.bio || user.username.startsWith('guest_') || user.bio === 'Hello, I am a pixel artist!' || user.bio === 'New Artist';

    if (isProfileIncomplete && !window.onboardingShown) {
        console.log('Profile INCOMPLETE. Triggering Onboarding UI...');

        // Hide login modal so it doesn't block the view
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'none';

        const runOnboarding = (retries = 0) => {
            if (window.showOnboarding) {
                console.log('Onboarding system ready. Calling show...');
                window.showOnboarding(user);
            } else if (retries < 15) {
                console.warn(`Waiting for ProfileManager (retry ${retries}/15)...`);
                setTimeout(() => runOnboarding(retries + 1), 200);
            } else {
                console.error('CRITICAL ERROR: ProfileManager failed to load.');
                alert('Connection delay. Please refresh the page to continue.');
            }
        };

        runOnboarding();
        return;
    }

    console.log('Profile COMPLETE. Entering World...');

    // 1. Hide Landing Page Assets
    if (window.hideLandingPage) {
        window.hideLandingPage();
    } else {
        const welcome = document.getElementById('welcome-screen');
        if (welcome) {
            welcome.classList.add('hide');
            setTimeout(() => welcome.style.display = 'none', 1000);
        }
    }

    // 2. Hide ALL Modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');

    // 3. Show App
    document.getElementById('app').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // 4. Update Cookies
    document.cookie = `pixelUsername=${user.username}; path=/; max-age=31536000`;

    // 5. Contextual Init
    if (window.sharedSocket) window.sharedSocket.emit('user join', user.username);

    // Update Chat System
    if (window.chat) {
        window.chat.setUsername(user.username);
    } else {
        const checkChat = setInterval(() => {
            if (window.chat) {
                window.chat.setUsername(user.username);
                clearInterval(checkChat);
            }
        }, 100);
    }

    if (typeof initGame === 'function') initGame(user.username);
    if (window.pixelCanvas) window.pixelCanvas.refresh();
}
