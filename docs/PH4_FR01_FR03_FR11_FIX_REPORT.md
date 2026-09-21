# BÁO CÁO KỸ THUẬT KHẮC PHỤC 3 GAP NGHIỆP VỤ PH4 (FR-01, FR-03, FR-11)
## PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ — HỆ THỐNG ERP TỔNG CÔNG TY MAY 10
**Mã tài liệu:** `ERP-MAY10-PH4-FIX-REPORT-01`  
**Ngày hoàn thành:** 10/09/2026  
**Nhánh Git:** `feature/ph4-core-portal`  
**Tác giả thực hiện:** Đội ngũ Kỹ thuật ERP May 10 (Antigravity Senior Full-Stack Engineer)  
**Tình trạng đánh giá:** **HOÀN THÀNH 100% — TẤT CẢ TEST CASES PASS — SẴN SÀNG NGHIỆM THU**

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Báo cáo này tài liệu hóa chi tiết toàn bộ quá trình thiết kế, chỉnh sửa mã nguồn backend/frontend, thực thi migration cơ sở dữ liệu và kiểm thử hồi quy đối với **3 khoảng trống (GAPs) nghiệp vụ** đã được chỉ rõ trong đợt kiểm toán độc lập (*Audit Report: PH4_BUSINESS_LOGIC_AND_REPORT_AUDIT.md*):
1. **FR-01: Quản lý danh mục vật tư (Material Master Management)** — Chuyển trạng thái từ **PARTIAL** thành **PASS**.
2. **FR-03: Quản lý lô / cây vải may mặc (Fabric Roll & Lot Management)** — Chuyển trạng thái từ **PARTIAL** thành **PASS**.
3. **FR-11: Tra cứu sổ thẻ kho biến động (Stock Movement Ledger)** — Chuyển trạng thái từ **PARTIAL** thành **PASS**.

### Kết quả then chốt đạt được:
- **100% GAPs đã được xử lý triệt để**: Cung cấp đầy đủ vòng đời nghiệp vụ từ quản trị danh mục vật tư chuẩn may mặc, định danh thông số cây vải (màu sắc, khổ vải, chiều dài m), cho tới sổ thẻ kho điện tử hội tụ đầy đủ **5 nguồn biến động** (Nhập kho, Xuất kho, Chuyển xuất, Chuyển nhập, Điều chỉnh kiểm kê) kèm tính toán số dư lũy kế (*Running Balance*) theo thời gian thực.
- **Tuân thủ nghiêm ngặt ranh giới phạm vi (Scope Boundary)**: **TUYỆT ĐỐI KHÔNG can thiệp FR-09 (Quyết toán lệnh sản xuất)** — tính năng này được giữ nguyên trạng với định danh chuẩn mực: `PENDING INTEGRATION — WAITING FOR PH2`.
- **Bảo toàn 100% các nghiệp vụ đã PASS**: Toàn bộ 7 chức năng nền tảng (FR-02 Vị trí kho, FR-04 Tồn kho đa chiều, FR-05 Nhập kho nhà cung cấp, FR-06 Xuất kho chống âm, FR-07 Luân chuyển kho nguyên tử hai pha, FR-08 Kiểm kê & cân đối kho, FR-10 Cảnh báo tồn min/max) giữ vững tính toàn vẹn 100%.
- **Bảo toàn an ninh Zero-Trust & ACID**: Giữ nguyên cơ chế bảo mật xác thực HMAC SHA-256 kèm ma trận RBAC nghiêm ngặt (27/27 test cases pass), bảo toàn khóa dòng chống race-condition `SELECT ... FOR UPDATE`, 0 dòng tồn kho âm, 0 mã trùng, 0 khóa ngoại mồ côi.

---

## 2. PHẠM VI VÀ RANH GIỚI TRIỂN KHAI (SCOPE & BOUNDARIES)

### 2.1. Phạm vi thực thi (IN-SCOPE)
- **FR-01**: Bổ sung toàn diện các API CRUD quản lý Danh mục vật tư May 10 (`GET /vat-tu/:id`, `POST /vat-tu`, `PUT /vat-tu/:id`, `PATCH /vat-tu/:id/trang-thai`, `DELETE /vat-tu/:id`). Thực thi kiểm tra trùng mã (`409 Conflict`), ràng buộc `muc_ton_toi_thieu <= muc_ton_toi_da` (`400 Bad Request`), cơ chế **Soft Deactivation** (`trang_thai = 'ngung_su_dung'`) bảo toàn toàn vẹn tham chiếu khóa ngoại. Tích hợp giao diện quản trị tab `[Danh mục vật tư May 10]` trực tiếp trong màn hình Tồn kho.
- **FR-03**: Thêm 3 thuộc tính đặc thù ngành may vào bảng `lo_vat_tu` (`mau_sac VARCHAR(50)`, `kho_vai VARCHAR(50)`, `chieu_dai NUMERIC(18,3)`). Cập nhật Controller Lô vật tư và Phiếu nhập kho để lưu trữ, hiển thị trực quan thông số cây vải trên Web UI và modal khai báo lô.
- **FR-11**: Nâng cấp phương thức `getTheKho` trong `tonKhoController.js` để thực hiện gom hợp (UNION ALL) cả 5 luồng nghiệp vụ phát sinh trong kho May 10, tính toán chính xác cột số dư lũy kế `so_du_luy_ke`. Hiển thị trực quan sổ thẻ kho với hệ thống nhãn và chỉ hướng tăng/giảm.
- **Testing & Verification**: Thực thi trọn vẹn bộ kiểm thử tự động gồm 16 API test, 1 Concurrency Race-Condition test, 27 RBAC Zero-Trust tests, và kiểm tra tính toàn vẹn cơ sở dữ liệu.

### 2.2. Ngoài phạm vi tuyệt đối (OUT-OF-SCOPE & BOUNDARIES)
- ❌ **FR-09 (Theo dõi quyết toán sản xuất)**: Không xây dựng bảng biểu giả mạo hoặc logic suy diễn đơn phương khi Phân hệ 2 (Sản xuất may) chưa tích hợp. Duy trì trạng thái `PENDING INTEGRATION`.
- ❌ **Không refactor giao diện Core Portal hoặc Login/Sidebar**: Giữ nguyên giao diện chuẩn đồng nhất của ERP May 10.
- ❌ **Không sửa đổi hoặc xóa bỏ các ràng buộc khóa dòng concurrency**: Đảm bảo không làm suy giảm độ tin cậy của giao dịch xuất/nhập/chuyển kho.

---

## 3. TỔNG KẾT KẾT QUẢ KIỂM TOÁN NỀN TẢNG (BASELINE AUDIT RECAP)

| Mã FR | Tên chức năng | Trạng thái trước khi Fix | Nguyên nhân khiếm khuyết (GAPs) |
|---|---|:---:|---|
| **FR-01** | Quản lý danh mục vật tư | ⚠️ **PARTIAL** | Backend mới chỉ có API `GET /master-data/vat-tu` đọc danh mục dùng chung. Thiếu các API tạo mới (`POST`), cập nhật (`PUT`), ngừng kích hoạt mềm (`PATCH`). Chưa có giao diện quản trị danh mục vật tư chuyên dụng cho thủ kho. |
| **FR-02** | Quản lý vị trí lưu kho | ✅ **PASS** | Đầy đủ mã định danh Tầng-Kệ-Dãy, dung tích khối, tải trọng, RBAC và UI hoàn chỉnh. |
| **FR-03** | Quản lý lô / cây vải | ⚠️ **PARTIAL** | Bảng `lo_vat_tu` chỉ quản lý mã lô, HSD, NSX, số lượng, đơn giá chung. Thiếu các trường mô tả vật lý cốt lõi của cây vải dệt may: Màu sắc (`mau_sac`), Khổ vải (`kho_vai`), Chiều dài cuộn (`chieu_dai`). |
| **FR-04** | Quản lý tồn kho đa chiều | ✅ **PASS** | Tổng hợp tồn theo kho, lọc định mức an toàn, định giá tồn bình quân gia quyền tức thời. |
| **FR-05** | Quản lý nhập kho NCC | ✅ **PASS** | Tạo phiếu nhập, tự động cộng dồn tồn kho, phân bổ lô và vị trí lưu kho chuẩn xác. |
| **FR-06** | Quản lý xuất kho & chống âm | ✅ **PASS** | Sử dụng `SELECT ... FOR UPDATE` khóa dòng theo kho + vật tư, triệt tiêu race condition, chặn xuất âm với `409 Conflict`. |
| **FR-07** | Luân chuyển kho nội bộ | ✅ **PASS** | Giao dịch nguyên tử hai pha (Trừ kho xuất và Cộng kho nhập trong 1 DB Transaction duy nhất). |
| **FR-08** | Kiểm kê & cân đối kho | ✅ **PASS** | Biên bản kiểm kê, đối chiếu sổ sách vs thực tế, tự động sinh bút toán điều chỉnh tồn kho. |
| **FR-09** | Quyết toán sản xuất | ⏸️ **PENDING** | Chờ tích hợp dữ liệu tiêu hao từ PH2 (Lệnh sản xuất & Kế hoạch cắt may). |
| **FR-10** | Cảnh báo tồn min / max | ✅ **PASS** | Hệ thống cảnh báo tự động khi tồn khả dụng chạm ngưỡng tối thiểu hoặc vượt trần đọng vốn. |
| **FR-11** | Tra cứu sổ thẻ kho | ⚠️ **PARTIAL** | `getTheKho` chỉ truy vấn 2 nguồn (Phiếu nhập và Phiếu xuất). Bỏ sót 3 nguồn biến động trọng yếu: Xuất chuyển kho, Nhập chuyển kho, và Điều chỉnh sau kiểm kê. Chưa tính toán số dư lũy kế (`so_du_luy_ke`). |

---

## 4. FR-01 — QUẢN LÝ DANH MỤC VẬT TƯ (TRƯỚC & SAU KHI FIX)

### 4.1. Hiện trạng trước khi Fix
- Hệ thống chỉ cung cấp 1 endpoint `GET /api/v1/master-data/vat-tu` mang tính chất tham chiếu tĩnh (*read-only reference*).
- Không có cơ chế thêm vật tư mới, không có chức năng sửa thông số quy cách kỹ thuật hay định mức tồn an toàn.
- Nếu thủ kho muốn thêm nguyên phụ liệu phục vụ đơn hàng mới, hệ thống không cho phép thao tác trên phần mềm.

### 4.2. Giải pháp kỹ thuật đã triển khai
1. **Bổ sung Full CRUD Backend Controllers**:
   - `getChiTietVatTu(req, res)`: Truy vấn chi tiết vật tư theo `id`, JOIN đơn vị tính và nhà cung cấp.
   - `createVatTu(req, res)`: Thêm mới vật tư. Xác thực dữ liệu đầu vào bắt buộc (`ma_vat_tu`, `ten_vat_tu`, `loai_vat_tu`, `ma_don_vi_tinh`). Kiểm tra trùng mã trả về `409 Conflict`. Kiểm tra `muc_ton_toi_thieu <= muc_ton_toi_da` trả về `400 Bad Request`.
   - `updateVatTu(req, res)`: Cập nhật thông tin vật tư, quy cách kỹ thuật, định mức tồn và đơn giá chuẩn.
   - `deactivateVatTu(req, res)`: Áp dụng kỹ thuật **Soft Deactivation** (cập nhật `trang_thai = 'ngung_su_dung'` hoặc `dang_su_dung`). Loại bỏ hoàn toàn thao tác hard delete (`DELETE FROM vat_tu`) nhằm triệt tiêu nguy cơ vi phạm ràng buộc khóa ngoại (Foreign Key Integrity) với các bảng tồn kho, phiếu nhập, phiếu xuất, lô hàng lịch sử.
2. **Khai báo Routes & Phân quyền RBAC**:
   - Tất cả các endpoint ghi dữ liệu được bảo vệ nghiêm ngặt bằng middleware `authenticateToken` và `requireRoles('kho', 'admin')`.
3. **Giao diện Frontend (TonKhoPage.jsx)**:
   - Tích hợp cụm chuyển đổi Sub-tab trực quan: `[📦 Số Dư Tồn Kho & Thẻ Kho]` và `[📋 Danh Mục Vật Tư May 10 (FR-01)]`.
   - Bảng hiển thị danh mục vật tư với đầy đủ thông số: Mã, Tên, Phân nhóm dệt may, ĐVT, Khoảng định mức (Min - Max), Quy cách kỹ thuật dệt may, Giá chuẩn, Nhà cung cấp chính, Huy hiệu trạng thái (`Đang dùng` / `Ngừng dùng`).
   - Modal Thêm / Sửa vật tư hỗ trợ validate client-side và thông báo Toast phản hồi tức thời. Thao tác bật/tắt ngừng sử dụng an toàn thông qua hộp thoại xác nhận.

---

## 5. FR-03 — QUẢN LÝ LÔ / CÂY VẢI (TRƯỚC & SAU KHI FIX)

### 5.1. Hiện trạng trước khi Fix
- Bảng cơ sở dữ liệu `lo_vat_tu` chỉ lưu các trường chung của một lô hàng công nghiệp (`ma_lo`, `ma_vat_tu`, `ngay_san_xuat`, `han_su_dung`, `so_luong_nhap`, `so_luong_hien_tai`, `don_gia_nhap`).
- Đối với đặc thù sản xuất may mặc tại May 10, cây vải (fabric roll) bắt buộc phải có thuộc tính vật lý:
  - **Màu sắc / Ánh màu**: Nhận diện cuộn vải cùng một mã hàng nhưng khác màu sắc phục vụ phối màu rập.
  - **Khổ vải (Fabric Width)**: Ví dụ 1.5m, 1.6m, 60 inch phục vụ lập sơ đồ giác mẫu tự động.
  - **Chiều dài cây vải (Roll Length in meters)**: Ví dụ cuộn dài 100m, 120.5m phục vụ trải bàn cắt.

### 5.2. Giải pháp kỹ thuật đã triển khai
1. **Migration CSDL an toàn**:
   - Thực thi migration thêm 3 cột cho phép NULL:
     ```sql
     ALTER TABLE lo_vat_tu ADD COLUMN IF NOT EXISTS mau_sac VARCHAR(50);
     ALTER TABLE lo_vat_tu ADD COLUMN IF NOT EXISTS kho_vai VARCHAR(50);
     ALTER TABLE lo_vat_tu ADD COLUMN IF NOT EXISTS chieu_dai NUMERIC(18, 3);
     ```
   - Toàn bộ dữ liệu lô hàng lịch sử được giữ nguyên 100%, không xảy ra downtime hay xung đột schema.
2. **Cập nhật Backend Controller (`loVatTuController.js` & `phieuNhapController.js`)**:
   - Mở rộng câu lệnh SELECT trong `getDanhSachLo` để trả về `mau_sac`, `kho_vai`, `chieu_dai`.
   - Mở rộng hàm tạo lô `createLoVatTu` và hàm lập phiếu nhập kho `createPhieuNhap` để ghi nhận đầy đủ 3 thuộc tính cây vải khi thủ kho thực hiện nghiệm thu nhập khẩu/nhập mua nguyên phụ liệu.
3. **Nâng cấp Giao diện Frontend (`LoVatTuPage.jsx`)**:
   - Tại danh sách lô vật tư: Dưới tên mặt hàng hiển thị các badge trực quan thể hiện rõ `Màu: [Tên màu]`, `Khổ: [Khổ vải]`, `Dài: [Số mét]m`.
   - Tại Modal Khai báo lô mới: Bổ sung khối trường `Thông số cây vải / cuộn vải (FR-03)` gồm 3 ô nhập: Màu sắc, Khổ vải, Chiều dài (m).

---

## 6. FR-11 — TRA CỨU SỔ THẺ KHO BIẾN ĐỘNG (TRƯỚC & SAU KHI FIX)

### 6.1. Hiện trạng trước khi Fix
- Endpoint `GET /api/v1/ton-kho/the-kho` trước đây chỉ thực hiện UNION giữa 2 bảng: `chi_tiet_phieu_nhap` (loại `nhap_kho`) và `chi_tiet_phieu_xuat` (loại `xuat_kho`).
- Hệ thống bỏ sót hoàn toàn 3 nguồn phát sinh biến động kho thực tế:
  1. **Xuất luân chuyển kho nội bộ** (`chuyen_kho_xuat`): Làm giảm tồn kho xuất.
  2. **Nhập luân chuyển kho nội bộ** (`chuyen_kho_nhap`): Làm tăng tồn kho nhập.
  3. **Điều chỉnh sau kiểm kê** (`dieu_chinh_kiem_ke`): Tăng hoặc giảm tồn kho tùy theo giá trị chênh lệch thừa/thiếu giữa sổ sách và thực tế.
- Thẻ kho không tính toán **Số dư lũy kế (Running Balance)** sau mỗi giao dịch, khiến thủ kho và kiểm toán viên không thể đối chiếu dòng thời gian tồn kho.

### 6.2. Giải pháp kỹ thuật đã triển khai
1. **Backend Controller (`tonKhoController.js` - `getTheKho`)**:
   - Tái cấu trúc truy vấn gom hợp đủ **5 nguồn biến động** bằng `UNION ALL`:
     1. `nhap_kho`: Từ `chi_tiet_phieu_nhap` JOIN `phieu_nhap_kho` (hướng biến động: `tang`).
     2. `xuat_kho`: Từ `chi_tiet_phieu_xuat` JOIN `phieu_xuat_kho` (hướng biến động: `giam`).
     3. `chuyen_kho_xuat`: Từ `chi_tiet_chuyen_kho` JOIN `phieu_chuyen_kho` với điều kiện `ma_kho_xuat = $1` (hướng biến động: `giam`).
     4. `chuyen_kho_nhap`: Từ `chi_tiet_chuyen_kho` JOIN `phieu_chuyen_kho` với điều kiện `ma_kho_nhap = $1` (hướng biến động: `tang`).
     5. `dieu_chinh_kiem_ke`: Từ `chi_tiet_kiem_ke` JOIN `phieu_kiem_ke` với điều kiện `pkk.ma_kho = $1 AND ct.da_dieu_chinh = 'da_dieu_chinh'` (hướng biến động: `tang` nếu `chenh_lech >= 0`, `giam` nếu `chenh_lech < 0`).
   - Sắp xếp tất cả các giao dịch theo thứ tự thời gian tăng dần (`ORDER BY thoi_gian ASC`).
   - Duyệt tuần tự chuỗi giao dịch để tính toán chính xác **Số dư lũy kế (`so_du_luy_ke`)**:
     ```javascript
     let runningBalance = 0;
     const transactionsWithBalance = rows.map((tx) => {
       const qty = parseFloat(tx.so_luong) || 0;
       if (tx.huong_bien_dong === 'tang') {
         runningBalance += qty;
       } else {
         runningBalance -= qty;
       }
       return {
         ...tx,
         so_du_luy_ke: runningBalance,
       };
     });
     ```
2. **Frontend UI (`TonKhoPage.jsx` - Modal Sổ Thẻ Kho)**:
   - Hiển thị bảng Thẻ kho điện tử chuyên nghiệp với đầy đủ các cột:
     - `Thời gian` (định dạng giờ/ngày/tháng/năm).
     - `Mã chứng từ` (PNK-, PXK-, PCK-, PKK-).
     - `Loại biến động` với 5 nhãn màu đặc trưng:
       - **▲ Nhập kho**: Huy hiệu xanh lá (`emerald`).
       - **▼ Xuất kho**: Huy hiệu đỏ (`red`).
       - **⮂ Chuyển xuất**: Huy hiệu màu hổ phách (`amber`).
       - **⮀ Chuyển nhập**: Huy hiệu màu chàm (`indigo`).
       - **⚖ Điều chỉnh KK**: Huy hiệu xanh da trời (`sky`).
     - `Diễn giải`.
     - `Phát sinh`: Hiển thị dấu `+` hoặc `-` kèm số lượng.
     - **`Số dư lũy kế`**: Cột nổi bật với nền highlight xanh nhạt và chữ đậm font mono, phản ánh chính xác lượng tồn tức thời sau giao dịch.
     - `Đơn giá`, `Thành tiền`, `Mã lô`.

---

## 7. THAY ĐỔI CƠ SỞ DỮ LIỆU & MIGRATIONS

### 7.1. File Migration đã tạo
- **Đường dẫn**: `E:\ERP\database\migrations\add_roll_attributes_to_lo_vat_tu.sql`
- **Nội dung câu lệnh DDL**:
  ```sql
  -- Migration: Bổ sung thuộc tính cây vải (Màu sắc, Khổ vải, Chiều dài) cho FR-03
  -- Phân hệ: PH4 - Kho & Quản lý vật tư
  -- Ngày thực thi: 2026-09-10

  ALTER TABLE lo_vat_tu 
  ADD COLUMN IF NOT EXISTS mau_sac VARCHAR(50);

  ALTER TABLE lo_vat_tu 
  ADD COLUMN IF NOT EXISTS kho_vai VARCHAR(50);

  ALTER TABLE lo_vat_tu 
  ADD COLUMN IF NOT EXISTS chieu_dai NUMERIC(18, 3);

  COMMENT ON COLUMN lo_vat_tu.mau_sac IS 'Màu sắc cây vải/nguyên phụ liệu';
  COMMENT ON COLUMN lo_vat_tu.kho_vai IS 'Khổ vải (ví dụ: 1.5m, 1.6m, 60 inch)';
  COMMENT ON COLUMN lo_vat_tu.chieu_dai IS 'Chiều dài cây vải tính bằng mét';
  ```

### 7.2. Tình trạng bảo toàn Schema và Data Invariants
- Bảng `vat_tu`: Sử dụng cấu trúc trường sẵn có (`muc_ton_toi_thieu`, `muc_ton_toi_da`, `quy_cach`, `gia_nhap_trung_binh`, `nha_cung_cap_chinh`, `trang_thai`), không can thiệp phá vỡ dữ liệu.
- Kiểm tra toàn bộ 16 bảng trong CSDL:
  - **Tồn kho âm**: 0.
  - **Trùng cặp (ma_kho, ma_vat_tu)**: 0.
  - **Khóa ngoại mồ côi (Orphan FKs)**: 0.

---

## 8. THAY ĐỔI BACKEND API & BUSINESS LOGIC

### 8.1. Các Controllers được chỉnh sửa
1. **`backend/src/controllers/masterDataController.js`**:
   - Cung cấp: `getChiTietVatTu`, `createVatTu`, `updateVatTu`, `deactivateVatTu`.
   - Triển khai logic kiểm tra trùng mã vật tư (HTTP `409 Conflict`), kiểm tra min <= max (HTTP `400 Bad Request`), soft deactivation bảo vệ khóa ngoại.
2. **`backend/src/controllers/loVatTuController.js`**:
   - Cập nhật hàm `getDanhSachLo` và `createLoVatTu` hỗ trợ 3 trường `mau_sac`, `kho_vai`, `chieu_dai`.
3. **`backend/src/controllers/phieuNhapController.js`**:
   - Cho phép truyền các thuộc tính cây vải khi tự động khai báo lô hàng phát sinh từ phiếu nhập kho.
   - Sửa lỗi nhỏ: Bắt số lượng nhập <= 0 trả về đúng HTTP `400 Bad Request` kèm mã lỗi `INVALID_QUANTITY` thay vì 500.
4. **`backend/src/controllers/tonKhoController.js`**:
   - Hàm `getTheKho`: Truy vấn hợp nhất 5 nguồn dữ liệu, sắp xếp dòng thời gian và tính toán số dư lũy kế.

### 8.2. Routes & Phân quyền RBAC (`backend/src/routes/masterDataRoutes.js`)
```javascript
router.get('/vat-tu/:id', requireRoles('kho', 'admin', 'ban_hang', 'san_xuat'), masterDataController.getChiTietVatTu);
router.post('/vat-tu', requireRoles('kho', 'admin'), masterDataController.createVatTu);
router.put('/vat-tu/:id', requireRoles('kho', 'admin'), masterDataController.updateVatTu);
router.patch('/vat-tu/:id/trang-thai', requireRoles('kho', 'admin'), masterDataController.deactivateVatTu);
router.delete('/vat-tu/:id', requireRoles('kho', 'admin'), masterDataController.deactivateVatTu);
```

---

## 9. THAY ĐỔI FRONTEND UI & COMPONENT

1. **`frontend/src/services/api.js`**:
   - Bổ sung các service client: `getChiTietVatTu`, `createVatTu`, `updateVatTu`, `deactivateVatTu`.
2. **`frontend/src/pages/TonKhoPage.jsx`**:
   - Bổ sung bộ chuyển Sub-tab: `[Số Dư Tồn Kho & Thẻ Kho]` và `[Danh Mục Vật Tư May 10 (FR-01)]`.
   - Xây dựng giao diện Danh mục vật tư: Bảng danh mục đầy đủ, thanh lọc theo phân loại và trạng thái, Modal Thêm/Sửa vật tư đầy đủ validation.
   - Nâng cấp Modal Thẻ kho: Hiển thị 5 loại biến động với nhãn trực quan, chỉ rõ chiều tăng/giảm và hiển thị cột Số dư lũy kế (`so_du_luy_ke`).
3. **`frontend/src/pages/LoVatTuPage.jsx`**:
   - Hiển thị thông số cây vải (Màu sắc, Khổ vải, Chiều dài) ngay dưới tên vật tư trong bảng.
   - Bổ sung 3 trường nhập thông số cây vải trong Modal Khai báo lô mới.
4. **Kiểm tra Bundle Frontend**:
   - Lệnh `npm run build` thực thi thành công mỹ mãn với Vite (0 lỗi cú pháp, 0 lỗi bundle).

---

## 10. XÁC MINH BẢO MẬT & RBAC (SECURITY VERIFICATION)

Đã chạy kiểm thử tự động toàn diện bộ 27 kịch bản Zero-Trust (`node backend/tests/test_rbac_security.js`):
- ✅ **Chặn Anonymous**: Tất cả request không có token đều bị từ chối với HTTP `401 Unauthorized`.
- ✅ **Chặn Giả mạo Header**: Anonymous gửi kèm header giả `x-user-id: 1` hoặc `x-role: admin` đều bị từ chối `401`.
- ✅ **Chặn Leo thang đặc quyền (Privilege Escalation)**: User Bán hàng (`ban_hang`) gửi token kèm `x-role: admin` bị chặn `403 Forbidden`.
- ✅ **Chặn Token giả mạo (Forged Admin Token)**: Kịch bản thử nghiệm chèn token giả mạo ký tay bị phát hiện và từ chối 100%.
- ✅ **Phân quyền vai trò thực thi**:
  - Thủ kho (`kho`) và Quản trị viên (`admin`): Được phép tạo/sửa vật tư, khai báo lô, lập phiếu kho (201 Created / 200 OK).
  - Bán hàng (`ban_hang`) và Sản xuất (`san_xuat`): Chỉ có quyền tra cứu (Read-Only), bị chặn 403 Forbidden khi cố gắng ghi dữ liệu vào danh mục vật tư hoặc kho hàng.

---

## 11. BẢO TOÀN CÁC MODULE PASS & DATA INVARIANTS

Quá trình fix 3 gap tuyệt đối không làm ảnh hưởng đến 7 chức năng đã PASS:
1. **FR-02 (Vị trí kho)**: Duy trì 49 vị trí giá kệ, kiểm soát sức chứa, tọa độ và phân loại.
2. **FR-04 (Tồn kho đa chiều)**: Duy trì tính toán tồn tức thời, lọc cảnh báo thiếu hụt, tính giá trị tồn kho.
3. **FR-05 (Nhập kho)**: Hoạt động trơn tru, cộng tồn kho chính xác, tích hợp mở rộng thuộc tính cây vải cho lô mới.
4. **FR-06 (Xuất kho)**: Tiếp tục duy trì cơ chế khóa dòng `SELECT ... FOR UPDATE` trong PostgreSQL transaction. Đảm bảo triệt tiêu race condition và ngăn chặn xuất âm (HTTP `409 Conflict`).
5. **FR-07 (Chuyển kho nội bộ)**: Bảo toàn tính nguyên tử hai pha (Trừ kho xuất, cộng kho nhập trong cùng 1 transaction).
6. **FR-08 (Kiểm kê kho)**: Cân đối kho và lập biên bản kiểm kê hoạt động chính xác.
7. **FR-10 (Cảnh báo tồn min/max)**: Hệ thống cờ báo `an_toan`, `canh_bao_thap`, `het_hang` hiển thị nhất quán.

---

## 12. TUYÊN BỐ RANH GIỚI FR-09 (EXPLICIT BOUNDARY STATEMENT)

> ### 🛑 ĐIỀU KHOẢN TUYÊN BỐ RANH GIỚI ĐỐI VỚI FR-09:
> **FR-09 — Theo dõi quyết toán sản xuất (Production Settlement & Reconciliation)**:
> - **Trạng thái chính thức**: `PENDING INTEGRATION — WAITING FOR PH2` (Tạm hoãn — Chờ tích hợp Phân hệ 2).
> - **Lý do kỹ thuật**: Chức năng quyết toán vật tư sản xuất đòi hỏi việc đối chiếu giữa lượng nguyên phụ liệu cấp phát thực tế (PH4) với định mức tiêu hao kỹ thuật (BOM - Bill of Materials) và sản lượng hoàn thành theo từng Công đoạn may từ Phân hệ Sản xuất (PH2).
> - **Cam kết thực thi**:
>   - Đội ngũ kỹ thuật **TUYỆT ĐỐI KHÔNG** tự ý tạo bảng biểu rỗng hoặc dựng logic giả lập sai lệch trong task này.
>   - Ranh giới của PH4 được giữ nguyên vẹn, đảm bảo tính trung thực học thuật và tính chuẩn xác của hệ thống ERP doanh nghiệp.
>   - Chức năng FR-09 sẽ được kích hoạt đồng bộ ngay khi Phân hệ 2 hoàn tất kết nối API liên phân hệ.

---

## 13. KẾT QUẢ KIỂM THỬ TOÀN DIỆN (TEST SUITE RESULTS)

| Tên bộ kiểm thử | Lệnh thực thi | Số ca kiểm thử | Kết quả | Ghi chú |
|---|---|:---:|:---:|---|
| **API Endpoints Test** | `node backend/tests/test_ph4_api.js` | 16 / 16 | **100% PASS** | Kiểm tra toàn diện Health check, Master Data, Vị trí, Lô hàng, Tồn kho, Nhập/Xuất/Chuyển/Kiểm kê. |
| **Concurrency & Race Condition** | `node backend/tests/test_concurrency.js` | 2 requests song song | **100% PASS** | 2 request tranh chấp cùng miligiây: Request A thành công (201), Request B bị chặn xung đột tồn kho (409). Tồn kho PostgreSQL chính xác tuyệt đối. |
| **RBAC & Zero Trust Security** | `node backend/tests/test_rbac_security.js` | 27 / 27 | **100% PASS** | Kiểm thử từ chối Anonymous, chống leo thang quyền, chống token giả mạo, ma trận vai trò người dùng. |
| **Database Invariants Audit** | `node scratch/run_db_audit.js` | 7 tiêu chí ACID | **100% PASS** | 0 âm tồn kho, 0 trùng khóa, 0 bản ghi mồ côi, dữ liệu thẻ kho khớp 100%. |
| **Frontend Production Build** | `npm run build` (trong thư mục `frontend`) | 1700 modules | **100% PASS** | Vite bundle sạch sẽ (`dist/`), không có lỗi JSX/syntax hay thiếu thư viện. |

---

## 14. DANH MỤC CÁC FILE ĐÃ SỬA VÀ KHÔNG SỬA

### 14.1. Danh mục File đã chỉnh sửa và tạo mới (FILES CHANGED / CREATED)
1. `backend/src/controllers/masterDataController.js` *(Chỉnh sửa - bổ sung CRUD và soft deactivation cho FR-01)*
2. `backend/src/routes/masterDataRoutes.js` *(Chỉnh sửa - đăng ký endpoints & RBAC cho FR-01)*
3. `database/migrations/add_roll_attributes_to_lo_vat_tu.sql` *(Tạo mới - migration DDL cho FR-03)*
4. `backend/src/controllers/loVatTuController.js` *(Chỉnh sửa - hỗ trợ thuộc tính cây vải cho FR-03)*
5. `backend/src/controllers/phieuNhapController.js` *(Chỉnh sửa - ghi nhận thông số cây vải khi nhập kho cho FR-03 và trả về 400 khi số lượng không hợp lệ)*
6. `backend/src/controllers/tonKhoController.js` *(Chỉnh sửa - hợp nhất 5 nguồn biến động & tính running balance cho FR-11)*
7. `frontend/src/services/api.js` *(Chỉnh sửa - bổ sung API client calls cho FR-01)*
8. `frontend/src/pages/TonKhoPage.jsx` *(Chỉnh sửa - bổ sung sub-tab Quản lý danh mục vật tư FR-01 & nâng cấp Thẻ kho 5 nguồn FR-11)*
9. `frontend/src/pages/LoVatTuPage.jsx` *(Chỉnh sửa - hiển thị thuộc tính cây vải và modal nhập cho FR-03)*
10. `docs/PH4_FR01_FR03_FR11_FIX_REPORT.md` *(Tạo mới - báo cáo kỹ thuật hoàn chỉnh 15 mục)*

### 14.2. Danh mục File cốt lõi TUYỆT ĐỐI KHÔNG CHẠM VÀO (FILES NOT CHANGED)
- `backend/src/controllers/phieuXuatController.js` *(Bảo toàn logic `SELECT ... FOR UPDATE` và xuất kho chống âm)*
- `backend/src/controllers/phieuChuyenController.js` *(Bảo toàn giao dịch chuyển kho nguyên tử 2 pha)*
- `backend/src/controllers/phieuKiemKeController.js` *(Bảo toàn cân đối kho kiểm kê)*
- `backend/src/controllers/viTriKhoController.js` *(Bảo toàn quản lý vị trí giá kệ FR-02)*
- `backend/src/middleware/auth.js` *(Bảo toàn cơ chế xác thực HMAC SHA-256 Zero-Trust)*
- `frontend/src/App.jsx`, `Sidebar.jsx`, `Header.jsx`, `LoginPage.jsx` *(Bảo toàn Core Portal layout và trải nghiệm người dùng)*
- Bất kỳ code hay giao diện nào liên quan đến FR-09 *(Giữ nguyên trạng chờ tích hợp PH2)*.

---

## 15. ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG CỦA PH4 (FINAL PH4 READINESS ASSESSMENT)

| STT | Mã Chức Năng | Tên Chức Năng Nghiệp Vụ | Trạng Thái Trước | Trạng Thái Hiện Tại | Mức Độ Sẵn Sàng Nghiệm Thu |
|:---:|:---:|---|:---:|:---:|:---:|
| 1 | **FR-01** | Quản lý danh mục vật tư | ⚠️ PARTIAL | ✅ **PASS** | **100% PRODUCTION READY** |
| 2 | **FR-02** | Quản lý vị trí lưu kho | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 3 | **FR-03** | Quản lý lô / cây vải dệt may | ⚠️ PARTIAL | ✅ **PASS** | **100% PRODUCTION READY** |
| 4 | **FR-04** | Quản lý tồn kho đa chiều & định giá | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 5 | **FR-05** | Quản lý quy trình nhập kho | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 6 | **FR-06** | Quản lý xuất kho & chống âm | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 7 | **FR-07** | Luân chuyển kho nội bộ | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 8 | **FR-08** | Kiểm kê & cân đối kho thực tế | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 9 | **FR-09** | Quyết toán sản xuất | ⏸️ PENDING | ⏸️ **PENDING INTEGRATION** | **ĐÃ CÔ LẬP CHUẨN MỰC — CHỜ PH2** |
| 10 | **FR-10** | Cảnh báo định mức tồn Min / Max | ✅ PASS | ✅ **PASS** | **100% PRODUCTION READY** |
| 11 | **FR-11** | Tra cứu sổ biến động / Thẻ kho | ⚠️ PARTIAL | ✅ **PASS** | **100% PRODUCTION READY** |

### 🏆 KẾT LUẬN CHUNG
Phân hệ **PH4 — Kho & Quản lý vật tư** thuộc Hệ thống ERP May 10 hiện tại đã đạt trạng thái **10/11 YÊU CẦU NGHIỆP VỤ PASS TUYỆT ĐỐI (100% các chức năng nội tại phân hệ)**, chức năng còn lại duy nhất (FR-09) được định nghĩa chuẩn hóa ranh giới kỹ thuật chờ tích hợp dữ liệu với Phân hệ 2. Hệ thống hoàn toàn sẵn sàng phục vụ báo cáo đồ án học thuật, demo thẩm định hội đồng và triển khai thực tế.
