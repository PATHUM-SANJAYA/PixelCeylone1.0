class Chat {
    constructor() {
        this.socket = window.sharedSocket;
        this.userId = this.getUserId();
        this.username = this.getStoredUsername();
        this.selectedLanguage = this.getStoredLanguage() || 'en';
        this.unreadCount = 0;
        this.isOpen = false;

        this.setupElements();
        this.initEmojiPanel();
        this.setupEventListeners();
        this.setupSocketListeners();
        // Welcome screen handled by auth.js
    }

    getUserId() {
        let id = this.getCookie('pixelUserId');
        if (!id) {
            id = Math.random().toString(36).substr(2, 6).toUpperCase();
            this.setCookie('pixelUserId', id, 365);
        }
        return id;
    }

    getStoredUsername() { return this.getCookie('pixelUsername'); }
    getStoredLanguage() { return this.getCookie('pixelLanguage'); }

    setCookie(n, v, d) {
        let e = "";
        if (d) {
            let dt = new Date();
            dt.setTime(dt.getTime() + (d * 24 * 60 * 60 * 1000));
            e = "; expires=" + dt.toUTCString();
        }
        document.cookie = n + "=" + v + e + "; path=/";
    }

    getCookie(n) {
        let b = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
        return b ? b.pop() : '';
    }

    setupElements() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatToggle = document.getElementById('chat-toggle');
        this.chatPanel = document.querySelector('.chat-panel');
        this.minimizeButton = document.getElementById('minimize-chat');
        this.messagesContainer = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-message');
        this.languageSelect = document.getElementById('language-select');
        this.unreadCountElement = document.getElementById('unread-count');
        this.emojiToggle = document.getElementById('emoji-toggle');
        this.emojiPanel = document.getElementById('emoji-panel');

        this.notificationContainer = document.getElementById('notification-container');
    }

    setUsername(name) {
        this.username = name;
        this.setCookie('pixelUsername', name, 365);
    }

    initEmojiPanel() {
        const emojiList = [
            '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀', '👨‍🚒', '👩‍🚒', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', '👲', '🧕', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🏃', '👯', '🧘', '🛀', '🛌', '🧗', '🏇', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '💏', '💑', '👪', '🧶', '🧵', '🧥', '🥼', '🦺', '👚', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👛', '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑️', '💄', '💍', '💼', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙊', '🙉', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦢', '🦉', '🦚', '🦜', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐾', '🐉', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐️', '🌟', '✨', '⚡️', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅️', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄️', '🌬️', '💨', '💧', '💦', '☔️', '☂️', '🌊', '🌫️'
        ];

        emojiList.forEach(e => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.textContent = e;
            span.onclick = () => {
                this.chatInput.value += e;
                this.chatInput.focus();
                this.emojiPanel.classList.remove('show');
            };
            this.emojiPanel.appendChild(span);
        });

        document.addEventListener('click', (e) => {
            if (!this.emojiToggle.contains(e.target) && !this.emojiPanel.contains(e.target)) {
                this.emojiPanel.classList.remove('show');
            }
        });
    }

    setupEventListeners() {
        this.chatToggle.onclick = () => this.toggleChat();
        this.minimizeButton.onclick = () => this.toggleChat();
        this.sendButton.onclick = () => this.sendMessage();
        this.chatInput.onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
        this.emojiToggle.onclick = (e) => {
            e.stopPropagation();
            this.emojiPanel.classList.toggle('show');
        };
        this.languageSelect.onchange = (e) => {
            this.selectedLanguage = e.target.value;
            this.setCookie('pixelLanguage', e.target.value, 365);
        };
    }

    setupSocketListeners() {
        this.socket.on('chat message', (data) => this.receiveMessage(data));
        this.socket.on('user joined', (name) => {
            this.addSystemMessage(`${name} joined`);
            this.showNotification(name, 'joined');
        });
        this.socket.on('user left', (name) => {
            this.addSystemMessage(`${name} left`);
            this.showNotification(name, 'left');
        });
        this.socket.on('online count', (count) => {
            const el = document.getElementById('online-count');
            if (el) el.textContent = count;
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.chatPanel.classList.toggle('show', this.isOpen);
        if (this.isOpen) {
            this.unreadCount = 0;
            this.updateUnreadCount();
            setTimeout(() => this.chatInput.focus(), 100);
        }
    }

    updateUnreadCount() {
        this.unreadCountElement.textContent = this.unreadCount || '';
        this.unreadCountElement.style.display = this.unreadCount > 0 ? 'block' : 'none';
    }

    sendMessage() {
        const msg = this.chatInput.value.trim();
        if (!msg) return;
        const data = {
            userId: this.userId,
            username: this.username,
            message: msg,
            timestamp: new Date().toISOString()
        };
        this.socket.emit('chat message', data);
        this.addMessage(data, 'sent');
        this.chatInput.value = '';
    }

    receiveMessage(data) {
        if (data.userId === this.userId) return;
        this.addMessage(data, 'received');
        if (!this.isOpen) {
            this.unreadCount++;
            this.updateUnreadCount();
            this.playNotificationSound();
        }
    }

    addMessage(data, type) {
        const el = document.createElement('div');
        el.className = `chat-message ${type}`;
        el.innerHTML = `<div class="message-info">${data.username}</div><div class="message-content">${data.message}</div>`;
        this.messagesContainer.appendChild(el);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    addSystemMessage(msg) {
        const el = document.createElement('div');
        el.className = 'chat-message system';
        el.style.textAlign = 'center';
        el.style.opacity = '0.5';
        el.style.fontSize = '8px';
        el.textContent = msg;
        this.messagesContainer.appendChild(el);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showNotification(name, action) {
        const el = document.createElement('div');
        el.className = `pixel-notification ${action}-notification`;

        // Determine icon and message based on action
        const isJoin = action === 'joined';
        const icon = isJoin ? '👋' : '👋';
        const title = isJoin ? 'New Artist' : 'Artist Left';
        const message = isJoin ? `${name} joined the canvas` : `${name} left the canvas`;

        el.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;

        this.notificationContainer.appendChild(el);

        // Auto-remove after 4 seconds with fade animation
        setTimeout(() => {
            el.style.animation = 'fadeOutChill 0.4s ease-out forwards';
            setTimeout(() => el.remove(), 400);
        }, 4000);
    }

    playNotificationSound() {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.frequency.setValueAtTime(800, context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, context.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.1);
        } catch (e) { }
    }
}

window.addEventListener('load', () => { window.chat = new Chat(); });
