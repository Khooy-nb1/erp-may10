# PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ (ERP MAY 10)
## 02. ĐẶC TẢ CHI TIẾT REST API PH4

---

### Base URL: `http://localhost:5000/api/v1`

#### Headers chuẩn:
* `Content-Type: application/json`
* `x-role`: Vai trò người dùng (`kho`, `admin`, `ke_toan`, `san_xuat`)
* `x-user-id`: ID người dùng trong bảng `nguoi_dung`

---

### 1. Master Data Endpoints
* **`GET /master-data/kho`**: Lấy danh sách kho đang hoạt động.
* **`GET /master-data/vat-tu`**: Lấy danh mục vật tư kèm đơn vị tính chuẩn.
* **`GET /master-data/don-vi-tinh`**: Lấy danh sách đơn vị tính (mét, cuộn, cái, kg,...).
* **`GET /master-data/nha-cung-cap`**: Lấy danh sách nhà cung cấp xuất xứ.
* **`GET /master-data/nguoi-dung`**: Lấy danh sách nhân sự thủ kho, quản trị.
* **`GET /master-data/cross-module`**: Lấy danh sách Đơn bán hàng (PH1), Lệnh sản xuất (PH2), Đơn mua hàng (PH3).

---

### 2. Quản lý Vị trí kho (`/vi-tri-kho`)
* **`GET /vi-tri-kho`**: Lấy danh sách vị trí kho. Query params: `ma_kho`, `trang_thai`, `search`.
* **`GET /vi-tri-kho/:id`**: Chi tiết vị trí kho kèm danh sách các lô đang lưu tại đó.
* **`POST /vi-tri-kho`**: Thêm mới vị trí kho. Yêu cầu role: `kho`, `admin`.
  * Request Body: `{ "ma_kho": 1, "ma_vi_tri": "KHO1-KE-A1", "ten_vi_tri": "Giá vải số 1", "khu_vuc": "Khu A", "tang": "1", "suc_chua_toi_da": 500 }`
* **`PUT /vi-tri-kho/:id`**: Cập nhật thông tin vị trí kho.
* **`DELETE /vi-tri-kho/:id`**: Xóa vị trí kho (chặn xóa nếu đang có lô vật tư lưu trữ).

---

### 3. Quản lý Lô vật tư (`/lo-vat-tu`)
* **`GET /lo-vat-tu`**: Lấy danh sách lô vật tư/cây vải kèm tính toán hạn dùng (FEFO/FIFO).
* **`GET /lo-vat-tu/:id`**: Chi tiết lô vật tư.
* **`POST /lo-vat-tu`**: Khai báo lô vật tư mới.
  * Request Body: `{ "ma_lo": "LO-KATE-2026", "ma_vat_tu": 1, "so_luong_nhap": 500, "don_gia_nhap": 45000, "han_su_dung": "2027-12-31" }`
* **`PUT /lo-vat-tu/:id`**: Cập nhật trạng thái lô hoặc đổi vị trí lưu kho.

---

### 4. Tồn kho & Dashboard (`/ton-kho`)
* **`GET /ton-kho`**: Báo cáo tổng hợp tồn kho. Query params: `ma_kho`, `loai_vat_tu`, `duoi_dinh_muc` (true/false), `search`.
* **`GET /ton-kho/the-kho`**: Tra cứu thẻ kho chi tiết theo cặp `(ma_kho, ma_vat_tu)`.
* **`GET /ton-kho/dashboard`**: Lấy các chỉ số KPI, cơ cấu theo kho, top 5 vật tư giá trị cao.

---

### 5. Phiếu Nhập kho (`/phieu-nhap`)
* **`GET /phieu-nhap`**: Danh sách phiếu nhập kho.
* **`GET /phieu-nhap/:id`**: Chi tiết phiếu nhập + danh sách dòng vật tư nhập.
* **`POST /phieu-nhap`**: Lập phiếu nhập kho.
  * Tự động cộng tồn kho (`ton_kho`) và tăng số lượng lô (`lo_vat_tu`) trong PostgreSQL Transaction.
  * Request Body:
    ```json
    {
      "ma_kho_nhap": 1,
      "loai_nhap": "tu_mua_hang",
      "nguoi_giao_hang": "Nhà cung cấp Dệt May",
      "chiTiet": [
        {
          "ma_vat_tu": 1,
          "so_luong_nhap": 100,
          "don_gia_nhap": 45000,
          "ma_vi_tri_kho": 1
        }
      ]
    }
    ```

---

### 6. Phiếu Xuất kho (`/phieu-xuat`)
* **`GET /phieu-xuat`**: Danh sách phiếu xuất kho.
* **`GET /phieu-xuat/:id`**: Chi tiết phiếu xuất.
* **`POST /phieu-xuat`**: Lập phiếu xuất kho.
  * Áp dụng Transaction & Khóa dòng `SELECT ... FOR UPDATE` trên bảng `ton_kho`.
  * Trả về HTTP `201 Created` nếu xuất thành công.
  * Trả về HTTP `409 Conflict` nếu số lượng yêu cầu vượt quá tồn khả dụng.

---

### 7. Phiếu Chuyển kho (`/phieu-chuyen`)
* **`GET /phieu-chuyen`**: Danh sách phiếu chuyển kho.
* **`GET /phieu-chuyen/:id`**: Chi tiết phiếu chuyển kho.
* **`POST /phieu-chuyen`**: Lập phiếu chuyển kho.
  * Ràng buộc: `ma_kho_xuat <> ma_kho_nhap`.
  * Khóa dòng tại cả 2 kho, trừ kho xuất và cộng kho nhập đồng thời.

---

### 8. Phiếu Kiểm kê kho (`/phieu-kiem-ke`)
* **`GET /phieu-kiem-ke`**: Danh sách đợt kiểm kê kho.
* **`GET /phieu-kiem-ke/:id`**: Bảng đối soát sổ sách vs thực tế kiểm đếm.
* **`POST /phieu-kiem-ke`**: Khởi tạo đợt kiểm kê mới.
* **`POST /phieu-kiem-ke/:id/dieu-chinh`**: Tự động cân đối tồn kho: cập nhật tồn sổ sách bằng số thực tế đã kiểm kê.
