const app = require('./app');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 ERP MAY 10 — BACKEND PH4 (KHO & QUẢN LÝ VẬT TƯ)`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🩺 Health check:      http://localhost:${PORT}/api/v1/health`);
  console.log(`=======================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
