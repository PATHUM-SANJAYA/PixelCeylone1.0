const mongoose = require('mongoose');

// ==========================================
// PASTE YOUR CONNECTION STRING BELOW
// It should look like: mongodb+srv://username:password@cluster...
// ==========================================
const TEST_URI = "mongodb+srv://admin:PA5449sanjaya@cluster0.8aqjgqe.mongodb.net/?appName=Cluster0";

async function testConnection() {
    console.log("---------------------------------------------------");
    console.log("Testing MongoDB Connection...");
    console.log("Target URI:", TEST_URI);

    if (TEST_URI.includes("PASTE_YOUR")) {
        console.error("\n❌ ERROR: You haven't pasted your connection string yet!");
        console.error("1. Open this file (test-db.js)");
        console.error("2. Replace the TEST_URI text with your link from MongoDB Atlas.");
        console.error("3. Save and run 'node test-db.js' again.");
        return;
    }

    try {
        await mongoose.connect(TEST_URI);
        console.log("\n✅ SUCCESS! Connection Established.");
        console.log("You can safely copy this string to Render.");
        console.log("---------------------------------------------------");
    } catch (err) {
        console.error("\n❌ CONNECTION FAILED");
        console.error("Error Message:", err.message);

        if (err.message.includes('bad auth')) {
            console.error("\n👉 CAUSE: Incorrect Username or Password.");
            console.error("   - Check if you created a 'Database User' in the 'Database Access' tab.");
            console.error("   - Ensure you are NOT using your main Atlas login email.");
            console.error("   - Check for typos.");
        } else if (err.message.includes('ENOTFOUND')) {
            console.error("\n👉 CAUSE: Incorrect Cluster Address.");
            console.error("   - You might have accidentally deleted part of the address.");
        }
        console.log("---------------------------------------------------");
    } finally {
        // Close connection if open, then exit
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }
}

testConnection();
