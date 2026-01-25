# 🚀 Complete Deployment Checklist for PixelCeylon

Follow these steps **in order** to deploy your website to Render.com with MongoDB.

---

## ✅ **STEP 1: Set Up MongoDB Atlas (Database)**

### 1.1 Create Free MongoDB Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up or log in
3. Click **"Build a Database"**
4. Select **"M0 FREE"** tier
5. Choose a cloud provider (AWS recommended)
6. Click **"Create Cluster"** (takes 3-5 minutes)

### 1.2 Configure Network Access (CRITICAL!)
1. In the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"ALLOW ACCESS FROM ANYWHERE"**
4. Confirm (this allows Render to connect)

### 1.3 Create Database User
1. In the left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `admin` (or your choice)
5. Password: Create a **strong password** (save it!)
6. User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### 1.4 Get Connection String
1. Go back to **"Database"** in sidebar
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Copy the connection string (looks like this):
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **IMPORTANT**: Replace `<password>` with your actual password
6. **Save this string** - you'll need it for Render!

---

## ✅ **STEP 2: Push Code to GitHub**

### 2.1 Initialize Git (if not done)
Open PowerShell in your project folder:

```powershell
# Check if git is initialized
git status

# If not initialized, run:
git init
```

### 2.2 Create GitHub Repository
1. Go to [GitHub](https://github.com/new)
2. Repository name: `pixel-ceylon` (or your choice)
3. Make it **Public** or **Private**
4. **DO NOT** initialize with README
5. Click **"Create repository"**

### 2.3 Push Your Code
```powershell
# Add all files
git add .

# Commit
git commit -m "Initial deployment - PixelCeylon v1.0"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/pixel-ceylon.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## ✅ **STEP 3: Deploy on Render**

### 3.1 Create Render Account
1. Go to [Render.com](https://render.com/)
2. Sign up with GitHub (recommended)

### 3.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Click **"Connect a repository"**
3. Find and select your `pixel-ceylon` repository
4. Click **"Connect"**

### 3.3 Configure Service Settings
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `pixel-ceylon` (or your choice) |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

### 3.4 Add Environment Variables
Scroll down to **"Environment Variables"** and click **"Add Environment Variable"**

Add these **one by one**:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `MONGO_URI` | *Your MongoDB connection string from Step 1.4* | **CRITICAL** |
| `SESSION_SECRET` | `pixelCeylon2026SecretKey` | Change to random string |
| `GOOGLE_CLIENT_ID` | *Leave empty for now* | We'll add this in Step 4 |
| `GOOGLE_CLIENT_SECRET` | *Leave empty for now* | We'll add this in Step 4 |

### 3.5 Deploy!
1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. You'll see build logs - wait for **"Your service is live 🎉"**
4. Copy your URL (e.g., `https://pixel-ceylon.onrender.com`)

---

## ✅ **STEP 4: Fix Google Login**

Google Login won't work until you configure it properly.

### 4.1 Go to Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### 4.2 Create New Project (if needed)
1. Click the project dropdown at the top
2. Click **"New Project"**
3. Name: `PixelCeylon`
4. Click **"Create"**

### 4.3 Enable Google+ API
1. In the left menu, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click it and click **"Enable"**

### 4.4 Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure consent screen:
   - User Type: **External**
   - App name: `PixelCeylon`
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"** through all steps

4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `PixelCeylon Web`
   
5. **Authorized redirect URIs** - Click **"Add URI"** and add:
   ```
   https://pixel-ceylon.onrender.com/auth/google/callback
   ```
   *(Replace with YOUR actual Render URL)*

6. Click **"Create"**

### 4.5 Copy Credentials
You'll see a popup with:
- **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-xxxxxxxxxxxxx`)

**SAVE THESE!**

### 4.6 Add to Render Environment Variables
1. Go back to your Render dashboard
2. Click on your `pixel-ceylon` service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add:
   - Key: `GOOGLE_CLIENT_ID` → Value: *Your Client ID*
   - Key: `GOOGLE_CLIENT_SECRET` → Value: *Your Client Secret*
6. Click **"Save Changes"**
7. Render will automatically redeploy (wait 2-3 minutes)

---

## ✅ **STEP 5: Verify Everything Works**

### 5.1 Check Render Logs
1. In Render dashboard, click **"Logs"** tab
2. You should see:
   ```
   ✅ Google Strategy Initialized
   Connected to MongoDB
   Loaded X pixels from MongoDB
   Server running on http://0.0.0.0:10000
   ==> Your service is live 🎉
   ```

### 5.2 Test Your Website
1. Open your Render URL (e.g., `https://pixel-ceylon.onrender.com`)
2. You should see the landing page
3. Click **"PLAY NOW"**
4. Try **"CONTINUE WITH GOOGLE"** - it should work now!
5. Try creating a local account (username/password)
6. Draw some pixels
7. Refresh the page - pixels should remain!

---

## 🔧 **Troubleshooting**

### MongoDB Connection Error
**Error**: `MongoServerSelectionError: SSL alert`

**Fix**: 
1. Go to MongoDB Atlas → Network Access
2. Make sure `0.0.0.0/0` is in the IP whitelist
3. Wait 2 minutes and redeploy on Render

### Google Login Shows Error
**Error**: `redirect_uri_mismatch`

**Fix**:
1. Check your Render URL is EXACTLY in Google Cloud Console
2. Make sure it ends with `/auth/google/callback`
3. No trailing slashes!

### Website Shows "Cannot GET /"
**Fix**: Check Render logs for errors. Usually means build failed.

---

## 📝 **Quick Reference**

### Your URLs:
- **Live Site**: `https://pixel-ceylon.onrender.com` *(your actual URL)*
- **MongoDB**: [cloud.mongodb.com](https://cloud.mongodb.com/)
- **Render Dashboard**: [dashboard.render.com](https://dashboard.render.com/)
- **Google Console**: [console.cloud.google.com](https://console.cloud.google.com/)

### Important Files:
- `package.json` - Dependencies
- `server.js` - Main server
- `.env` - Local secrets (NOT on GitHub)
- `render.yaml` - Render config

---

## 🎉 **You're Done!**

Your collaborative pixel art platform is now live and accessible worldwide!

**Next Steps**:
- Share your URL with friends
- Monitor Render logs for any issues
- Free tier sleeps after 15 min of inactivity (wakes up automatically)

*Created for the Sri Lankan Art Community* 🇱🇰
