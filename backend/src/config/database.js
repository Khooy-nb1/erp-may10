const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const { execSync } = require('child_process');

function resolveHost() {
  if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
    return process.env.DB_HOST;
  }
  // If running on Windows with WSL2, WSL IP is the direct bridge to PostgreSQL
  if (process.platform === 'win32') {
    try {
      const wslIp = execSync('wsl -u root hostname -I', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 })
        .toString()
        .trim()
        .split(/\s+/)[0];
      if (wslIp) return wslIp;
    } catch (_) {
      // ignore
    }
  }
  return process.env.DB_HOST || '127.0.0.1';
}

const dbHost = resolveHost();

const pool = new Pool({
  host: dbHost,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'erp_may10',
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

module.exports = {
  pool,
  dbHost,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
