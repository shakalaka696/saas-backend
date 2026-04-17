require('dotenv').config();
const app = require('./app');
const { AppDataSource } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Initialize Database
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");
    
    // Start the Express Server
    app.listen(PORT, () => {
      console.log(`API Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.error("Database connection failed:", error));