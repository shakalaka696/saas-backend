require('dotenv').config();
const express = require('express');
const morgan = require('morgan');

// Start worker
require('./workers/notificationWorker');

const app = express();
app.use(morgan('dev'));
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/users', require('./routes/user.routes'));

app.use((err, req, res, next) => {
  console.error("❌ Error caught by global handler:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
