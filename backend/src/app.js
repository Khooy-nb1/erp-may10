const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { authMiddleware, requireRoles } = require('./middlewares/auth');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const masterDataRoutes = require('./routes/masterDataRoutes');
const viTriKhoRoutes = require('./routes/viTriKhoRoutes');
const loVatTuRoutes = require('./routes/loVatTuRoutes');
const tonKhoRoutes = require('./routes/tonKhoRoutes');
const phieuNhapRoutes = require('./routes/phieuNhapRoutes');
const phieuXuatRoutes = require('./routes/phieuXuatRoutes');
const phieuChuyenRoutes = require('./routes/phieuChuyenRoutes');
const phieuKiemKeRoutes = require('./routes/phieuKiemKeRoutes');
const purchasingRoutes = require('./routes/purchasingRoutes');
const productionRoutes = require('./routes/productionRoutes');
const financeRoutes = require('./routes/financeRoutes');
const portalRoutes = require('./routes/portalRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Tắt header công khai framework Express (RBAC-F09)
app.disable('x-powered-by');

// Cấu hình HTTP Security Headers cơ bản (RBAC-F09)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Cấu hình CORS Allowlist (RBAC-F08)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép requests không có origin (như curl, mobile apps, local server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS Not Allowed: Origin is not in trusted allowlist'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'UP',
    module: 'PH4 — KHO & QUẢN LÝ VẬT TƯ (ERP MAY 10)',
    database: 'erp_may10',
    timestamp: new Date().toISOString(),
  });
});

// Gắn RBAC Auth Middleware cho API
app.use('/api/v1', authMiddleware);

// Đăng ký các route nghiệp vụ PH4
app.use('/api/v1/master-data', masterDataRoutes);
app.use('/api/v1/vi-tri-kho', viTriKhoRoutes);
app.use('/api/v1/lo-vat-tu', loVatTuRoutes);
app.use('/api/v1/ton-kho', tonKhoRoutes);
app.use('/api/v1/phieu-nhap', phieuNhapRoutes);
app.use('/api/v1/phieu-xuat', phieuXuatRoutes);
app.use('/api/v1/phieu-chuyen', phieuChuyenRoutes);
app.use('/api/v1/phieu-kiem-ke', phieuKiemKeRoutes);
app.use('/api/v1/purchasing', purchasingRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin/users', userRoutes);
app.use('/api/v1', portalRoutes);

// Đăng ký các route nghiệp vụ PH5: Tài chính - Kế toán & Giá thành
app.use('/api/v1/finance', authMiddleware, requireRoles('ke_toan', 'ke_toan_truong'), financeRoutes);
app.use('/api', authMiddleware, requireRoles('ke_toan', 'ke_toan_truong'), financeRoutes);

// Xử lý route không tồn tại và lỗi
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
