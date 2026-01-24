class PixelCanvas {
    constructor() {
        this.canvas = document.getElementById('pixel-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.canvasWidth = 1000000; // Restored to massive scale to match existing data
        this.canvasHeight = 1000000;
        this.pixelSize = 20;
        this.zoom = 1;
        this.offset = { x: 0, y: 0 };
        this.isDragging = false;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        this.selectedColor = '#000000';
        this.currentTool = 'pen';
        this.pixels = new Map();

        this.showGrid = true;
        this.lastPixelTimeByTool = {
            pen: parseInt(this.getCookie('lastPixelTime_pen')) || 0,
            eraser: parseInt(this.getCookie('lastPixelTime_eraser')) || 0,
            rainbow: parseInt(this.getCookie('lastPixelTime_rainbow')) || 0
        };

        this.socket = window.sharedSocket;

        // Mini-map elements
        this.miniMap = document.getElementById('mini-map-canvas');
        this.miniMapCtx = this.miniMap ? this.miniMap.getContext('2d') : null;
        this.miniMapViewport = document.getElementById('mini-map-viewport');

        this.audioEnabled = true;
        this.audioContext = null;
        this.hue = 0;

        // Context menu elements
        this.contextMenu = document.getElementById('context-menu');
        this.contextPos = { x: 0, y: 0 };

        this.initTools();
        this.setupCanvas();
        this.setupEventListeners();
        this.handleInitialLocation();

        this.render();

        // Socket events
        this.socket.on('init', (pixelData) => {
            this.pixels = new Map(pixelData);

            // AUTOMATIC ART FINDER:
            // If the user didn't use a location link (#x,y), find where the art is.
            if (!window.location.hash && pixelData.length > 0) {
                // Determine bounding box of all art to find the true center of the "world"
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                pixelData.forEach(entry => {
                    const [x, y] = entry[0].split(',').map(Number);
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                });

                // Jump to the center of the bounding box
                const targetX = Math.round((minX + maxX) / 2);
                const targetY = Math.round((minY + maxY) / 2);
                this.jumpTo(targetX, targetY);
                console.log(`Auto-centered on art at ${targetX}, ${targetY}`);
            } else if (!window.location.hash) {
                // If world is totally empty, start at 0,0
                this.centerOn(0, 0);
            }

            this.render();
            if (this.miniMap) this.drawMiniMap();
        });

        this.socket.on('pixel', (data) => {
            const key = `${data.x},${data.y}`;
            if (data.color === null) {
                this.pixels.delete(key);
            } else {
                this.pixels.set(key, data.color);
            }
            this.render();
            if (this.miniMap) this.drawMiniMap();
        });

        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
    }

    centerOn(gridX, gridY) {
        this.offset.x = (this.canvas.width / 2) - (gridX * this.pixelSize * this.zoom);
        this.offset.y = (this.canvas.height / 2) - (gridY * this.pixelSize * this.zoom);
    }

    initTools() {
        document.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', () => {
                this.setTool(button.getAttribute('data-tool'));
            });
        });

        const palette = document.getElementById('color-palette');
        const colors = [
            '#000000', '#FFFFFF', '#FF0000', '#00FF00',
            '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
            '#FF9900', '#9900FF', '#BDC3C7', '#2C3E50',
            '#E74C3C', '#2ECC71', '#3498DB', '#F1C40F'
        ];

        colors.forEach(color => {
            const button = document.createElement('div');
            button.className = 'color-button';
            button.style.backgroundColor = color;
            button.setAttribute('data-color', color);
            button.addEventListener('click', () => this.setColor(color));
            palette.appendChild(button);
        });

        const customColor = document.getElementById('custom-color');
        customColor.addEventListener('input', (e) => this.setColor(e.target.value));

        this.setColor('#000000');
    }

    setColor(color) {
        this.selectedColor = color;
        const input = document.getElementById('custom-color');
        if (input) input.value = color;

        let foundInPalette = false;
        document.querySelectorAll('.color-button').forEach(btn => {
            const isMatch = btn.getAttribute('data-color').toLowerCase() === color.toLowerCase();
            btn.classList.toggle('selected', isMatch);
            if (isMatch) foundInPalette = true;
        });

        // If it's a custom color not in palette, highlight the picker container
        const pickerContainer = document.querySelector('.picker-container');
        if (pickerContainer) {
            pickerContainer.style.borderColor = foundInPalette ? 'var(--border)' : '#fff';
            pickerContainer.style.boxShadow = foundInPalette ? 'none' : '0 0 15px #fff';
            pickerContainer.style.transform = foundInPalette ? 'scale(1)' : 'scale(1.2)';
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
        });

        // Update instruction display if needed
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            const key = e.key.toLowerCase();
            switch (key) {
                case 'p': this.setTool('pen'); break;
                case 'r': this.setTool('rainbow'); break;
                case 'e': this.setTool('eraser'); break;
                case 'i': this.setTool('picker'); break;
                case 'm': this.setTool('move'); break;
                case 'g': this.toggleGrid(); break;
                case 'f': this.toggleFullScreen(); break;
                case '+': this.zoomAt(innerWidth / 2, innerHeight / 2, 1.2); break;
                case '-': this.zoomAt(innerWidth / 2, innerHeight / 2, 0.8); break;
                case '0':
                    this.zoom = 1;
                    this.centerOn(500000, 500000);
                    this.render();
                    break;
                case 's': this.exportAsImage('png'); break;
                case 'c': if (window.chat) window.chat.toggleChat(); break;
            }
        });

        const handleInteraction = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
            const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
            return this.screenToGrid(x, y);
        };

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                const pos = handleInteraction(e);
                if (!pos) return;

                if (this.currentTool === 'move') {
                    this.isPanning = true;
                } else if (this.currentTool === 'picker') {
                    const key = `${pos.x},${pos.y}`;
                    if (this.pixels.has(key)) this.setColor(this.pixels.get(key));
                } else {
                    this.isDragging = true;
                    this.placePixel(pos.x, pos.y);
                }
            } else if (e.button === 2) {
                this.isPanning = true;
            }
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.offset.x += e.clientX - this.lastX;
                this.offset.y += e.clientY - this.lastY;
                this.render();
            } else if (this.isDragging) {
                const pos = handleInteraction(e);
                if (pos) this.placePixel(pos.x, pos.y);
            }
            this.lastX = e.clientX;
            this.lastY = e.clientY;

            const rect = this.canvas.getBoundingClientRect();
            const pos = this.screenToGrid(e.clientX - rect.left, e.clientY - rect.top);
            const coordEl = document.getElementById('coord-display');
            if (pos && coordEl) coordEl.textContent = `X: ${pos.x}, Y: ${pos.y}`;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isPanning = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            this.zoomAt(e.offsetX, e.offsetY, zoomFactor);
        }, { passive: false });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const pos = handleInteraction(e);
                if (pos) {
                    if (this.currentTool === 'move') this.isPanning = true;
                    else {
                        this.isDragging = true;
                        this.placePixel(pos.x, pos.y);
                    }
                }
                this.lastX = e.touches[0].clientX;
                this.lastY = e.touches[0].clientY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isPanning && e.touches.length === 1) {
                this.offset.x += e.touches[0].clientX - this.lastX;
                this.offset.y += e.touches[0].clientY - this.lastY;
                this.render();
            } else if (this.isDragging && e.touches.length === 1) {
                const pos = handleInteraction(e);
                if (pos) this.placePixel(pos.x, pos.y);
            }
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
            this.isPanning = false;
        });

        // UI Buttons
        document.getElementById('zoom-in').onclick = () => this.zoomAt(innerWidth / 2, innerHeight / 2, 1.25);
        document.getElementById('zoom-out').onclick = () => this.zoomAt(innerWidth / 2, innerHeight / 2, 0.8);
        document.getElementById('reset-view').onclick = () => {
            this.zoom = 1;
            this.centerOn(500000, 500000);
            this.render();
        };
        document.getElementById('toggle-grid').onclick = (e) => {
            this.toggleGrid();
            e.currentTarget.classList.toggle('active', this.showGrid);
        };
        document.getElementById('toggle-fullscreen').onclick = () => this.toggleFullScreen();
        document.getElementById('export-canvas').onclick = () => this.exportAsImage('png');

        document.getElementById('toggle-sound').onclick = (e) => {
            this.audioEnabled = !this.audioEnabled;
            const icon = e.currentTarget.querySelector('i');
            icon.className = this.audioEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        };

        // Mini-map
        document.getElementById('mini-map-container').onmousedown = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * this.canvasWidth;
            const y = ((e.clientY - rect.top) / rect.height) * this.canvasHeight;
            this.jumpTo(x, y);
        };

        // Context Menu
        this.canvas.oncontextmenu = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const pos = this.screenToGrid(e.clientX - rect.left, e.clientY - rect.top);
            if (pos) {
                this.contextPos = pos;
                this.contextMenu.style.display = 'block';
                this.contextMenu.style.left = e.clientX + 'px';
                this.contextMenu.style.top = e.clientY + 'px';
            }
        };

        document.onclick = (e) => {
            if (this.contextMenu && !this.contextMenu.contains(e.target)) this.contextMenu.style.display = 'none';
        };

        document.getElementById('copy-location').onclick = () => {
            const url = `${location.origin}${location.pathname}#x=${this.contextPos.x},y=${this.contextPos.y}`;
            navigator.clipboard.writeText(url).then(() => alert('Location link copied!'));
        };

        document.getElementById('share-chat').onclick = () => {
            if (window.chat) {
                window.chat.chatInput.value = `📍 Coordinates: [X:${this.contextPos.x}, Y:${this.contextPos.y}] 🚀`;
                window.chat.sendMessage();
            }
        };

        setInterval(() => this.updateTimerUI(), 100);
    }

    zoomAt(x, y, factor) {
        const oldScale = this.pixelSize * this.zoom;
        this.zoom = Math.min(20, Math.max(0.1, this.zoom * factor));
        const newScale = this.pixelSize * this.zoom;

        const worldX = (x - this.offset.x) / oldScale;
        const worldY = (y - this.offset.y) / oldScale;

        this.offset.x = x - worldX * newScale;
        this.offset.y = y - worldY * newScale;
        this.render();
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.render();
    }

    toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    placePixel(x, y) {
        const tool = this.currentTool;
        let cooldown = 1500;
        if (tool === 'eraser') cooldown = 3000;
        if (tool === 'rainbow') cooldown = 1000;

        const lastTime = this.lastPixelTimeByTool[tool] || 0;
        const now = Date.now();

        if (now - lastTime < cooldown) return;

        const key = `${x},${y}`;
        let color = this.selectedColor;

        if (tool === 'eraser') {
            color = null;
            this.pixels.delete(key);
            this.playSound(200, 'sawtooth');
            this.socket.emit('pixel', { x, y, color: null });
        } else {
            if (tool === 'rainbow') {
                this.hue = (this.hue + 20) % 360;
                color = `hsl(${this.hue}, 100%, 50%)`;
            }
            this.pixels.set(key, color);
            this.playSound(400 + Math.random() * 200, 'sine');
            this.socket.emit('pixel', { x, y, color });
        }

        this.lastPixelTimeByTool[tool] = now;
        this.setCookie('lastPixelTime_' + tool, now.toString(), 1);
        this.render();
    }

    updateTimerUI() {
        const tool = this.currentTool;
        let cooldown = 1500;
        if (tool === 'eraser') cooldown = 3000;
        if (tool === 'rainbow') cooldown = 1000;

        const lastTime = this.lastPixelTimeByTool[tool] || 0;
        const elapsed = Date.now() - lastTime;
        const remaining = Math.max(0, cooldown - elapsed);

        const status = document.getElementById('pixel-status');
        const timer = document.getElementById('next-pixel-time');
        const bar = document.getElementById('cooldown-bar');

        if (remaining > 0) {
            if (status) {
                status.textContent = 'Wait';
                status.className = 'time-value wait';
            }
            if (timer) timer.textContent = (remaining / 1000).toFixed(1) + 's';
            if (bar) bar.style.setProperty('--progress', (100 - (remaining / cooldown * 100)) + '%');
        } else {
            if (status) {
                status.textContent = 'Ready';
                status.className = 'time-value ready';
            }
            if (timer) timer.textContent = '0.0s';
            if (bar) bar.style.setProperty('--progress', '100%');
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const scale = this.pixelSize * this.zoom;

        // Grid
        if (this.showGrid && this.zoom > 0.4) {
            this.ctx.strokeStyle = 'rgba(0,0,0,0.06)';
            this.ctx.lineWidth = 1;

            const startX = Math.floor(-this.offset.x / scale);
            const startY = Math.floor(-this.offset.y / scale);
            const endX = startX + Math.ceil(this.canvas.width / scale);
            const endY = startY + Math.ceil(this.canvas.height / scale);

            this.ctx.beginPath();
            for (let x = Math.max(0, startX); x <= Math.min(this.canvasWidth, endX); x++) {
                const sx = x * scale + this.offset.x;
                this.ctx.moveTo(sx, 0);
                this.ctx.lineTo(sx, this.canvas.height);
            }
            for (let y = Math.max(0, startY); y <= Math.min(this.canvasHeight, endY); y++) {
                const sy = y * scale + this.offset.y;
                this.ctx.moveTo(0, sy);
                this.ctx.lineTo(this.canvas.width, sy);
            }
            this.ctx.stroke();
        }

        // Pixels with Culling
        const ps = Math.ceil(scale);
        for (const [key, color] of this.pixels.entries()) {
            const [x, y] = key.split(',').map(Number);
            const sx = x * scale + this.offset.x;
            const sy = y * scale + this.offset.y;

            if (sx + ps < 0 || sx > this.canvas.width || sy + ps < 0 || sy > this.canvas.height) continue;

            this.ctx.fillStyle = color;
            this.ctx.fillRect(Math.floor(sx), Math.floor(sy), ps, ps);
        }

        this.updateMiniMapViewport();
    }

    drawMiniMap() {
        if (!this.miniMap) return;
        this.miniMap.width = 1500;
        this.miniMap.height = 1500;
        this.miniMapCtx.fillStyle = '#f6f6f6';
        this.miniMapCtx.fillRect(0, 0, 1500, 1500);

        const scale = 1500 / this.canvasWidth;
        for (const [key, color] of this.pixels.entries()) {
            const [x, y] = key.split(',').map(Number);
            this.miniMapCtx.fillStyle = color;
            this.miniMapCtx.fillRect(x * scale, y * scale, Math.max(1, scale), Math.max(1, scale));
        }
    }

    updateMiniMapViewport() {
        if (!this.miniMapViewport) return;
        const container = document.getElementById('mini-map-container');
        const cw = container.offsetWidth;
        const ch = container.offsetHeight;
        const scale = this.pixelSize * this.zoom;

        const vx = (-this.offset.x / scale) / this.canvasWidth * cw;
        const vy = (-this.offset.y / scale) / this.canvasHeight * ch;
        const vw = (this.canvas.width / scale) / this.canvasWidth * cw;
        const vh = (this.canvas.height / scale) / this.canvasHeight * ch;

        this.miniMapViewport.style.left = Math.max(0, vx) + 'px';
        this.miniMapViewport.style.top = Math.max(0, vy) + 'px';
        this.miniMapViewport.style.width = Math.min(cw, vw) + 'px';
        this.miniMapViewport.style.height = Math.min(ch, vh) + 'px';
    }

    jumpTo(x, y) {
        this.zoom = 5;
        this.offset.x = (this.canvas.width / 2) - (x * this.pixelSize * this.zoom);
        this.offset.y = (this.canvas.height / 2) - (y * this.pixelSize * this.zoom);
        this.render();
    }

    screenToGrid(sx, sy) {
        const scale = this.pixelSize * this.zoom;
        const x = Math.floor((sx - this.offset.x) / scale);
        const y = Math.floor((sy - this.offset.y) / scale);
        if (x >= 0 && x < this.canvasWidth && y >= 0 && y < this.canvasHeight) return { x, y };
        return null;
    }

    exportAsImage(format = 'png') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tctx = tempCanvas.getContext('2d');

        // Draw deep background color first
        tctx.fillStyle = '#f6f6f6';
        tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the current canvas pixels
        tctx.drawImage(this.canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `pixelceylon-art-${Date.now()}.${format}`;
        link.href = tempCanvas.toDataURL(`image/${format}`, 1.0);
        link.click();
    }

    handleInitialLocation() {
        const hash = location.hash;
        if (hash) {
            const matches = hash.match(/x=(\d+),y=(\d+)/);
            if (matches) setTimeout(() => this.jumpTo(parseInt(matches[1]), parseInt(matches[2])), 800);
        }
    }

    playSound(freq, wave) {
        if (!this.audioEnabled) return;
        try {
            if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = wave;
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.15);
        } catch (e) { }
    }

    getCookie(n) {
        let b = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
        return b ? b.pop() : '';
    }

    setCookie(n, v, d) {
        let e = "";
        if (d) {
            let dt = new Date();
            dt.setTime(dt.getTime() + (d * 24 * 60 * 60 * 1000));
            e = "; expires=" + dt.toUTCString();
        }
        document.cookie = n + "=" + v + e + "; path=/";
    }
}

window.addEventListener('load', () => { window.pixelCanvas = new PixelCanvas(); });
