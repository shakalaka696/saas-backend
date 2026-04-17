require('dotenv').config();
const { AppDataSource } = require('./config/database');

// Workers need the DB to update status (isVerified, SENT, etc.)
AppDataSource.initialize().then(() => {
    console.log("✅ Workers connected to Database");
    
    // Import the worker files to start them
    require('./workers/otpWorker');
    require('./workers/campaignWorker');
    
    console.log("📨 Background Workers are watching Redis...");
}).catch(err => console.error("❌ Worker DB connection failed:", err));