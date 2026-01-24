# How to Enable Google Login

For the "Login with Google" button to work, you need two secret keys from Google.

## Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project** (name it "Pixel App" or similar).
3. Select the project.

## Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Choose **External** > Create.
3. Fill in:
   - **App Name**: Pixel Ceylon
   - **Support Email**: Your email
   - **Developer Email**: Your email
4. Click **Save and Continue** (skip Scopes and Test Users for now).

## Step 3: Get Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3. Application Type: **Web application**.
4. **Authorized Redirect URIs** (Important!):
   - Add: `https://pixelceylone1-0.onrender.com/auth/google/callback`
   - Add: `http://localhost:3000/auth/google/callback` (for testing)
5. Click **Create**.

## Step 4: Copy Keys to Render
1. You will see **Client ID** and **Client Secret**.
2. Go to **Render Dashboard** > **Environment**.
3. Add two new variables:
   - Key: `GOOGLE_CLIENT_ID`
   - Value: (Paste your Client ID)
   
   - Key: `GOOGLE_CLIENT_SECRET`
   - Value: (Paste your Client Secret)
4. Save.

## Step 5: Update Local .env (Optional, for local testing)
If you run the app on your computer, paste these lines into your `.env` file:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```
