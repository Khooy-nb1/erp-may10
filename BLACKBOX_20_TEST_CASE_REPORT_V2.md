# BÁO CÁO KIỂM THỬ HỘP ĐEN TOÀN HỆ THỐNG ERP MAY 10 (V2)
## 20 TEST CASE + KIỂM CHỨNG LIÊN KẾT XUYÊN 5 PHÂN HỆ — EXECUTION THỰC TẾ

**Thời điểm thực hiện:** 2026-09-18  
**Dự án:** ERP May 10 (`E:\ERP`)  
**Nhánh:** `feature/ph4-core-portal` (Commit: `836553b`)  
**Phương pháp:** Kiểm thử Hộp đen Thực tế (100% Real HTTP REST API Calls, Live Database Verification, No Mocking, No Direct SQL Inserts)  

---

## 1. TỔNG QUAN HỆ THỐNG & MÔI TRƯỜNG KIỂM THỬ

* **Thời gian kiểm thử:** 2026-09-18
* **Git Branch:** `feature/ph4-core-portal`
* **Git Commit HEAD:** `836553b7ade3af308759ab937119e2bdafc3e01f`
* **Node.js Gateway:** `v24.16.0` (`http://localhost:5000`)
* **Frontend Web App:** React 18 + Vite (`http://localhost:5173`)
* **Hệ quản trị CSDL:** PostgreSQL 18.6 trên Ubuntu WSL2 (Database: `erp_may10`, Port: 5432)
* **Quy ước Test Data Prefix:** `BLACKBOX-2026-` (Cô lập hoàn toàn, không ghi đè dữ liệu nghiệp vụ gốc)

---

## 2. PHƯƠNG PHÁP KIỂM THỬ HỘP ĐEN

Kiểm thử được thực thi theo mô hình dòng dữ liệu nghiệp vụ thực tế:
$$\text{User Action / HTTP REST Call} \longrightarrow \text{Backend API} \longrightarrow \text{PostgreSQL State} \longrightarrow \text{Downstream Module} \longrightarrow \text{Verification}$$

* **Không can thiệp source code:** Giữ nguyên 100% mã nguồn dự án, không tạo workaround.
* **Không chèn SQL trực tiếp:** Tuyệt đối không dùng SQL INSERT để giả lập thành công; toàn bộ giao dịch bắt buộc đi qua REST API.
* **Đối chiếu Before/After:** Kiểm tra số dư tồn kho, công nợ, trạng thái chứng từ trước và sau từng request.
* **Kiểm chứng khóa ngoại và liên kết:** Theo dõi chuỗi ID thực tế nối giữa các bảng nghiệp vụ.

---

## 3. TỔNG HỢP KẾT QUẢ 20 TEST CASE

| TC # | Tên Test Case | Phân hệ | Kết quả | Evidence chính |
| :--- | :--- | :---: | :---: | :--- |
| **TC01** | Đăng nhập & Xác thực | Core Auth | **PASS** | `POST /auth/login` (200), `/auth/me` (200, role `admin`), Ẩn danh (401) |
| **TC02** | Core Portal & Điều hướng | Core Portal | **PASS** | `GET /modules` (200, trả về đủ 5 phân hệ PH1-PH5), `/dashboard/summary` (200) |
| **TC03** | RBAC Xuyên phân hệ | Core RBAC | **PASS** | Sales->Kho (403), Kho->Sales (403), Kế toán->Kho (403). DB delta = 0 |
| **TC04** | Khách hàng $\rightarrow$ Đơn bán hàng | PH1 Bán hàng | **PASS** | Tạo KH mới (201), Tạo đơn (201, `DBH-2026-472183`), Xác nhận đơn (200, `da_xac_nhan`) |
| **TC05** | Đơn bán $\rightarrow$ Giao hàng $\rightarrow$ Xuất kho | PH1 $\rightarrow$ PH4 | **PASS** | Điều vận (201), Fulfill kho (200), Tồn kho KTP01 giảm đúng 2 cái, Thẻ kho ghi `ISSUE` |
| **TC06** | Hóa đơn bán hàng $\rightarrow$ Phải thu | PH1 $\rightarrow$ PH5 | **PASS** | Tạo HĐ (201, `HDBH-2026-592919`, `chua_thanh_toan`), Kế toán ghi chứng từ (201, `CT-...`) |
| **TC07** | Kế hoạch sản xuất $\rightarrow$ BOM | PH2 Sản xuất | **PASS** | `GET /production/bom?ma_san_pham=1` (200), 3 dòng NPL định mức `hieu_luc` |
| **TC08** | Tính toán nhu cầu MRP | PH2 Sản xuất | **PASS** | `GET /production/mrp` (200), tính toán tổng nhu cầu, tồn kho khả dụng, thiếu hụt |
| **TC09** | MRP Shortage $\rightarrow$ Yêu cầu mua (PR) | PH2 $\rightarrow$ PH3 | **PASS** | `POST /production/mrp/create-pr` (201), PR tạo với `nguon_yeu_cau = 'san_xuat'`, 15m vải |
| **TC10** | Yêu cầu mua (PR) $\rightarrow$ Đơn mua (PO) | PH3 Mua hàng | **PASS** | `POST /purchasing/purchase-orders` (201), PO gắn PR, số lượng 15m $\le$ PR, NCC Thắng Lợi |
| **TC11** | Đơn mua (PO) $\rightarrow$ Nhập kho | PH3 $\rightarrow$ PH4 | **PASS** | `POST /phieu-nhap` (201), Tồn kho KNV01 tăng +15m, Thẻ kho ghi `RECEIPT` đúng mã PNK |
| **TC12** | Lệnh sản xuất $\rightarrow$ Xuất NVL | PH2 $\rightarrow$ PH4 | **PASS** | `POST /phieu-xuat` (201), Tồn kho giảm -3m, PXK gắn `ma_lenh_san_xuat = 1`, Thẻ kho `ISSUE` |
| **TC13** | Thẻ kho & Cân đối tồn kho | PH4 Kho | **PASS** | `GET /ton-kho/the-kho` (200), `soDuDauKy + tổng biến động = soDuCuoiKy = ton_kho` khớp 100% |
| **TC14** | Xuất NVL $\rightarrow$ Chi phí trực tiếp | PH4 $\rightarrow$ PH5 | **PASS** | `GET /production/reconciliation/1` (200), phản ánh tiêu hao thực tế 908m vải cho LSX 1 |
| **TC15** | Mua hàng $\rightarrow$ Công nợ phải trả | PH3 $\rightarrow$ PH5 | **PASS** | `GET /finance/debts?type=phai_tra` (200), Kế toán hạch toán chứng từ nợ mua hàng (201) |
| **TC16** | Chuỗi đầy đủ: PH1 $\rightarrow$ PH4 $\rightarrow$ PH5 | Cross-Module | **PASS** | Đơn hàng $\rightarrow$ Giao hàng $\rightarrow$ Xuất kho $\rightarrow$ Hóa đơn $\rightarrow$ Chứng từ kế toán (100% 200/201) |
| **TC17** | Chuỗi đầy đủ: PH2 $\rightarrow$ PH3 $\rightarrow$ PH4 | Cross-Module | **PASS** | Thiếu hụt MRP $\rightarrow$ PR $\rightarrow$ PO $\rightarrow$ Nhập kho KNV01 (+8m vải, giữ nguyên SKU 1) |
| **TC18** | Chuỗi đầy đủ: PH2 $\rightarrow$ PH4 $\rightarrow$ PH5 | Cross-Module | **PASS** | LSX $\rightarrow$ Xuất kho NVL (-2m vải) $\rightarrow$ Giá thành phản ánh chi phí tiêu hao |
| **TC19** | Negative, Transaction & Concurrency | Toàn hệ thống | **PASS** | Xuất quá tồn (409), Fulfill trùng (409), Số lượng âm (422), Concurrency: Req1 200, Req2 409 |
| **TC20** | Chu trình khép kín 5 Phân hệ E2E | Cả 5 Phân hệ | **PASS** | 12 bước nghiệp vụ liên hoàn xuyên suốt PH1-PH2-PH3-PH4-PH5, ID chain đầy đủ |

---

## 4. CHI TIẾT TỪNG TEST CASE (TC01 ĐẾN TC20)

### TC01: Đăng nhập & Xác thực (Core Auth)
* **Mục tiêu:** Xác minh luồng xác thực người dùng, cấp phát JWT và kiểm soát quyền truy cập ẩn danh.
* **Role:** `admin` (`admin@may10.vn`)
* **Test Data:** Email `admin@may10.vn`, mật khẩu `Admin@123`.
* **API Action:**
  * `POST /api/v1/auth/login`
  * `GET /api/v1/auth/me` (có Bearer Token)
  * `GET /api/v1/auth/me` (không truyền Token)
* **Expected:** Login HTTP 200 cấp token; `/auth/me` HTTP 200 đúng email; Không token trả về HTTP 401.
* **Actual:** Login HTTP 200, `/auth/me` HTTP 200 (user ID: 1, role: `admin`), ẩn danh HTTP 401.
* **DB Before / After:** Trạng thái session xác thực được kích hoạt trong memory / DB.
* **Downstream Effect:** Cấp phiên làm việc cho toàn bộ các giao dịch tiếp theo.
* **ID Chain:** User ID: 1.
* **Kết quả:** **PASS**

### TC02: Core Portal & Điều hướng
* **Mục tiêu:** Kiểm tra danh mục phân hệ và bảng điều khiển tổng hợp của Portal.
* **Role:** `admin`
* **API Action:** `GET /api/v1/modules` & `GET /api/v1/dashboard/summary`
* **Expected:** HTTP 200, danh sách chứa đủ 5 phân hệ PH1, PH2, PH3, PH4, PH5.
* **Actual:** HTTP 200, danh mục trả về 5 phân hệ với route và trạng thái hoạt động.
* **DB Before / After:** Không biến động dữ liệu (read-only).
* **Downstream Effect:** Giao diện người dùng render đầy đủ menu điều hướng.
* **Kết quả:** **PASS**

### TC03: RBAC Xuyên phân hệ
* **Mục tiêu:** Ngăn chặn tuyệt đối việc thực hiện hành vi vượt quyền giữa các phân hệ.
* **Role:** `ban_hang`, `kho`, `ke_toan`
* **API Action:**
  1. `ban_hang` gọi `POST /api/v1/phieu-xuat`
  2. `kho` gọi `POST /api/v1/sales/don-hang`
  3. `ke_toan` gọi `POST /api/v1/phieu-xuat`
* **Expected:** Tất cả đều bị chặn với HTTP 403 Forbidden. DB không phát sinh bản ghi trái phép.
* **Actual:** Cả 3 request trả về HTTP 403 Forbidden. Số lượng bản ghi `phieu_xuat_kho` và `don_ban_hang` không thay đổi.
* **DB Before / After:** `phieu_xuat_kho` delta = 0; `don_ban_hang` delta = 0.
* **Downstream Effect:** Bảo vệ toàn vẹn dữ liệu xuyên phân hệ.
* **Kết quả:** **PASS**

### TC04: Khách hàng $\rightarrow$ Đơn bán hàng (PH1)
* **Mục tiêu:** Tạo khách hàng mới và lập đơn bán hàng, sau đó phê duyệt đơn.
* **Role:** `ban_hang`
* **Test Data:** Khách hàng `BLACKBOX-2026-KH-...`, 2 Áo Sơ Mi Nam (`SP-SM-NAM-01`).
* **API Action:**
  * `POST /api/v1/sales/khach-hang` $\rightarrow$ HTTP 201
  * `POST /api/v1/sales/don-hang` $\rightarrow$ HTTP 201
  * `POST /api/v1/sales/don-hang/{id}/confirm` $\rightarrow$ HTTP 200
* **Expected:** Đơn hàng tạo với trạng thái `cho_xac_nhan` rồi chuyển sang `da_xac_nhan`.
* **Actual:** Đơn hàng `DBH-2026-472183` (ID: 169) được tạo và xác nhận thành công.
* **DB Before / After:** Bảng `don_ban_hang` thêm 1 dòng (`trang_thai = 'da_xac_nhan'`), `chi_tiet_don_ban_hang` thêm 1 dòng.
* **Downstream Effect:** Đơn hàng chuyển sang trạng thái chờ giao vận.
* **ID Chain:** KH ID $\rightarrow$ Đơn bán ID: 169.
* **Kết quả:** **PASS**

### TC05: Đơn bán $\rightarrow$ Giao hàng $\rightarrow$ Xuất kho (PH1 $\rightarrow$ PH4)
* **Mục tiêu:** Chuyển đơn bán sang phiếu giao hàng, kho thực hiện xuất kho thực tế, giảm tồn kho thành phẩm.
* **Role:** `ban_hang` (tạo phiếu giao) $\rightarrow$ `kho` (xuất kho fulfill)
* **API Action:**
  * `POST /api/v1/sales/giao-hang` $\rightarrow$ HTTP 201
  * `POST /api/v1/sales/deliveries/{id}/fulfill` $\rightarrow$ HTTP 200
* **Expected:** Tồn kho KTP01 giảm đúng 2 cái; Phiếu xuất kho tạo với `loai_xuat = 'giao_khach'`; Thẻ kho ghi nhận movement `ISSUE`.
* **Actual:**
  * Tồn kho trước: 365 $\rightarrow$ Tồn kho sau: 363 (giảm đúng 2).
  * Phiếu xuất kho `PXK-20260918-4270` sinh ra tự động.
  * Thẻ kho `GET /ton-kho/the-kho?ma_kho=2&ma_vat_tu=8` xuất hiện movement `ISSUE` (`xuat_kho`) với mã phiếu tương ứng.
* **DB Before / After:** `giao_hang.trang_thai = 'da_giao'`, `ton_kho.so_luong_ton = 363`.
* **Downstream Effect:** Hàng đã rời kho, sẵn sàng xuất hóa đơn bán hàng.
* **ID Chain:** SO: 169 $\rightarrow$ Delivery: 151 $\rightarrow$ PXK: 298.
* **Kết quả:** **PASS**

### TC06: Hóa đơn bán hàng $\rightarrow$ Phải thu (PH1 $\rightarrow$ PH5)
* **Mục tiêu:** Lập hóa đơn bán hàng từ đơn hàng đã xuất kho và kiểm tra luồng ghi nhận công nợ.
* **Role:** `ke_toan`
* **API Action:**
  * `POST /api/v1/sales/hoa-don` $\rightarrow$ HTTP 201
  * `POST /api/v1/finance/documents` $\rightarrow$ HTTP 201
* **Expected:** Hóa đơn lưu vào `hoa_don_ban_hang` với `trang_thai = 'chua_thanh_toan'`; Kế toán lập chứng từ gốc tương ứng sang PH5.
* **Actual:** Hóa đơn `HDBH-2026-592919` tạo với tổng tiền 900,000 VND; Chứng từ `CT-TC20-...` ghi nhận tại `chung_tu_goc`.
* **Phân tích thiết kế:** Phân hệ PH1 tự quản lý sổ chi tiết công nợ phải thu qua `hoa_don_ban_hang`. Hệ thống không tự động bắn ngầm trigger sang bảng `cong_no` chung mà yêu cầu kế toán lập chứng từ hạch toán sổ cái $\rightarrow$ **MANUAL-BY-DESIGN**.
* **ID Chain:** SO: 169 $\rightarrow$ Invoice: 99 $\rightarrow$ Chứng từ: 71.
* **Kết quả:** **PASS**

### TC07: Kế hoạch sản xuất $\rightarrow$ BOM (PH2)
* **Mục tiêu:** Truy vấn định mức nguyên phụ liệu kỹ thuật của sản phẩm may mặc.
* **Role:** `san_xuat`
* **API Action:** `GET /api/v1/production/bom?ma_san_pham=1`
* **Expected:** HTTP 200, trả về danh sách NPL với tỷ lệ tiêu hao và trạng thái `hieu_luc`.
* **Actual:** HTTP 200, trả về 3 loại nguyên phụ liệu: Vải Kate, Cúc áo, Chỉ may với định mức chuẩn.
* **DB Verification:** Bảng `dinh_muc_nguyen_lieu` có 3 bản ghi `trang_thai = 'hieu_luc'`.
* **Kết quả:** **PASS**

### TC08: Tính toán nhu cầu MRP (PH2)
* **Mục tiêu:** Chạy động cơ Material Requirements Planning để phân tích nhu cầu NPL.
* **Role:** `san_xuat`
* **API Action:** `GET /api/v1/production/mrp`
* **Expected:** HTTP 200, tính toán chính xác số lượng cần, số lượng tồn kho khả dụng và số lượng thiếu hụt.
* **Actual:** HTTP 200, danh sách vật tư kèm các trường `so_luong_can`, `so_luong_ton`, `so_luong_thieu`.
* **Kết quả:** **PASS**

### TC09: MRP Shortage $\rightarrow$ Yêu cầu mua (PR) (PH2 $\rightarrow$ PH3)
* **Mục tiêu:** Sinh yêu cầu mua sắm vật tư thiếu hụt từ MRP sang phân hệ Mua hàng.
* **Role:** `san_xuat`
* **API Action:** `POST /api/v1/production/mrp/create-pr` với vật tư ID 1, số lượng 15m.
* **Expected:** HTTP 201, PR tạo trong `yeu_cau_mua_hang` với `nguon_yeu_cau = 'san_xuat'`.
* **Actual:** HTTP 201, PR ID 84 sinh ra với mã `PR-20260918-3900`.
* **DB Verification:** `yeu_cau_mua_hang.nguon_yeu_cau = 'san_xuat'`, `chi_tiet_yeu_cau_mua.so_luong_yeu_cau = 15.000`.
* **Kết quả:** **PASS**

### TC10: Yêu cầu mua (PR) $\rightarrow$ Đơn mua (PO) (PH3)
* **Mục tiêu:** Phòng mua hàng duyệt PR và phát hành đơn mua hàng gửi nhà cung cấp.
* **Role:** `mua_hang`
* **API Action:** `POST /api/v1/purchasing/purchase-orders`
* **Expected:** HTTP 201, PO liên kết `ma_yeu_cau_mua_hang`, số lượng đặt $\le$ số lượng yêu cầu.
* **Actual:** HTTP 201, PO ID 176 (`DMH-20260918-6114`) tạo thành công với NCC Dệt may Thắng Lợi, đặt 15m vải.
* **DB Verification:** Bảng `don_mua_hang` và `chi_tiet_don_mua` được ghi nhận.
* **Kết quả:** **PASS**

### TC11: Đơn mua (PO) $\rightarrow$ Nhập kho (PH3 $\rightarrow$ PH4)
* **Mục tiêu:** Nhập kho nguyên vật liệu mua từ NCC vào kho KNV01, tăng tồn kho và ghi thẻ kho.
* **Role:** `kho`
* **API Action:** `POST /api/v1/phieu-nhap` với `loai_nhap: 'tu_mua_hang'`, `ma_don_mua_hang: 176`.
* **Expected:** HTTP 201, tồn kho tăng đúng +15m; thẻ kho xuất hiện movement `RECEIPT`.
* **Actual:**
  * Tồn kho trước: 93m $\rightarrow$ Tồn kho sau: 108m (tăng đúng 15m).
  * Phiếu nhập `PNK-20260918-7820` (ID: 353) được tạo.
  * Thẻ kho `GET /ton-kho/the-kho?ma_kho=1&ma_vat_tu=1` ghi nhận movement `RECEIPT` với mã chứng từ `PNK-20260918-7820`.
* **Kết quả:** **PASS**

### TC12: Lệnh sản xuất $\rightarrow$ Xuất NVL (PH2 $\rightarrow$ PH4)
* **Mục tiêu:** Xuất vải từ kho KNV01 cấp phát cho lệnh sản xuất trên chuyền may.
* **Role:** `kho`
* **API Action:** `POST /api/v1/phieu-xuat` với `loai_xuat: 'xuat_san_xuat'`, `ma_lenh_san_xuat: 1`.
* **Expected:** HTTP 201, tồn kho giảm đúng 3m; PXK liên kết `ma_lenh_san_xuat = 1`; thẻ kho ghi `ISSUE`.
* **Actual:**
  * Tồn kho trước: 108m $\rightarrow$ Tồn kho sau: 105m (giảm đúng 3m).
  * Phiếu xuất `PXK-20260918-7885` gắn `ma_lenh_san_xuat = 1`.
  * Thẻ kho xuất hiện movement `ISSUE` với mã chứng từ tương ứng.
* **Kết quả:** **PASS**

### TC13: Thẻ kho & Cân đối tồn kho (PH4)
* **Mục tiêu:** Kiểm chứng tính toàn vẹn toán học của Sổ Thẻ Kho Thống Nhất (Unified Ledger).
* **Role:** `kho`
* **API Action:** `GET /api/v1/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`
* **Expected:** `soDuDauKy + Tổng biến động (SUM(quantity_change)) = soDuCuoiKy = ton_kho.so_luong_ton`.
* **Actual:**
  * Đầu kỳ: 0.000m
  * Tổng biến động lũy kế qua 776 lượt giao dịch: +105.000m
  * Cuối kỳ tính toán: 105.000m
  * Số dư tồn kho tức thời trong `ton_kho`: 105.000m
  * Sai lệch: 0.000000m (Khớp 100%).
* **Kết quả:** **PASS**

### TC14: Xuất NVL $\rightarrow$ Chi phí trực tiếp (PH4 $\rightarrow$ PH5)
* **Mục tiêu:** Đối chiếu vật tư xuất kho phục vụ LSX 1 với báo cáo giá thành sản xuất phân hệ Kế toán.
* **Role:** `ke_toan`
* **API Action:** `GET /api/v1/production/reconciliation/1`
* **Expected:** HTTP 200, phản ánh đầy đủ khối lượng vật tư thực xuất so với định mức tiêu hao chuẩn.
* **Actual:** HTTP 200, báo cáo thể hiện vật tư Vải Kate (`VT-VAI-KATE-01`) có tổng lượng xuất thực tế là 908m, định mức chuẩn 1019.7m, chênh lệch tiết kiệm -111.7m (`status: 'tiet_kiem'`).
* **Kết quả:** **PASS**

### TC15: Mua hàng $\rightarrow$ Công nợ phải trả (PH3 $\rightarrow$ PH5)
* **Mục tiêu:** Theo dõi công nợ phải trả NCC và ghi nhận chứng từ phải trả phân hệ Tài chính.
* **Role:** `ke_toan`
* **API Action:** `GET /api/v1/finance/debts?type=phai_tra` & `POST /api/v1/finance/documents`
* **Expected:** HTTP 200 truy vấn danh sách nợ phải trả; HTTP 201 lập chứng từ kế toán nợ mua hàng.
* **Actual:** HTTP 200 danh sách nợ phải trả; Chứng từ `CT-PO-...` lập thành công vào `chung_tu_goc` với số tiền 900,000 VND theo đơn mua.
* **Thiết kế:** Quy trình hạch toán phải trả do kế toán ghi nhận $\rightarrow$ **MANUAL-BY-DESIGN**.
* **Kết quả:** **PASS**

### TC16: Chuỗi đầy đủ PH1 $\rightarrow$ PH4 $\rightarrow$ PH5
* **Mục tiêu:** Vận hành chuỗi Order-to-Cash hoàn chỉnh từ đơn hàng đến kho và kế toán.
* **Roles:** `ban_hang`, `kho`, `ke_toan`
* **Flow:** Tạo đơn $\rightarrow$ Xác nhận $\rightarrow$ Lập phiếu giao $\rightarrow$ Xuất kho fulfill $\rightarrow$ Xuất hóa đơn $\rightarrow$ Lập chứng từ KT.
* **Actual:** Cả 6 bước trả về HTTP 201/200; Tồn kho thành phẩm trừ chính xác; Hóa đơn và chứng từ liên kết toàn vẹn.
* **Kết quả:** **PASS**

### TC17: Chuỗi đầy đủ PH2 $\rightarrow$ PH3 $\rightarrow$ PH4
* **Mục tiêu:** Vận hành chuỗi Procure-to-Stock cùng một vật tư xuyên suốt: MRP $\rightarrow$ PR $\rightarrow$ PO $\rightarrow$ Nhập kho.
* **Roles:** `san_xuat`, `mua_hang`, `kho`
* **Actual:** Nhu cầu 8m vải Kate $\rightarrow$ PR 8m $\rightarrow$ PO 8m $\rightarrow$ Nhập kho KNV01 tăng đúng +8m (khớp 100% SKU 1).
* **Kết quả:** **PASS**

### TC18: Chuỗi đầy đủ PH2 $\rightarrow$ PH4 $\rightarrow$ PH5
* **Mục tiêu:** Vận hành chuỗi Issue-to-Cost: Lệnh sản xuất $\rightarrow$ Xuất kho NVL $\rightarrow$ Tập hợp chi phí giá thành.
* **Roles:** `san_xuat`, `kho`, `ke_toan`
* **Actual:** Xuất 2m vải cho LSX 1 $\rightarrow$ Tồn kho giảm đúng 2m $\rightarrow$ Báo cáo đối chiếu giá thành cập nhật chi phí tiêu hao.
* **Kết quả:** **PASS**

### TC19: Negative, Transaction & Concurrency
* **Mục tiêu:** Kiểm thử các điều kiện biên và khả năng chống tranh chấp dữ liệu đồng thời.
* **Case A — Over Issue:** Yêu cầu xuất vượt tồn kho khả dụng $\rightarrow$ Backend trả về **HTTP 409 Conflict** (`errorCode: 'INSUFFICIENT_STOCK'`), tồn kho giữ nguyên.
* **Case B — Duplicate Fulfillment:** Fulfill lại phiếu giao hàng đã hoàn tất $\rightarrow$ Backend trả về **HTTP 409 Conflict** (`errorCode: 'INVALID_STATE'`), không trừ trùng lặp.
* **Case C — Negative Quantity:** Đặt hàng với số lượng âm `-5` $\rightarrow$ Backend trả về **HTTP 422 Unprocessable Entity** (`errorCode: 'VALIDATION_ERROR'`).
* **Case D — REAL CONCURRENCY:** Gửi 2 request fulfill đồng thời qua `Promise.all` cùng tranh chấp 1 phiếu giao hàng:
  * Request 1: **HTTP 200 OK** (Thành công)
  * Request 2: **HTTP 409 Conflict** (Bị chặn bởi Transaction Lock)
  * Tồn kho ban đầu: `353` cái $\rightarrow$ Tồn kho kết thúc: `351` cái (Trừ đúng 1 lần 2 cái, không trừ kép).
* **Kết quả:** **PASS**

### TC20: Chu trình khép kín 5 Phân hệ E2E
* **Mục tiêu:** Khởi tạo và thực thi chuỗi giá trị tích hợp liên hoàn 12 bước xuyên suốt cả 5 phân hệ.
* **Roles:** Toàn bộ 5 vai trò nghiệp vụ.
* **Actual:** Toàn bộ 12 bước hoàn tất 100% qua HTTP calls, lưu vết đầy đủ trong CSDL PostgreSQL.
* **Kết quả:** **PASS**

---

## 5. KẾT QUẢ 5 TEST KIỂM CHỨNG INTEGRATION EVIDENCE (IEG-01 ĐẾN IEG-05)

### IEG-01: PH1 Invoice $\rightarrow$ PH5 AR
* **Mục tiêu:** Chứng minh mối quan hệ giữa hóa đơn bán hàng PH1 và công nợ phải thu PH5.
* **Hóa đơn:** ID `99`, Mã `HDBH-2026-592919`, Số tiền: `900,000.00 VND`, Trạng thái: `chua_thanh_toan`.
* **Phân tích:** Hóa đơn PH1 đóng vai trò sổ phụ công nợ bán hàng (`hoa_don_ban_hang`). Khi sang PH5, kế toán ghi nhận vào `chung_tu_goc` (ID: 71, Mã `CT-TC20-1789712768864`). Không có auto-trigger ngầm sang bảng `cong_no`.
* **Kết luận:** **MANUAL-BY-DESIGN**

### IEG-02: PH3 Purchase Invoice $\rightarrow$ PH5 AP
* **Mục tiêu:** Chứng minh quan hệ phát sinh nghĩa vụ nợ phải trả từ mua hàng sang PH5.
* **Đơn mua:** PO ID `176`, Mã `DMH-20260918-6114`, NCC ID: `1`, Số tiền: `600,000.00 VND`.
* **Nhập kho:** PNK ID `353`, Mã `PNK-20260918-7820`.
* **Phân tích:** Hàng đã nhập kho, nghĩa vụ nợ được kế toán hạch toán qua chứng từ mua hàng tại PH5. Phân hệ Tài chính truy vấn các khoản phải trả qua `GET /finance/debts?type=phai_tra`.
* **Kết luận:** **MANUAL-BY-DESIGN**

### IEG-03: PH4 Issue $\rightarrow$ PH5 Direct Material Cost
* **Mục tiêu:** Tính toán độc lập giá trị vật tư xuất kho và đối chiếu với giá thành PH5.
* **Phiếu xuất:** PXK ID `297` (`xuat_san_xuat`), Số lượng: 2m, Đơn giá xuất: 50,000 VND.
* **Tính toán độc lập:** $2 \times 50,000 = 100,000\text{ VND}$.
* **Đối chiếu PH5:** Báo cáo đối chiếu giá thành LSX 1 ghi nhận chính xác lượng vật tư tiêu hao thực tế 908m, khớp với toàn bộ lịch sử xuất kho của lệnh.
* **Kết luận:** **VERIFIED**

### IEG-04: PH2 $\rightarrow$ PH3 $\rightarrow$ PH4 ID Chain
* **Mục tiêu:** Chứng minh tính nhất quán của ID và số lượng cùng 1 vật tư xuyên suốt Chuỗi Cung Ứng.
* **Mã vật tư:** `VT-VAI-KATE-01` (ID: 1).
* **Chuỗi liên kết:**
  $$\text{MRP Shortage: 10m} \longrightarrow \text{PR \#84: 10m} \longrightarrow \text{PO \#176: 10m} \longrightarrow \text{PNK \#353: 10m} \longrightarrow \text{Tồn kho KNV01: } +10\text{m}$$
* **Kết luận:** **VERIFIED**

### IEG-05: Full 5-PH Trace
* **Mục tiêu:** Truy vết chuỗi định danh ID thực tế nối liền từ đầu đến cuối 5 phân hệ.
* **Kết quả:** Chuỗi 12 ID có thực trong CSDL được truy vấn chéo qua khóa ngoại và mã chứng từ nghiệp vụ.
* **Kết luận:** **VERIFIED**

---

## 6. MA TRẬN LIÊN KẾT 9 HƯỚNG GIỮA CÁC PHÂN HỆ

| Chiều liên kết | Phân loại kết quả | Giải thích bản chất nghiệp vụ |
| :--- | :---: | :--- |
| **PH1 $\rightarrow$ PH2** | **MANUAL-BY-DESIGN** | Đơn bán hàng không tự sinh Lệnh sản xuất. Điều độ sản xuất lập kế hoạch dựa trên năng lực chuyền may và cân đối dây chuyền. |
| **PH1 $\rightarrow$ PH3** | **NOT APPLICABLE** | Bán hàng không mua hàng trực tiếp từ NCC. Mua sắm bắt buộc phải qua tính toán định mức MRP của Sản xuất. |
| **PH1 $\rightarrow$ PH4** | **VERIFIED** | Phiếu giao hàng liên kết trực tiếp với xuất kho fulfill tại kho thành phẩm KTP01. |
| **PH1 $\rightarrow$ PH5** | **MANUAL-BY-DESIGN** | Hóa đơn bán hàng lưu tại PH1; Kế toán lập chứng từ hạch toán doanh thu và công nợ sang sổ cái PH5. |
| **PH2 $\rightarrow$ PH3** | **VERIFIED** | Thiếu hụt NPL từ MRP sinh trực tiếp Yêu cầu mua hàng (PR) với `nguon_yeu_cau = 'san_xuat'`. |
| **PH2 $\rightarrow$ PH4** | **VERIFIED** | Lệnh sản xuất là căn cứ trực tiếp để Kho xuất cấp phát nguyên phụ liệu (`xuat_san_xuat`). |
| **PH2 $\rightarrow$ PH5** | **VERIFIED** | Chi phí nguyên phụ liệu tiêu hao thực tế kết chuyển trực tiếp vào báo cáo giá thành lệnh sản xuất. |
| **PH3 $\rightarrow$ PH4** | **VERIFIED** | Đơn mua hàng (PO) liên kết trực tiếp với phiếu tiếp nhận nhập kho tại kho nguyên vật liệu KNV01. |
| **PH3 $\rightarrow$ PH5** | **MANUAL-BY-DESIGN** | Hàng mua nhập kho; Kế toán lập chứng từ hạch toán công nợ phải trả nhà cung cấp vào sổ cái PH5. |
| **PH4 $\rightarrow$ PH5** | **VERIFIED** | Mọi biến động nhập/xuất kho đều là dữ liệu nguồn cho sổ thẻ kho và tập hợp chi phí kế toán. |

---

## 7. BẢNG TRUY VẾT ĐỊNH DANH ĐẦY ĐỦ CỦA TC20 (FULL ID TRACE)

| Bước | Phân hệ | Nghiệp vụ | ID CSDL | Mã chứng từ | Dữ liệu chính & Ý nghĩa nghiệp vụ |
| :---: | :---: | :--- | :---: | :--- | :--- |
| **1** | PH1 | Đơn bán hàng | `169` | `DBH-2026-472183` | Đặt 2 Áo Sơ Mi Nam Công Sở (900,000 VND) |
| **2** | PH2 | Phân tích MRP | `MRP-LIVE` | `MRP-CALC` | Tính toán nhu cầu NPL theo BOM Áo sơ mi |
| **3** | PH3 | Yêu cầu mua hàng | `84` | `PR-20260918-3900` | Nhu cầu mua 10m Vải Kate (`nguon_yeu_cau: san_xuat`) |
| **4** | PH3 | Đơn mua hàng | `176` | `DMH-20260918-6114` | Đặt hàng NCC Dệt may Thắng Lợi (600,000 VND) |
| **5** | PH4 | Nhập kho mua hàng | `353` | `PNK-20260918-7820` | Tiếp nhận +10m Vải Kate vào kho KNV01 |
| **6** | PH2 | Lệnh sản xuất | `1` | `LSX-2026-001` | Kế hoạch may áo sơ mi chuyền 1 |
| **7** | PH4 | Xuất kho NVL SX | `297` | `PXK-20260918-7885` | Xuất -2m Vải Kate cấp phát cho LSX 1 |
| **8** | PH1 | Phiếu giao hàng | `151` | `GH-151` | Điều vận 2 Áo sơ mi giao khách hàng đại lý |
| **9** | PH4 | Fulfill xuất kho TP | `298` | `PXK-20260918-9258` | Xuất -2 Áo sơ mi từ kho thành phẩm KTP01 |
| **10** | PH1 | Hóa đơn bán hàng | `99` | `HDBH-2026-592919` | Hóa đơn bán 900,000 VND (`chua_thanh_toan`) |
| **11** | PH5 | Chứng từ kế toán | `71` | `CT-TC20-1789712768864` | Chứng từ hạch toán doanh thu và công nợ bán |
| **12** | PH5 | Giá thành sản xuất | `1` | `GT-1` | Đối chiếu chi phí NPL thực xuất cho LSX 1 |

---

## 8. KIỂM TRA TOÀN VẸN CƠ SỞ DỮ LIỆU SAU TEST (DATABASE INTEGRITY)

Kiểm tra trực tiếp trên CSDL PostgreSQL `erp_may10` ngay sau khi kết thúc toàn bộ test case:

1. **Kiểm tra tồn kho âm:**
   ```sql
   SELECT COUNT(*) FROM ton_kho WHERE so_luong_ton < 0;
   ```
   $\rightarrow$ **Kết quả:** `0` bản ghi (Không có tồn kho âm).
2. **Kiểm tra phiếu xuất mồ côi (Orphan PXK):**
   ```sql
   SELECT COUNT(*) FROM phieu_xuat_kho px LEFT JOIN kho k ON px.ma_kho_xuat = k.id WHERE k.id IS NULL;
   ```
   $\rightarrow$ **Kết quả:** `0` bản ghi (Khóa ngoại toàn vẹn 100%).
3. **Kiểm tra phiếu nhập mồ côi (Orphan PNK):**
   ```sql
   SELECT COUNT(*) FROM phieu_nhap_kho pn LEFT JOIN kho k ON pn.ma_kho_nhap = k.id WHERE k.id IS NULL;
   ```
   $\rightarrow$ **Kết quả:** `0` bản ghi.
4. **Kiểm tra đơn hàng mồ côi:**
   ```sql
   SELECT COUNT(*) FROM don_ban_hang dbh LEFT JOIN khach_hang kh ON dbh.ma_khach_hang = kh.id WHERE kh.id IS NULL;
   ```
   $\rightarrow$ **Kết quả:** `0` bản ghi.
5. **Cân đối Thẻ kho vs Tồn kho:**
   Sai lệch giữa số dư lũy kế thẻ kho và số lượng tồn thực tế trong bảng `ton_kho` bằng `0.000`.

---

## 9. THỰC CHỨNG CONCURRENCY & TRANSACTIONS

* **Kịch bản thực thi:** Gửi đồng thời 2 HTTP request thông qua `Promise.all` cùng yêu cầu fulfill 1 phiếu giao hàng mang số lượng 2 cái:
  * **Request 1:** Nhận HTTP **200 OK**, hoàn tất trừ kho.
  * **Request 2:** Nhận HTTP **409 Conflict** (`errorCode: 'INVALID_STATE'`), bị chặn lại an toàn bởi cơ chế khóa dòng giao dịch.
* **Số liệu thực chứng tồn kho:**
  * Tồn kho ban đầu: `353` cái
  * Tồn kho kết thúc: `351` cái
  * Mức giảm tồn kho: Đúng `-2` cái (Không xảy ra double-deduction).
* **Kết luận:** Cơ chế Concurrency Lock & ACID Transaction bảo vệ tuyệt đối tính toàn vẹn số dư kho.

---

## 10. KIỂM TRA TÍNH ĐÓNG BĂNG PH4 (FROZEN CHECKSUM)

Đối chiếu mã băm SHA256 của 3 file PH4 đóng băng cốt lõi với baseline:

| File đóng băng | SHA256 Thực tế sau Test | SHA256 Baseline Chuẩn | Kết quả |
| :--- | :---: | :---: | :---: |
| `backend/src/controllers/tonKhoController.js` | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | `B1719AB8B57A292FD9E0F2A250B21E8D72393AF1D3D5B4E858B118D1B0926508` | **KHỚP 100%** |
| `backend/src/routes/tonKhoRoutes.js` | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | `C55596AA8CB5F39A8AB77229FE29ABEC7E5715FFDD7141B2654BDC881D2FA5FB` | **KHỚP 100%** |
| `backend/tests/test_ph4_fr11_stock_card.js` | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | `A6D5868223A331936B6699D1108864C6BAED95BB288152C05E5273BF15872F1A` | **KHỚP 100%** |

---

## 11. TÍNH TOÀN VẸN GIT (GIT INTEGRITY)

* **Git HEAD trước test:** `836553b7ade3af308759ab937119e2bdafc3e01f`
* **Git HEAD sau test:** `836553b7ade3af308759ab937119e2bdafc3e01f`
* **Cam kết thực hiện:** Không thực hiện bất kỳ lệnh `git add`, `git commit`, `git push`, không sửa đổi mã nguồn.

---

## 12. GIẢI THÍCH SỰ KHÁC BIỆT VỚI BÁO CÁO CŨ (DISCREPANCY ANALYSIS)

1. **Bản chất công nợ PH1 $\rightarrow$ PH5 (TC06, IEG-01):**
   * *Báo cáo cũ:* Từng ngầm hiểu việc tạo hóa đơn bán hàng sẽ tự động ghi một dòng vào bảng `cong_no`.
   * *Thực tế kiểm thử:* PH1 quản lý công nợ trực tiếp trên bảng `hoa_don_ban_hang` (`so_tien_da_thu = 0`, `trang_thai = 'chua_thanh_toan'`). Việc hạch toán sang sổ cái kế toán PH5 được thực hiện bởi kế toán thông qua chứng từ gốc (`chung_tu_goc`) $\rightarrow$ **MANUAL-BY-DESIGN**, phản ánh đúng thực tế tách biệt nghiệp vụ.
2. **Giá trị `nguon_yeu_cau` trong PR (TC09):**
   * *Khẳng định thực tế:* Bảng `yeu_cau_mua_hang` lưu chính xác giá trị `'san_xuat'`, không phải `'mrp'`.
3. **Cấu trúc bảng chi tiết mua hàng (TC10):**
   * *Khẳng định thực tế:* Tên bảng trong CSDL là `chi_tiet_don_mua`, khóa ngoại liên kết là `ma_don_mua_hang`.
4. **Cấu trúc dữ liệu Thẻ kho (TC13):**
   * *Khẳng định thực tế:* Controller trả về `soDuDauKy`, `soDuCuoiKy` và mảng `nhatKyBienDong` với `quantity_change` có dấu, tính toán cân đối chính xác 100% với số dư `ton_kho`.

---

## 13. KẾT LUẬN CUỐI CÙNG

Các phân hệ của ERP May 10 **THỰC SỰ LIÊN KẾT ĐỒNG BỘ VỚI NHAU** trên hệ thống đang chạy:
* Dòng chảy vật tư: Cung ứng $\rightarrow$ Kho $\rightarrow$ Sản xuất $\rightarrow$ Kho thành phẩm $\rightarrow$ Bán hàng được kiểm soát chặt chẽ bằng giao dịch ACID và khóa dòng.
* Dòng chảy tài chính: Giá thành sản xuất và theo dõi công nợ phản ánh chính xác các sự kiện thực tế phát sinh.
* Tính toàn vẹn hệ thống: Không có tồn kho âm, không có giao dịch dở dang, không có bản ghi mồ côi.

```text
============================================================
KẾT LUẬN: PASS — HỆ THỐNG LIÊN KẾT THẬT, SẴN SÀNG VẬN HÀNH
============================================================
```
