# 🚀 PixelCeylon - 100% Free Cloud Hosting Guide

This guide will help you deploy your PixelCeylon collaborative pixel art website to the cloud for **completely free**.

---

## 🌟 Option 1: Render.com (RECOMMENDED - Best for beginners)

**Why Render?**
- ✅ 100% Free tier (no credit card required)
- ✅ Automatic HTTPS/SSL
- ✅ WebSocket support (Socket.IO works perfectly)
- ✅ Auto-deploy from GitHub
- ✅ 750 hours/month free (always runs if you have 1 app)

### Step-by-Step Deployment:

#### 1. Prepare Your Code
First, make sure your `package.json` has these scripts:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

#### 2. Create a GitHub Repository
```bash
# In your project folder (e:/pixel html/)
git init
git add .
git commit -m "Initial commit - PixelCeylon by Pathum Sanjaya"
```

- Go to https://github.com and create a new repository named "pixelceylon"
- Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/pixelceylon.git
git branch -M main
git push -u origin main
```

#### 3. Deploy on Render
1. Go to https://render.com and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your `pixelceylon` repository
5. Configure:
   - **Name:** `pixelceylon`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Select **FREE**
6. Click **"Create Web Service"**

**Your site will be live at:** `https://pixelceylon.onrender.com`

⚠️ **Note:** Free tier sleeps after 15 minutes of inactivity. First visit takes ~30 seconds to wake up.

---

## 🌟 Option 2: Railway.app (Great Alternative)

**Why Railway?**
- ✅ $5 free credit every month (enough for a small app)
- ✅ Very fast deployments
- ✅ Built-in database options
- ✅ Custom domains supported

### Deployment Steps:

1. Go to https://railway.app
2. Sign up with GitHub (free)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `pixelceylon` repository
5. Railway will auto-detect Node.js and deploy
6. Click on your deployment → **"Settings"** → **"Generate Domain"**

**Your site will be live at:** `https://pixelceylon-production.up.railway.app`

---

## 🌟 Option 3: Glitch.com (Instant & Easy)

**Why Glitch?**
- ✅ No setup required - instant deployment
- ✅ Web-based code editor
- ✅ Always-on with paid plan, but free tier restarts every 5 mins if inactive
- ✅ Great for testing

### Deployment Steps:

1. Go to https://glitch.com
2. Click **"New Project"** → **"Import from GitHub"**
3. Paste your repository URL
4. Your app will be live instantly!

**Your site will be live at:** `https://pixelceylon.glitch.me`

---

## 🌟 Option 4: Fly.io (Advanced Users)

**Why Fly.io?**
- ✅ 3 free VMs with 256MB RAM each
- ✅ Global edge deployment
- ✅ Very fast performance

### Deployment Steps:

1. Install Fly CLI:
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Then login
fly auth signup
```

2. In your project folder:
```bash
fly launch
# Answer the questions:
# - App name: pixelceylon
# - Region: Choose closest to you
# - Database: No
# - Deploy now: Yes
```

**Your site will be live at:** `https://pixelceylon.fly.dev`

---

## 📝 Important Configuration Changes

### Update `server.js` for Production

Make sure line 16 in `server.js` looks like this:
```javascript
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
```

### Update `index.html` Socket Connection

In `index.html` (around line 166), the socket connection is already configured correctly:
```javascript
window.sharedSocket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin, {
    transports: ['websocket'],
    reconnection: true
});
```
This automatically works in production! ✅

---

## 🎯 Recommended: Use Render.com

For **PixelCeylon**, I **strongly recommend Render.com** because:
1. **Truly free** (no credit card required)
2. **WebSocket support** (critical for your real-time pixel updates)
3. **File persistence** (your `pixel_data.json` will be saved)
4. **Auto-deploy** (push to GitHub = auto update)
5. **Custom domain** (you can add your own domain later)

---

## 🔧 Keeping Your App Awake (Optional)

Render free tier sleeps after 15 minutes. To keep it always awake:

### Method 1: UptimeRobot (Free)
1. Go to https://uptimerobot.com
2. Create free account
3. Add monitor:
   - **Type:** HTTP(s)
   - **URL:** Your deployed URL
   - **Interval:** 5 minutes
4. Your app will never sleep!

### Method 2: Cron-Job.org
1. Go to https://cron-job.org
2. Create free account
3. Create job to ping your URL every 5 minutes

---

## 🎨 Post-Deployment Checklist

After deployment, verify:
- [ ] Website loads correctly
- [ ] You can create an account
- [ ] Drawing pixels works
- [ ] Chat works
- [ ] Pixels persist after refresh
- [ ] Other users can join
- [ ] Notifications appear

---

## 🚨 Troubleshooting

### "Application Error" on Render
- Check **Logs** in Render dashboard
- Make sure `package.json` has all dependencies
- Verify `npm install` completed successfully

### Pixels Don't Save
- Make sure `pixel_data.json` file exists
- Check file permissions in server logs
- Render free tier has persistent disk storage ✅

### WebSocket Connection Fails
- Make sure you're using `https://` (not `http://`)
- Check browser console for errors
- Verify Socket.IO version matches client and server

---

## 🎉 You're Live!

Once deployed, share your link:
```
🌐 PixelCeylon - Global Collaborative Pixel Art
Created by: Pathum Sanjaya
Live at: https://your-app-name.onrender.com
```

**Enjoy your free, fully-functional cloud-hosted pixel art platform!** 🎨

---

## 📞 Need Help?

If you encounter issues:
1. Check deployment logs in your hosting platform
2. Verify all dependencies are installed
3. Test locally with `npm start` first
4. Check browser console for errors

**Your collaborative pixel art masterpiece is now accessible worldwide!** 🌍✨
