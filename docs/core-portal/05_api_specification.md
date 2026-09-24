# QUY CÁCH REST API CỔNG ĐIỀU HÀNH ERP MAY 10
**TỔNG CÔNG TY MAY 10 - CTCP**

---

## 1. Tiêu Chuẩn Thiết Kế API

* **Giao thức:** RESTful JSON qua HTTP
* **Base URL:** `/api/v1`
* **Xác thực & Ngữ cảnh:**
  * Header `x-role`: Vai trò nghiệp vụ hiện hành (ví dụ: `admin`, `kho`, `ban_hang`, ...)
  * Header `x-user-id`: ID người dùng thực hiện giao dịch trong bảng `nguoi_dung`
  * Header `Authorization`: Bearer token của phiên làm việc

---

## 2. Chi Tiết Các Endpoint Cổng Portal

### 2.1. Xác thực & Hồ Sơ

#### `POST /api/v1/auth/login`
* **Mục đích:** Xác thực đăng nhập của cán bộ nhân viên May 10.
* **Request Body:**
  ```json
  {
    "email": "kho@may10.vn",
    "password": "password123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Đăng nhập thành công với vai trò [KHO].",
    "data": {
      "user": {
        "id": 5,
        "ho_ten": "Phạm Văn Kho",
        "email": "kho@may10.vn",
        "vai_tro": "kho",
        "phong_ban": "Bộ Phận Kho Vận"
      },
      "role": "kho",
      "permissions": ["dashboard.view", "warehouse.view", "warehouse.receipt", ...],
      "token": "erp_token_5_1725812..."
    }
  }
  ```

#### `GET /api/v1/auth/me`
* **Mục đích:** Lấy thông tin phiên làm việc hiện tại của tài khoản.

---

### 2.2. Danh Mục Phân Hệ & Phân Quyền

#### `GET /api/v1/modules`
* **Mục đích:** Trả về danh mục 5 phân hệ ERP, trạng thái kết nối, biểu tượng, đường dẫn và quyền hạn yêu cầu.

#### `GET /api/v1/permissions`
* **Mục đích:** Trả về toàn bộ ma trận phân quyền RBAC của các vai trò trong hệ thống.

---

### 2.3. Báo Cáo Điều Hành & Cảnh Báo

#### `GET /api/v1/dashboard/summary`
* **Mục đích:** Trả về chỉ số KPI tổng hợp cho Cổng điều hành:
  * Số liệu tồn kho thực tế từ PH4 (Tổng giá trị, số mặt hàng, cảnh báo tồn thấp, phiếu nhập, phiếu xuất).
  * Số liệu sơ bộ từ các phân hệ chờ kết nối (Số đơn hàng seed PH1, số lệnh SX seed PH2, số đơn mua seed PH3).

#### `GET /api/v1/dashboard/activity`
* **Tham số:** `limit` (Mặc định: 10)
* **Mục đích:** Trả về nhật ký giao dịch chứng từ mới nhất phát sinh từ cơ sở dữ liệu (`phieu_nhap_kho`, `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`).

#### `GET /api/v1/notifications`
* **Mục đích:** Quét tự động bảng `ton_kho` và `vat_tu` để phát hiện các mặt hàng có số lượng tồn kho chạm hoặc thấp hơn mức tồn tối thiểu (`muc_ton_toi_thieu`) để phát cảnh báo tức thời.
