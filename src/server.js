// src/server.js
const app = require('./app');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Tastee API running on port ${PORT}`);
});

// Catch Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
  // Force exit sau 3s nếu không đóng được server
  setTimeout(() => process.exit(1), 3000);
});

// Catch Unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
  setTimeout(() => process.exit(1), 3000);
});
