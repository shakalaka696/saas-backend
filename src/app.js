const express = require('express');
// const { AppDataSource } = require('./config/database');


const tenantRoutes = require('./routes/tenantRoutes');
const authRoutes = require('./routes/authRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();
app.use(express.json()); 


app.use('/api', tenantRoutes);
app.use('/api/admin/auth', authRoutes); 
app.use('/api/admin', adminUserRoutes);
app.use('/api/customers', publicRoutes);
app.use('/api/admin', adminRoutes);


module.exports = app;

// AppDataSource.initialize()
//   .then(() => {
//     console.log("Database Connected to Neon");
//     app.listen(3000, () => {
//       console.log(" Server is running on http://localhost:3000");
//     });
//   })
//   .catch((error) => {
//     console.log("Database connection failed:", error);
//   });

