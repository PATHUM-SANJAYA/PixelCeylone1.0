class ProfileManager {
    constructor() {
        this.socket = window.sharedSocket;
        this.currentUser = null;
        this.viewedUser = null;
        this.dmHistory = {}; // Store messages by username: { 'name': [msg1, msg2] }
        this.setupElements();
        this.initDMEmojiPanel();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.loadSuggestedAvatars();
        this.fetchCurrentUser(); // Ensure we know who is sending DMs
    }

    setupElements() {
        this.profileModal = document.getElementById('profile-modal');
        this.openProfileBtn = document.getElementById('open-profile');
        this.closeButtons = document.querySelectorAll('.close-modal');

        this.profileImg = document.getElementById('profile-img');
        this.usernameEl = document.getElementById('profile-username');
        this.statusDot = document.getElementById('profile-status');
        this.statusText = document.getElementById('status-text');
        this.pixelCountEl = document.getElementById('profile-pixel-count');
        this.likesCountEl = document.getElementById('profile-likes-count');
        this.bioEl = document.getElementById('profile-bio');
        this.saveBioBtn = document.getElementById('save-bio-btn');
        this.likeBtn = document.getElementById('like-profile-btn');
        this.messageBtn = document.getElementById('message-user-btn');
        this.editUsernameBtn = document.getElementById('edit-username-btn');
        this.avatarUpload = document.getElementById('avatar-upload');
        this.avatarSuggestionsEl = document.getElementById('avatar-suggestions');

        this.smallAvatarImg = document.getElementById('user-avatar-small');

        // DM Elements
        this.dmModal = document.getElementById('dm-modal');
        this.dmRecipientName = document.getElementById('dm-recipient-name');
        this.dmRecipientImg = document.getElementById('dm-recipient-img');
        this.dmInput = document.getElementById('dm-input');
        this.sendDmBtn = document.getElementById('send-dm-btn');
        this.dmEmojiBtn = document.getElementById('dm-emoji-btn');
        this.dmEmojiPanel = document.getElementById('dm-emoji-panel');
        this.dmListModal = document.getElementById('dm-list-modal');
        this.dmInboxList = document.getElementById('dm-inbox-list');
    }

    async fetchCurrentUser() {
        try {
            const res = await fetch('/auth/user');
            const user = await res.json();
            if (user) this.currentUser = user;
        } catch (e) { }
    }

    setupEventListeners() {
        if (this.openProfileBtn) {
            this.openProfileBtn.onclick = (e) => {
                e.stopPropagation();
                this.openOwnProfile();
            };
        }

        this.closeButtons.forEach(btn => {
            btn.onclick = () => {
                this.profileModal.style.setProperty('display', 'none', 'important');
                this.dmModal.style.setProperty('display', 'none', 'important');
                if (this.dmListModal) this.dmListModal.style.setProperty('display', 'none', 'important');
            };
        });

        const dmListBtn = document.getElementById('open-dm-list');
        if (dmListBtn) {
            dmListBtn.onclick = () => this.openInbox();
        }

        this.bioEl.oninput = () => {
            if (this.viewedUser && this.currentUser && this.viewedUser.username === this.currentUser.username) {
                this.saveBioBtn.style.display = 'block';
            }
        };

        this.saveBioBtn.onclick = async () => {
            const bio = this.bioEl.value;
            try {
                const res = await fetch('/api/profile/update-bio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bio })
                });
                if (res.ok) {
                    this.saveBioBtn.style.display = 'none';
                    this.showNotification('Bio updated!', 'success');
                }
            } catch (err) { console.error(err); }
        };

        this.avatarUpload.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('profilePicture', file);

            try {
                const res = await fetch('/api/profile/upload-picture', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    this.profileImg.src = data.profilePicture;
                    if (this.smallAvatarImg) this.smallAvatarImg.src = data.profilePicture;
                    this.showNotification('Profile updated!', 'success');
                }
            } catch (err) { console.error(err); }
        };

        this.likeBtn.onclick = async () => {
            if (!this.viewedUser) return;
            try {
                const res = await fetch(`/api/profile/like/${this.viewedUser.username}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    this.likesCountEl.textContent = data.likesCount;
                    this.likeBtn.classList.toggle('liked', data.isLiked);
                    this.likeBtn.textContent = data.isLiked ? 'LIKED √' : 'LIKE ARTIST';
                }
            } catch (err) { console.error(err); }
        };

        this.messageBtn.onclick = () => {
            if (!this.viewedUser) return;
            this.openDM(this.viewedUser);
        };

        this.sendDmBtn.onclick = () => this.sendDM();
        this.dmInput.onkeypress = (e) => { if (e.key === 'Enter') this.sendDM(); };

        if (this.dmEmojiBtn) {
            this.dmEmojiBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.dmEmojiPanel) this.dmEmojiPanel.classList.toggle('show');
            };
        }

        document.addEventListener('click', (e) => {
            if (this.dmEmojiPanel && !this.dmEmojiBtn.contains(e.target) && !this.dmEmojiPanel.contains(e.target)) {
                this.dmEmojiPanel.classList.remove('show');
            }
        });

        this.editUsernameBtn.onclick = async () => {
            const newUsername = prompt('Enter your new Public Name:', this.viewedUser.username);
            if (!newUsername || newUsername === this.viewedUser.username) return;

            try {
                const res = await fetch('/auth/set-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: newUsername })
                });
                const data = await res.json();
                if (data.success) {
                    this.usernameEl.textContent = newUsername;
                    this.showNotification('Name changed!', 'success');
                    document.cookie = `pixelUsername=${newUsername}; path=/; max-age=31536000`;
                } else {
                    alert(data.message);
                }
            } catch (err) { console.error(err); }
        };

        const globalLogout = document.getElementById('logout-btn');
        if (globalLogout) {
            globalLogout.onclick = async () => {
                if (confirm('Logout from PixelCeylon?')) {
                    const res = await fetch('/auth/logout', { method: 'POST' });
                    if (res.ok) window.location.reload();
                }
            };
        }
    }

    setupSocketListeners() {
        this.socket.on('direct message', (data) => this.receiveDM(data));
        this.socket.on('user status', (data) => {
            if (this.viewedUser && this.viewedUser.username === data.username) {
                this.statusDot.className = `status-dot ${data.online ? 'online' : 'offline'}`;
                if (this.statusText) this.statusText.textContent = data.online ? 'Online' : 'Offline';
            }
        });
    }

    async openOwnProfile() {
        const res = await fetch('/auth/user');
        const user = await res.json();
        if (user) {
            this.currentUser = user;
            this.showProfile(user.username);
        } else {
            alert('Please login first');
        }
    }

    async showProfile(username) {
        try {
            const res = await fetch(`/api/profile/${username}`);
            const user = await res.json();
            if (!res.ok) return alert('Profile not found');

            this.viewedUser = user;
            const isOwn = this.currentUser && this.currentUser.username === user.username;

            this.profileImg.src = user.profilePicture || '/images/default-avatar.png';
            this.usernameEl.textContent = user.username;
            this.pixelCountEl.textContent = user.pixelCount || 0;
            this.likesCountEl.textContent = user.likesCount || 0;
            this.bioEl.value = user.bio || '';
            this.bioEl.readOnly = !isOwn;

            this.statusDot.className = `status-dot ${user.onlineStatus ? 'online' : 'offline'}`;
            if (this.statusText) this.statusText.textContent = user.onlineStatus ? 'Online' : 'Offline';

            // Show/Hide sections
            document.getElementById('visitor-actions').style.display = isOwn ? 'none' : 'flex';
            this.editUsernameBtn.style.display = isOwn ? 'block' : 'none';
            document.querySelector('.avatar-suggestions-wa').style.display = isOwn ? 'block' : 'none';
            document.querySelector('.wa-avatar-edit').style.display = isOwn ? 'flex' : 'none';

            this.profileModal.style.setProperty('display', 'flex', 'important');

            if (isOwn && this.smallAvatarImg) this.smallAvatarImg.src = user.profilePicture;

        } catch (err) { console.error(err); }
    }

    loadSuggestedAvatars() {
        const avatars = [
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jack',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Leo',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Max',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Buddy',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Scooter',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Aneka',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Misty'
        ];

        this.avatarSuggestionsEl.innerHTML = '';
        avatars.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'avatar-opt';
            img.onclick = async () => {
                if (!this.currentUser || this.viewedUser.username !== this.currentUser.username) return;
                const res = await fetch('/api/profile/upload-picture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profilePicture: url })
                });
                if (res.ok) {
                    this.profileImg.src = url;
                    if (this.smallAvatarImg) this.smallAvatarImg.src = url;
                    this.showNotification('Identity Updated!', 'success');
                }
            };
            this.avatarSuggestionsEl.appendChild(img);
        });
    }

    initDMEmojiPanel() {
        const emojiList = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '👍', '👎', '❤️', '🔥', '✨', '🎉'];

        if (!this.dmEmojiPanel) return;

        emojiList.forEach(e => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.textContent = e;
            span.onclick = () => {
                if (this.dmInput) {
                    this.dmInput.value += e;
                    this.dmInput.focus();
                }
                this.dmEmojiPanel.classList.remove('show');
            };
            this.dmEmojiPanel.appendChild(span);
        });
    }

    async openDM(user) {
        this.profileModal.style.setProperty('display', 'none', 'important');
        this.dmModal.style.setProperty('display', 'flex', 'important');
        this.dmRecipientName.textContent = user.username;
        this.dmRecipientImg.src = user.profilePicture || '/images/default-avatar.png';

        const statusEl = this.dmModal.querySelector('.dm-status');
        if (statusEl) statusEl.textContent = user.onlineStatus ? 'online' : 'offline';

        this.dmMessages.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5; font-size:10px;">LOADING CHAT...</div>';

        // FETCH REAL HISTORY FROM SERVER
        try {
            const res = await fetch(`/api/messages/${user.username}`);
            const history = await res.json();
            this.dmMessages.innerHTML = '';

            if (history && Array.isArray(history)) {
                history.forEach(m => {
                    const type = (m.from === user.username) ? 'received' : 'sent';
                    this.renderUnifiedDM(m, type);
                });
            }

            // Mark these messages as read on server
            await fetch(`/api/messages/read/${user.username}`, { method: 'POST' });
        } catch (e) {
            this.dmMessages.innerHTML = '';
            console.error('History fetch failed:', e);
        }

        // Send 'read' event to sender for real-time blue ticks
        if (this.currentUser) {
            this.socket.emit('dm read', { to: user.username, from: this.currentUser.username });
        }

        this.dmInput.focus();
    }
    async sendDM() {
        const msg = this.dmInput.value.trim();
        if (!msg || !this.viewedUser) return;

        // Final check for sender identity
        if (!this.currentUser) await this.fetchCurrentUser();
        if (!this.currentUser) return alert('Session expired. Please login.');

        const data = {
            to: this.viewedUser.username,
            from: this.currentUser.username,
            message: msg,
            timestamp: new Date().toISOString()
        };

        this.socket.emit('direct message', data);
        this.saveToHistory(this.viewedUser.username, data, 'sent');
        this.renderUnifiedDM(data, 'sent');
        this.dmInput.value = '';
    }

    receiveDM(data) {
        this.saveToHistory(data.from, data, 'received');

        if (this.dmModal.style.display === 'flex' && this.dmRecipientName.textContent === data.from) {
            this.renderUnifiedDM(data, 'received');
            // Inform sender that it's read immediately
            this.socket.emit('dm read', { to: data.from, from: this.currentUser.username || 'Guest' });
        } else {
            this.showModernDMNotification(data);
        }
    }

    saveToHistory(username, data, type) {
        if (!this.dmHistory[username]) this.dmHistory[username] = [];
        this.dmHistory[username].push({ data, type });
    }

    async openInbox() {
        if (!this.dmListModal) return;
        this.dmListModal.style.setProperty('display', 'flex', 'important');
        this.dmInboxList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:12px;">LOADING CHATS...</div>';

        try {
            const res = await fetch('/api/messages/all-conversations'); // Need to add this to server.js
            const conversations = await res.json();
            this.dmInboxList.innerHTML = '';

            if (!conversations || conversations.length === 0) {
                this.dmInboxList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5; font-size:12px;">NO RECENT CHATS</div>';
                return;
            }

            conversations.forEach(chat => {
                this.renderInboxItem(chat);
            });
        } catch (e) {
            this.dmInboxList.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;">ERROR LOADING CHATS</div>';
        }
    }

    renderInboxItem(chat) {
        // chat: { username: 'Alice', lastMessage: 'hey', timestamp: Date, avatar: '...', online: true, unread: 2 }
        const el = document.createElement('div');
        el.className = 'dm-inbox-item';
        const time = new Date(chat.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

        el.innerHTML = `
            <img src="${chat.avatar || '/images/default-avatar.png'}" class="dm-inbox-avatar">
            <div class="dm-inbox-info">
                <div class="dm-inbox-row">
                    <span class="dm-inbox-name">${chat.username}</span>
                    <span class="dm-inbox-time">${time}</span>
                </div>
                <div class="dm-inbox-row">
                    <span class="dm-inbox-preview">${chat.lastMessage}</span>
                    ${chat.unread > 0 ? `<div class="unread-dot"></div>` : ''}
                </div>
            </div>
        `;

        el.onclick = () => {
            this.dmListModal.style.setProperty('display', 'none', 'important');
            this.showProfile(chat.username).then(() => {
                this.openDM({ username: chat.username, profilePicture: chat.avatar });
            });
        };

        this.dmInboxList.appendChild(el);
    }

    renderUnifiedDM(data, type) {
        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const el = document.createElement('div');
        el.className = `dm-msg ${type}`;
        const ticks = type === 'sent' ? '<i class="fas fa-check-double"></i>' : '';

        el.innerHTML = `
            <div class="dm-msg-bubble">
                ${data.message}
                <div class="dm-msg-info">
                    <span>${time}</span>
                    ${ticks}
                </div>
            </div>
        `;
        const container = document.getElementById('dm-messages');
        if (container) {
            container.appendChild(el);
            container.scrollTop = container.scrollHeight;
        }
    }

    showModernDMNotification(data) {
        const el = document.createElement('div');
        el.className = `pixel-notification join-notification`; // Using existing blue theme

        el.innerHTML = `
            <div class="notification-icon"><img src="/images/default-avatar.png" style="width:100%; border-radius:50%"></div>
            <div class="notification-content">
                <div class="notification-title">${data.from}</div>
                <div class="notification-message">${data.message.substring(0, 30)}${data.message.length > 30 ? '...' : ''}</div>
            </div>
            <div style="margin-left:10px; display:flex; gap:5px;">
                <button class="notif-open-btn" style="background:#3b82f6; color:white; border:none; border-radius:15px; padding:4px 10px; font-size:9px; cursor:pointer;">OPEN</button>
            </div>
        `;

        const container = document.getElementById('notification-container');
        if (container) {
            container.appendChild(el);
            el.querySelector('.notif-open-btn').onclick = async () => {
                await this.showProfile(data.from);
                this.openDM({ username: data.from });
                el.remove();
            };
            setTimeout(() => { if (el.parentNode) el.remove(); }, 6000);
        }
    }

    addDMToUI(data, type) {
        // Obsolete - using renderUnifiedDM now
    }

    showNotification(msg, type) {
        const el = document.createElement('div');
        el.className = `pixel-notification ${type}-notification`;
        el.innerHTML = `<span>${msg}</span>`;
        const container = document.getElementById('notification-container');
        if (container) {
            container.appendChild(el);
            setTimeout(() => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 500);
            }, 3000);
        }
    }

    setupOnboarding(user) {
        const screen = document.getElementById('onboarding-screen');
        const usernameInput = document.getElementById('onboarding-username');
        const bioInput = document.getElementById('onboarding-bio');
        const previewImg = document.getElementById('onboarding-preview-img');
        const avatarUpload = document.getElementById('onboarding-avatar-upload');
        const finishBtn = document.getElementById('onboarding-finish-btn');
        const logoutBtn = document.getElementById('onboarding-logout');
        const avatarList = document.getElementById('onboarding-avatar-list');

        if (!screen) return;
        screen.style.setProperty('display', 'flex', 'important');
        screen.style.setProperty('z-index', '9999', 'important');

        if (usernameInput) usernameInput.value = user.username || '';
        if (bioInput) bioInput.value = (user.bio && !user.bio.includes('Hello') && user.bio !== 'New Artist') ? user.bio : '';
        if (previewImg) previewImg.src = user.profilePicture || '/images/default-avatar.png';

        const avatars = [
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jack',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Leo',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Max',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Buddy',
            'https://api.dicebear.com/7.x/pixel-art/svg?seed=Scooter'
        ];

        if (avatarList) {
            avatarList.innerHTML = '';
            avatars.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'avatar-opt';
                img.onclick = () => { previewImg.src = url; previewImg.dataset.file = false; };
                avatarList.appendChild(img);
            });
        }

        if (avatarUpload) {
            avatarUpload.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => { previewImg.src = re.target.result; previewImg.dataset.file = true; };
                    reader.readAsDataURL(file);
                }
            };
        }

        if (finishBtn) {
            finishBtn.onclick = async () => {
                const name = usernameInput.value.trim();
                const bio = bioInput.value.trim();
                if (!name || name.length < 3) return alert('Name must be 3+ chars');
                if (!bio) return alert('Please set a bio description');

                finishBtn.disabled = true;
                finishBtn.textContent = 'SAVING...';

                try {
                    await fetch('/auth/set-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name }) });
                    await fetch('/api/profile/update-bio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio }) });

                    if (previewImg.dataset.file === 'true') {
                        const formData = new FormData();
                        formData.append('profilePicture', avatarUpload.files[0]);
                        await fetch('/api/profile/upload-picture', { method: 'POST', body: formData });
                    } else {
                        await fetch('/api/profile/upload-picture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profilePicture: previewImg.src }) });
                    }

                    screen.style.setProperty('display', 'none', 'important');
                    window.onboardingShown = true;
                    const updated = await (await fetch('/auth/user')).json();
                    if (typeof startGame === 'function') startGame(updated);
                } catch (err) {
                    console.error(err);
                    finishBtn.disabled = false;
                    finishBtn.textContent = 'ENTER THE WORLD';
                }
            };
        }

        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await fetch('/auth/logout', { method: 'POST' });
                window.location.reload();
            };
        }
    }
}

window.profileManager = new ProfileManager();
window.showOnboarding = (user) => {
    if (window.profileManager) window.profileManager.setupOnboarding(user);
};
