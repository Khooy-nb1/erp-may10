# ĐẶC TẢ API PHÂN HỆ MUA HÀNG (PH3 REST API SPECIFICATION)
**Base Path:** `/api/v1/purchasing`  
**Định dạng dữ liệu:** `application/json`  
**Xác thực:** Bearer JWT Token (`Authorization: Bearer <token>`)  

---

## 1. Chuẩn Hóa Mã Trạng Thái HTTP (HTTP Status Codes)
Phân hệ PH3 tuyệt đối không biến mọi lỗi nghiệp vụ thành HTTP 500 Internal Server Error:
- **`200 OK`**: Yêu cầu thành công, trả về dữ liệu hoặc thông báo.
- **`201 Created`**: Tạo mới thành công tài nguyên (Nhà cung cấp, Đơn mua hàng).
- **`400 Bad Request`**: Dữ liệu đầu vào không hợp lệ (thiếu trường bắt buộc, số lượng âm, đơn giá âm, ngày giao quá khứ).
- **`401 Unauthorized`**: Chưa cung cấp JWT token hoặc token hết hạn/sai chữ ký.
- **`403 Forbidden`**: Người dùng đã đăng nhập nhưng không có vai trò phù hợp (RBAC).
- **`404 Not Found`**: Tài nguyên truy vấn không tồn tại trong hệ thống.
- **`409 Conflict`**: Xung đột nghiệp vụ / tranh chấp đồng thời (duyệt 2 lần, hủy 2 lần, sai bước chuyển trạng thái).

---

## 2. Danh sách Endpoints Chi tiết

### 2.1. Core Homepage KPI Contract
- **Endpoint:** `GET /api/v1/purchasing/core-kpi`
- **Quyền truy cập:** Mọi người dùng đã đăng nhập (`requireAuth`)
- **Mô tả:** Cung cấp số liệu thống kê mua hàng thực tế phục vụ màn hình chính Core Portal.
- **Phản hồi mẫu (200 OK):**
```json
{
  "success": true,
  "data": {
    "tong_don_mua": 12,
    "tong_nha_cung_cap": 8,
    "tong_chi_tieu": 450000000,
    "don_cho_duyet": 3,
    "don_dang_giao": 2,
    "don_da_nhap_kho": 6,
    "ti_le_hoan_thanh": 75.5
  }
}
```

---

### 2.2. Dashboard Mua hàng
- **Endpoint:** `GET /api/v1/purchasing/dashboard`
- **Quyền truy cập:** `mua_hang`, `admin`
- **Mô tả:** Lấy 4 thẻ KPI chính, phân bố trạng thái đơn hàng, đơn cần xử lý gấp và 5 đơn mua gần nhất.
- **Phản hồi mẫu (200 OK):**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "tong_don_mua": 12,
      "tong_chi_tieu": 450000000,
      "cho_duyet": 3,
      "dang_giao": 2,
      "da_nhap_kho": 6,
      "tong_ncc": 8,
      "ncc_hoat_dong": 7
    },
    "urgentPOs": [...],
    "recentPOs": [...]
  }
}
```

---

### 2.3. Quản lý Nhà cung cấp (Suppliers)
- **`GET /api/v1/purchasing/suppliers`**
  - **Quyền:** `mua_hang`, `admin`, `kho`
  - **Query params:** `page`, `limit`, `search`, `trang_thai`
  - **Phản hồi:** Danh sách nhà cung cấp kèm phân trang và thống kê số PO liên kết.

- **`GET /api/v1/purchasing/suppliers/:id`**
  - **Quyền:** `mua_hang`, `admin`
  - **Phản hồi:** Chi tiết 1 nhà cung cấp, lịch sử các đơn mua hàng gần nhất.

- **`POST /api/v1/purchasing/suppliers`**
  - **Quyền:** `mua_hang`, `admin`
  - **Body:**
```json
{
  "ma_nha_cung_cap": "NCC-MAY-01",
  "ten_nha_cung_cap": "Công ty CP Dệt May Hà Nội",
  "ma_so_thue": "0100123456",
  "dia_chi": "Hà Nội",
  "nguoi_lien_he": "Nguyễn Văn A",
  "so_dien_thoai": "0912345678",
  "email": "contact@dethanoi.vn",
  "loai_hang_cung_cap": "Vải cotton, Polyester",
  "han_muc_tin_dung": 1000000000,
  "so_ngay_gia_han": 45,
  "diem_danh_gia": 4.8
}
```
  - **Phản hồi:** `201 Created`

- **`PUT /api/v1/purchasing/suppliers/:id`**
  - **Quyền:** `mua_hang`, `admin`
  - **Phản hồi:** `200 OK`

---

### 2.4. Quản lý Đơn mua hàng (Purchase Orders)
- **`GET /api/v1/purchasing/purchase-orders`**
  - **Quyền:** `mua_hang`, `admin`, `kho`
  - **Query params:** `page`, `limit`, `search`, `trang_thai`, `ma_nha_cung_cap`, `tu_ngay`, `den_ngay`
  - **Phản hồi:** Danh sách đơn mua hàng kèm tổng số mặt hàng, tiến độ nhận hàng (%).

- **`GET /api/v1/purchasing/purchase-orders/:id`**
  - **Quyền:** `mua_hang`, `admin`, `kho`
  - **Phản hồi:** Thông tin đầy đủ đơn mua, thông tin NCC, thông tin người lập/duyệt, mảng `chiTiet` mặt hàng và lịch sử nhận kho.

- **`POST /api/v1/purchasing/purchase-orders`**
  - **Quyền:** `mua_hang`, `admin`
  - **Mô tả:** Tạo đơn mua hàng mới trong transaction, tự động tính VAT 8%.
  - **Body:**
```json
{
  "ma_nha_cung_cap": 1,
  "ngay_giao_hang_yc": "2026-09-25T17:00:00Z",
  "dieu_kien_thanh_toan": "Thanh toán trong vòng 30 ngày sau khi nhận hóa đơn",
  "ghi_chu": "Đơn hàng phục vụ lô áo sơ mi xuất khẩu",
  "chiTiet": [
    { "ma_vat_tu": 1, "so_luong_dat": 500, "don_gia": 65000, "ghi_chu": "Vải trắng" },
    { "ma_vat_tu": 2, "so_luong_dat": 1000, "don_gia": 1200, "ghi_chu": "Cúc nhựa 4 lỗ" }
  ]
}
```
  - **Phản hồi:** `201 Created`

---

### 2.5. Phê duyệt & Hủy Đơn hàng (ACID Concurrency Locking)
- **`POST /api/v1/purchasing/purchase-orders/:id/approve`**
  - **Quyền:** `mua_hang`, `admin`
  - **Cơ chế:** Khóa dòng bi quan `SELECT ... FOR UPDATE` + atomic predicate `WHERE trang_thai = 'cho_duyet'`.
  - **Thành công:** `200 OK`, chuyển sang `da_gui_ncc`.
  - **Trùng lặp:** `409 Conflict` (chặn đứng Double Approval).

- **`POST /api/v1/purchasing/purchase-orders/:id/cancel`**
  - **Quyền:** `mua_hang`, `admin`
  - **Body:** `{ "ly_do_huy": "Khách hàng hủy hợp đồng sản xuất" }`
  - **Cơ chế:** `SELECT ... FOR UPDATE` + atomic predicate `WHERE trang_thai NOT IN ('huy', 'da_nhap_kho')`.
  - **Thành công:** `200 OK`, chuyển sang `huy`.
  - **Trùng lặp / Đã nhập kho:** `409 Conflict` (chặn đứng Double Cancel).

- **`POST /api/v1/purchasing/purchase-orders/:id/status`**
  - **Quyền:** `mua_hang`, `admin`
  - **Body:** `{ "trang_thai_moi": "da_xac_nhan", "ghi_chu": "NCC xác nhận giao đúng hẹn" }`
  - **Kiểm tra:** State machine logic `isValidStatusTransition()`.

---

### 2.6. Quy trình Giao nhận & Tích hợp Kho PH4
- **`GET /api/v1/purchasing/receiving`**
  - **Quyền:** `mua_hang`, `kho`, `admin`
  - **Mô tả:** Trả về danh sách đơn mua ở các trạng thái hợp lệ (`da_gui_ncc`, `da_xac_nhan`, `dang_giao`) còn mặt hàng chưa nhập đủ 100%.

- **`POST /api/v1/purchasing/receive-status-update`**
  - **Quyền:** `mua_hang`, `kho`, `admin`
  - **Body:**
```json
{
  "ma_don_mua_hang": 1,
  "ghi_chu": "Nhập kho đợt 1",
  "chiTiet": [
    { "ma_vat_tu": 1, "so_luong_nhap": 200 }
  ]
}
```
  - **Cơ chế tự động:**
    - Cập nhật lũy kế `so_luong_da_nhap`.
    - Nếu tổng nhận < tổng đặt: PO chuyển sang `dang_giao`.
    - Nếu tổng nhận >= 100% tất cả mặt hàng: PO tự động chuyển sang `da_nhap_kho`.

---

### 2.7. Báo cáo Mua hàng
- **`GET /api/v1/purchasing/reports`**
  - **Quyền:** `mua_hang`, `admin`
  - **Query params:** `tu_ngay`, `den_ngay`, `ma_nha_cung_cap`
  - **Phản hồi:** Cơ cấu chi tiêu theo nhà cung cấp, theo chủng loại vật tư và xu hướng chi tiêu theo tháng.
