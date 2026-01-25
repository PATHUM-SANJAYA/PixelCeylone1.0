# 🚀 Ultimate Render Deployment Guide for PixelCeylon

This guide will help you host your collaborative pixel art hub on Render.com with MongoDB persistence.

## ✅ Completed Feature Checklist
- **Real-Time Canvas**: 🟢 **Production Ready**
- **Direct Messaging & Inbox**: � **Production Ready** (Saved to DB)
- **White Narrative Theme**: 🟢 **Optimized**
- **User Profiles & Avatars**: 🟢 **Functional**
- **Live Online Counter**: 🟢 **Active via Socket.io**

---

## Step 1: Initialize Git and Push to GitHub
1.  **Create a New Repository** on [GitHub](https://github.com/new).
2.  Open your terminal in the project folder and run:
    ```powershell
    git init
    # Note: .gitignore is already set to protect your secrets
    git add .
    git commit -m "Final Creative Release - White Theme & DMs"
    git branch -M main
    git remote add origin https://github.com/YOUR_GITHUB_NAME/pixel-ceylon.git
    git push -u origin main
    ```

---

## Step 2: Set up MongoDB Atlas (Required for Persistence)
Render restarts every time you update code. Without MongoDB, your art will be deleted!

1.  Sign up at [MongoDB Atlas](https://www.mongodb.com/).
2.  **Deploy a Free Cluster** (M0). 
3.  **🚨 CRITICAL FIX FOR YOUR ERROR:**
    *   In the sidebar, click **Network Access**.
    *   Click **Add IP Address**.
    *   Select **"ALLOW ACCESS FROM ANYWHERE"** (or type `0.0.0.0/0`).
    *   *If you don't do this, Render will give you an "SSL internal error" because it doesn't recognize the IP.*
4.  In **Database Access**, create a user (e.g., `admin`) and set a strong password.
5.  Click **Connect** -> **Drivers** -> Copy the `Connection String`.
    *   *It looks like: `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`*

---

## Step 3: Launch on Render
1.  Go to [Render.com Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configuration**:
    *   **Name**: `pixel-ceylon`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  **Advanced (Environment Variables)**:
    Add these keys one by one:

| Key | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `MONGO_URI` | *(The Connection String from Step 2)* |
| `SESSION_SECRET` | *(Any random long string for security)* |
| `GOOGLE_CLIENT_ID` | *(Optional: From Google Cloud Console)* |
| `GOOGLE_CLIENT_SECRET` | *(Optional: From Google Cloud Console)* |

6.  Click **Create Web Service**.

---

## Step 4: Add Redirect for Google Login (If using Google Auth)
1.  Once Render gives you your site URL (e.g., `https://pixel-ceylon.onrender.com`).
2.  Go to your [Google Cloud Console Auth Credentials](https://console.cloud.google.com/apis/credentials).
3.  Add this to **Authorized Redirect URIs**:
    *   `https://pixel-ceylon.onrender.com/auth/google/callback`

---

## 🎯 Launch Verification
1.  Visit your live URL.
2.  Check the Render logs; it should say **"Connected to MongoDB"**.
3.  Draw a few pixels and refresh. If they stay, your database is working!

*Created for the Sri Lankan Art Community.*
