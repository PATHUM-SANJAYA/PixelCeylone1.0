# How to Fix the "Disappearing Art" Bug (Setting up MongoDB)

To keep your pixel art forever, we need to move the storage from a "temporary file" to a "permanent database" in the cloud. We will use **MongoDB Atlas** (it's free).

## Step 1: Create a Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and register for a free account.
2. Create a new **Cluster** (select the **Shared / Free** option).
3. Choose a provider (AWS) and region (closest to you), then click **Create Deployment**.

## Step 2: Create a Database User
1. Go to the **Database Access** tab (on the left sidebar).
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Enter a username (e.g., `admin`) and a password. **Write these down!**
5. Click **Create User**.

## Step 3: Allow Connection
1. Go to the **Network Access** tab (left sidebar).
2. Click **Add IP Address**.
3. Click **Allow Access From Anywhere** (it adds `0.0.0.0/0`).
4. Click **Confirm**.

## Step 4: Get Your Connection String
1. Go back to the **Database** tab (left sidebar).
2. Click **Connect** on your cluster.
3. Select **Drivers** (Node.js).
4. **Copy the connection string.** It looks like this:
   `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`

## Step 5: Add to Render
1. Go to your project on the [Render Dashboard](https://dashboard.render.com/).
2. Click **Environment**.
3. Click **Add Environment Variable**.
4. Key: `MONGO_URI`
5. Value: *Paste your connection string here* (Replace `<password>` with the real password you created in Step 2).
6. Click **Save Changes**.

## Step 6: Redeploy
Render might auto-deploy when you save the variable, or you might need to trigger a manual deploy. Once deployed, your art will save to the database!
