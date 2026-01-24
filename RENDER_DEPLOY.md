# 🚀 Ultimate Render Deployment Guide for PixelCeylon

This guide will help you host your pixel art website on Render.com for **FREE**.

## ✅ Functionality Check
- **Local Login (User/Pass)**: 🟢 **Working** (Verified).
- **Google Login**: 🟡 **Needs Config** (Requires real URL).
- **Pixel Persistence**: 🟢 **Ready** (Will save to MongoDB forever).

---

## Step 1: Push Code to GitHub
(If you haven't already)
1.  Create a new repository on GitHub.
2.  Run these commands in your terminal:
    ```bash
    git init
    git add .
    git commit -m "Ready for deployment"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/pixel-ceylon.git
    git push -u origin main
    ```

---

## Step 2: Create a MongoDB Database (CRITICAL for "Forever" Data)
Render's disk is "ephemeral" (wiped on restart). You **MUST** use MongoDB to save pixels forever.

1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a **FREE** Cluster.
3.  Create a Database User (username/password).
4.  Get the **Connection String** (looks like `mongodb+srv://user:pass@cluster...`).
    *   *Save this string, you need it for Step 3.*

---

## Step 3: Deploy on Render
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Settings**:
    *   **Name**: `pixelceylone1-0` (or similar)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  **Environment Variables** (This is the most important part!):
    *   Click "Advanced" or "Environment Variables" and add these:
    
    | Key | Value |
    | :--- | :--- |
    | `NODE_ENV` | `production` |
    | `MONGO_URI` | *(Your MongoDB Connection String from Step 2)* |
    | `SESSION_SECRET` | `supersecretkey_change_me` |
    | `GOOGLE_CLIENT_ID` | `YOUR_CLIENT_ID_HERE` |
    | `GOOGLE_CLIENT_SECRET` | `YOUR_CLIENT_SECRET_HERE` |

6.  Click **Create Web Service**.

---

## Step 4: Configure Google Login (Final Step)
For Google Login to work on the live site:

1.  Wait for the Render deploy to finish. Copy your new URL (e.g., `https://pixelceylone1-0.onrender.com`).
2.  Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
3.  Edit your **OAuth 2.0 Client**.
4.  Under **Authorized redirect URIs**, add:
    *   `https://pixelceylone1-0.onrender.com/auth/google/callback`
    *   *(Replace `https://pixelceylone1-0.onrender.com` with your ACTUAL Render URL)*.
5.  Save.

---

## 🎯 Verification
1.  Open your website URL.
2.  **Stats**: It should say "Loaded X pixels from MongoDB" in the server logs.
3.  **Register**: Create an account.
4.  **Draw**: Draw some pixels.
5.  **Restart**: Even if Render restarts, your pixels will remain because they are in MongoDB!
