const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const { execSync } = require('child_process');

function isPortOpenSync(host, port, timeoutMs = 800) {
  try {
    const script = `
      const net = require('net');
      const s = net.createConnection(${port}, '${host}', () => {
        process.stdout.write('OPEN');
        s.destroy();
        process.exit(0);
      });
      s.on('error', () => process.exit(1));
      setTimeout(() => { s.destroy(); process.exit(1); }, ${timeoutMs});
    `;
    const res = require('child_process').spawnSync(process.execPath, ['-e', script], {
      timeout: timeoutMs + 1000,
      encoding: 'utf8',
      windowsHide: true,
    });
    return res.status === 0 && res.stdout === 'OPEN';
  } catch (_) {
    return false;
  }
}

function resolveHost() {
  const envHost = (process.env.DB_HOST || '').trim();
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

  // 1. Explicit custom remote host or domain (production / external server)
  if (envHost && !['127.0.0.1', 'localhost'].includes(envHost) && !envHost.startsWith('172.')) {
    return envHost;
  }

  // 2. If running directly inside Linux/WSL, 127.0.0.1 connects directly to local postgres
  if (process.platform !== 'win32') {
    return '127.0.0.1';
  }

  // 3. Platform-specific resolution for Windows host communicating with WSL/local service
  // 3a. If loopback 127.0.0.1 is open, use loopback
  if (isPortOpenSync('127.0.0.1', dbPort)) {
    return '127.0.0.1';
  }

  // 3b. Dynamic WSL IP resolution if loopback is closed but WSL is active
  try {
    const wslIp = execSync('wsl hostname -I', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2500 })
      .toString()
      .trim()
      .split(/\s+/)[0];
    if (wslIp && isPortOpenSync(wslIp, dbPort)) {
      return wslIp;
    }
  } catch (_) {
    // ignore
  }

  // 3c. If explicit host was configured and is reachable
  if (envHost && isPortOpenSync(envHost, dbPort)) {
    return envHost;
  }

  // 4. Default fallback: try WSL IP if available, otherwise 127.0.0.1
  try {
    const wslIp = execSync('wsl hostname -I', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 })
      .toString()
      .trim()
      .split(/\s+/)[0];
    if (wslIp) return wslIp;
  } catch (_) {}

  return envHost || '127.0.0.1';
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
