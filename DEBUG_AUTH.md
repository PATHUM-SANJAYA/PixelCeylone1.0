# Debugging "Authentication Failed"

The error `bad auth : authentication failed` means the **Username** or **Password** inside your connection link is 100% incorrect.

**Common Mistake:** Using your *email address* or *MongoDB Website Login*. You must use the specific **Database User** you created.

## Step 1: Check the Username
1. Go to [MongoDB Atlas](https://cloud.mongodb.com).
2. Look at the **Left Sidebar** under "Security".
3. Click **Database Access**.
4. Look at the list. You will see a user (e.g., `admin`, `pathum`, `user123`).
   * **THIS NAME** is what must be in your link.
   * If the name is `admin`, the link starts with `mongodb+srv://admin:...`

## Step 2: Create a Fresh User (Best Fix)
Let's make a new user to be absolutely sure.
1. On the **Database Access** page, click the green **Add New Database User** button.
2. **Authentication Method**: Password.
3. **Username**: `pixeluser` (Type exactly this).
4. **Password**: `pixel2026` (Type exactly this).
5. Open "Built-in Role" section -> Select "Atlas Admin" (or "Read and Write to any database").
6. Click **Add User**.

## Step 3: Get the NEW Connection String
1. Go to the **Database** tab (Left Sidebar).
2. Click **Connect**.
3. Click **Drivers**.
4. **Copy the connection string.**
5. It might look like: `mongodb+srv://<username>:<password>@cluster...`
6. **Manually edit it** to use the new user:
   * Replace `<username>` with `pixeluser`
   * Replace `<password>` with `pixel2026`
   
   **Final Result should look like:**
   `mongodb+srv://pixeluser:pixel2026@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
   *(Your 'cluster0.abcde...' part will be different, keep yours!)*

## Step 4: Update Render
1. Go to Render -> Environment.
2. Update `MONGO_URI` with this new link.
3. Save.
