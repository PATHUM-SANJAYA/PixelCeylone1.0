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
                startGame(data.user);
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
    // Modify UI to ask for username
    document.querySelector('.auth-tabs').style.display = 'none';
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.remove('active');
    document.querySelector('.divider').style.display = 'none';
    document.querySelector('.google-btn').style.display = 'none';

    // Show a custom username set form (reusing register form structure simpler)
    const container = document.querySelector('.auth-container');
    container.innerHTML = `
        <div style="text-align:center; margin-bottom:15px; font-size:10px;">WELCOME! CHOOSE YOUR PIXEL NAME:</div>
        <div class="input-wrapper">
             <i class="fas fa-user-tag"></i>
             <input type="text" id="final-username" placeholder="USERNAME" maxlength="15">
        </div>
        <button id="set-username-btn" class="launch-button" style="margin-top:15px">START</button>
        <div id="final-error" class="error-msg"></div>
    `;

    document.getElementById('set-username-btn').addEventListener('click', async () => {
        const username = document.getElementById('final-username').value;
        if (!username) return;

        const res = await fetch('/auth/set-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (data.success) {
            startGame(data.user);
        } else {
            document.getElementById('final-error').textContent = data.message;
        }
    });
}

function startGame(user) {
    // Save locally for other scripts
    document.cookie = `pixelUsername=${user.username}; path=/; max-age=31536000`; // 1 year

    // Hide welcome screen
    const welcome = document.getElementById('welcome-screen');
    welcome.classList.add('hide');
    setTimeout(() => welcome.style.display = 'none', 1000);

    document.getElementById('app').style.display = 'flex';

    // Connect to socket with username
    // Note: window.sharedSocket is defined in index.html
    if (window.sharedSocket) {
        window.sharedSocket.emit('user join', user.username);
    }

    // Update Chat System
    if (window.chat) {
        window.chat.setUsername(user.username);
    } else {
        // Retry if chat hasn't loaded yet
        const checkChat = setInterval(() => {
            if (window.chat) {
                window.chat.setUsername(user.username);
                clearInterval(checkChat);
            }
        }, 100);
    }

    // Initialize specific game logic if it was waiting
    if (typeof initGame === 'function') {
        initGame(user.username);
    }
}
