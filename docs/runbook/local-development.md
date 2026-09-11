# Hướng dẫn Khởi chạy Môi trường Phát triển Cục bộ (Local Runbook)

Tài liệu này hướng dẫn chi tiết quy trình cài đặt, cấu hình cơ sở dữ liệu, chạy kiểm thử và khởi động ứng dụng cho phân hệ **ERP Bán hàng & Quản lý Khách hàng (Sales & CRM)**.

---

## 1. Yêu cầu Hệ thống

- **Node.js**: v20.x trở lên (khuyến nghị Node 22 LTS hoặc Node 24).
- **Trình quản lý gói**: `pnpm` (v9 hoặc v10).
- **Cơ sở dữ liệu**: PostgreSQL 16 (cài đặt trực tiếp hoặc chạy qua Docker).

---

## 2. Cài đặt Phụ thuộc

Dự án duy trì hai thư mục độc lập `backend/` và `frontend/`:

```bash
# Cài đặt phụ thuộc cho Backend
cd backend
pnpm install

# Cài đặt phụ thuộc cho Frontend
cd ../frontend
pnpm install
```

---

## 3. Khởi động Cơ sở Dữ liệu Phát triển

Chỉ chạy Docker cho dịch vụ cơ sở dữ liệu đã được phê duyệt:

```bash
# Từ thư mục gốc dự án:
docker compose up -d postgres
```

Kiểm tra trạng thái sẵn sàng:

```bash
docker compose ps
```

---

## 4. Khởi tạo Cấu hình Môi trường

Tạo file cấu hình `.env` cho Backend (không bao giờ commit file `.env` vào git):

```bash
cd backend
cp .env.example .env
```

Các biến môi trường chuẩn cho môi trường dev:

```dotenv
NODE_ENV=development
PORT=3000

# Kết nối PostgreSQL dev
PGHOST=localhost
PGPORT=5432
PGDATABASE=erp_sales_crm_dev
PGUSER=postgres
PGPASSWORD=postgres_dev_password
PGSSL=false

# Cấu hình Token & Bảo mật
JWT_SECRET=your_jwt_secret_min_32_characters_long_for_dev
JWT_EXPIRES_IN=8h

# CORS
CORS_ORIGIN=http://localhost:5173

# Chính sách nghiệp vụ (Cấu hình linh hoạt)
TAX_RATE=0
CREDIT_LIMIT_MODE=warning
```

---

## 5. Nạp Schema và Dữ liệu Seed Mẫu (Chỉ dành cho Dev / Test)

> ⚠️ **CẢNH BÁO QUAN TRỌNG:**
> Lệnh seed chỉ được phép thực hiện trên cơ sở dữ liệu phát triển (disposable dev DB) hoặc test DB. **TUYỆT ĐỐI KHÔNG CHẠY TRÊN MÔI TRƯỜNG PRODUCTION**.

Thực hiện nạp schema và seed dữ liệu mẫu qua `psql` (xem chi tiết tại `docs/database/seed-checklist.md`):

```bash
# Nạp DDL cấu trúc bảng
psql -h localhost -p 5432 -U postgres -d erp_sales_crm_dev -f backend/database/schema.sql

# Nạp dữ liệu mẫu ban đầu (phục vụ kiểm thử liên kết chứng từ)
psql -h localhost -p 5432 -U postgres -d erp_sales_crm_dev -f backend/database/seed_updated.sql
```

---

## 6. Chạy Kiểm thử và Kiểm tra Kiểu dữ liệu

```bash
# Backend: Kiểm tra kiểu và chạy toàn bộ unit/integration tests
cd backend
pnpm typecheck
pnpm test

# Frontend: Kiểm tra kiểu và build bản dựng sản xuất
cd ../frontend
pnpm typecheck
pnpm build
```

---

## 7. Khởi động Ứng dụng ở Chế độ Phát triển

Mở hai cửa sổ dòng lệnh riêng biệt:

```bash
# Terminal 1: Backend API Server (chạy tại http://localhost:3000)
cd backend
pnpm dev

# Terminal 2: Frontend Vite Dev Server (chạy tại http://localhost:5173)
cd frontend
pnpm dev
```

---

## 8. Kiểm tra Trạng thái Sức khỏe Hệ thống (Health Check)

Sau khi Backend khởi động, kiểm tra endpoint sức khỏe:

```bash
curl http://localhost:3000/api/v1/health
```

Kết quả phản hồi chuẩn khi cơ sở dữ liệu kết nối thành công:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-11T12:00:00.000Z",
    "uptime": 15.42,
    "database": {
      "healthy": true,
      "latencyMs": 4
    }
  },
  "message": "Service operational",
  "meta": null
}
```
