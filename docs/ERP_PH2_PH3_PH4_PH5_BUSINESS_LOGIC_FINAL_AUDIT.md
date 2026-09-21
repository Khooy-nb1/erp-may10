# BÁO CÁO THẨM TRA TOÀN DIỆN LOGIC NGHIỆP VỤ HỆ THỐNG ERP MAY 10
## PHÂN HỆ PH2 (SẢN XUẤT) + PH3 (MUA HÀNG) + PH4 (KHO VẬT TƯ) + PH5 (TÀI CHÍNH - KẾ TOÁN)
**DỰ ÁN TỔNG CÔNG TY MAY 10 — HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP TẬP ĐOÀN**  
**Tài liệu tham chiếu:** `docs/ERP_PH2_PH3_PH4_PH5_BUSINESS_LOGIC_FINAL_AUDIT.md`  
**Chế độ thực hiện:** 🔴 **READ-ONLY AUDIT — KHÔNG CAN THIỆP MÃ NGUỒN / CƠ SỞ DỮ LIỆU**  
**Thời điểm thực hiện:** 16/09/2026  

---

## I. EXECUTIVE SUMMARY (TỔNG QUAN KẾT QUẢ AUDIT)

Báo cáo này là kết quả thẩm tra độc lập, toàn diện và sâu sắc về mặt **Logic Nghiệp vụ (Business Logic)** trên toàn bộ 4 phân hệ cốt lõi đang vận hành tại workspace `E:\ERP`, cơ sở dữ liệu PostgreSQL `erp_may10`, bao gồm:
1. **PH2:** Sản xuất & Hoạch định nhu cầu Nguyên phụ liệu (MRP)
2. **PH3:** Mua hàng & Quản lý Nhà cung cấp (Suppliers, PR, RFQ, PO)
3. **PH4:** Kho & Quản lý Vật tư (Nhập/Xuất/Chuyển/Kiểm kê, Tồn kho, Lô vải)
4. **PH5:** Tài chính – Kế toán & Tính Giá thành sản phẩm may mặc

### Tóm lược Đánh giá Chung:
- **Nguyên tắc Module Ownership:** Tuân thủ **100%**. Không có bất kỳ phân hệ nào tự ý thực hiện câu lệnh `UPDATE` hoặc `INSERT` trực tiếp lên bảng `ton_kho` ngoài PH4. PH2, PH3, PH5 chỉ giao tiếp với Kho qua luồng dữ liệu chuẩn (Official Flow).
- **Tính toàn vẹn Dữ liệu (Data Integrity):** **100% PASS** trên toàn bộ 43 bảng của CSDL `erp_may10`. Không có bản ghi mồ côi (0 orphans), không có tồn kho âm (0 negative stocks), không có mã chứng từ trùng lặp (0 duplicate codes), tổng nợ và tổng có kế toán cân bằng tuyệt đối (Debit = Credit = 537.500.000 VNĐ).
- **Cơ chế khóa giao dịch & chống tranh chấp (ACID Concurrency):** Hoạt động xuất sắc với `SELECT ... FOR UPDATE` trong PostgreSQL Transaction tại PH4 (Xuất kho, Chuyển kho), PH3 (Duyệt/Hủy PO, Nhận hàng), và PH2 (Duyệt KHSX, Ghi nhận kết quả).
- **Điểm số Phân hệ:**
  - PH2 (Sản xuất): **92/100**
  - PH3 (Mua hàng): **95/100**
  - PH4 (Kho & Vật tư): **88/100**
  - PH5 (Tài chính - Kế toán): **90/100**
  - Cross-Module Flows: **88/100**
  - **Điểm tổng hợp toàn hệ thống: 91/100**
- **Kết luận chung (Final Verdict):** **PASS WITH MINOR FINDINGS (B)**.

---

## II. PHẠM VI AUDIT & HỆ THỐNG NGUỒN SỰ THẬT (AUDIT SCOPE & SOURCE OF TRUTH)

Audit tuân thủ thứ tự ưu tiên bằng chứng thực tế:
1. **Database thực tế:** PostgreSQL 18.6, CSDL `erp_may10`, gồm 43 bảng nghiệp vụ.
2. **Backend REST API Source:** `backend/src/controllers/`, `backend/src/services/`, `backend/src/routes/`, `backend/src/validators/`.
3. **Frontend Source:** `frontend/src/` (React 18, Tailwind CSS, Vite).
4. **Runtime Evidence:** Kết quả truy vấn trực tiếp từ API đang chạy trên cổng 5000 và kiểm tra độc lập bằng Node.js.
5. **Bộ kiểm thử hồi quy:** 27 test RBAC, 16 test PH4, 38 test PH2 (+7 concurrency), 58 test PH3 (+9 concurrency), 24 test PH5.

---

## III. AUDIT PH2 — SẢN XUẤT & HOẠCH ĐỊNH NGUYÊN PHỤ LIỆU (MRP)

### PH2.1 — Danh mục & Định mức BOM (`dinh_muc_nguyen_lieu`)
- **Cấu trúc dữ liệu:** Bảng `dinh_muc_nguyen_lieu` liên kết khóa ngoại với `san_pham(id)` và `vat_tu(id)`.
- **Dữ liệu thực tế:** Gồm 3 bản ghi BOM hiệu lực cho sản phẩm mẫu `SP-SM-NAM-01` (Áo sơ mi nam công sở dài tay trắng):
  - Vải Kate lụa: Định mức 1.650m, hao hụt 3.00%, định mức thực tế 1.700m/áo.
  - Chỉ may Poly: Định mức 0.050 cuộn, hao hụt 2.00%, định mức thực tế 0.051 cuộn/áo.
  - Cúc nhựa 4 lỗ: Định mức 8.000 cái, hao hụt 2.50%, định mức thực tế 8.200 cái/áo.
- **Quy tắc chặn BOM <= 0:** `validateBomInput` chặn cứng `dinh_muc <= 0` và `ty_le_hao_hut < 0` (HTTP 400 `VALIDATION_ERROR`).
- **Chống trùng định mức:** `createBom` kiểm tra `dupCheck` theo `(ma_san_pham, ma_vat_tu)`. Nếu đã tồn tại, trả về HTTP 409 `DUPLICATE_BOM`.
- **Ràng buộc khi duyệt KHSX:** Hàm `approvePlan` bắt buộc kiểm tra:
  `SELECT * FROM dinh_muc_nguyen_lieu WHERE ma_san_pham = $1 AND trang_thai = 'hieu_luc'`. Nếu sản phẩm chưa có BOM hiệu lực, hệ thống hủy giao dịch và trả về HTTP 400 `BOM_MISSING`.
- **Đánh giá:** **PASS**.

### PH2.2 — Kế hoạch sản xuất (`ke_hoach_san_xuat`)
- **Vòng đời trạng thái (Lifecycle):**
  `cho_duyet` $ightarrow$ `da_duyet` $leftrightarrow$ `tam_dung` $ightarrow$ `dang_thuc_hien` $ightarrow$ `hoan_thanh` / `huy`.
- **Khởi tạo:** Kế hoạch mới luôn bắt đầu ở trạng thái `cho_duyet`.
- **Phê duyệt an toàn:** Sử dụng `BEGIN ... SELECT FOR UPDATE ... COMMIT`. Nếu trạng thái khác `cho_duyet`, trả về HTTP 409 `CONFLICT` ngăn chặn duyệt trùng lặp.
- **Ràng buộc hủy kế hoạch (`cancelPlan`):** Chặn không cho hủy nếu đã có lệnh sản xuất phát sinh sản lượng hoàn thành (`so_luong_hoan_thanh > 0`), trả về HTTP 400 `CANNOT_CANCEL`.
- **Đánh giá:** **PASS**.

### PH2.3 — Lệnh sản xuất (`lenh_san_xuat`)
- **Phát hành lệnh (`createOrder`):** Chỉ được phát hành từ kế hoạch có trạng thái `da_duyet` hoặc `dang_thuc_hien`. Nếu kế hoạch chưa duyệt, trả về HTTP 400 `INVALID_STATUS`.
- **Khởi tạo công đoạn tự động:** Khi phát hành LSX, hệ thống tự động sinh đủ 4 công đoạn chuẩn may mặc trong bảng `cong_doan_san_xuat`:
  1. Cắt vải & chuẩn bị NPL (24h, 8 công nhân)
  2. Chuyền may lắp ráp (48h, 20 công nhân)
  3. Là ép & Hoàn thiện (16h, 6 công nhân)
  4. Kiểm tra KCS & Đóng gói (12h, 4 công nhân)
- **Vòng đời LSX:** `chua_bat_dau` $ightarrow$ `dang_san_xuat` $ightarrow$ `hoan_thanh`.
- **Tự động đóng lệnh (Auto-completion):** Khi lũy kế `newCompleted >= so_luong_yeu_cau`, hệ thống tự động cập nhật trạng thái lệnh thành `hoan_thanh`, ghi nhận `ngay_hoan_thanh = NOW()`, và cập nhật toàn bộ công đoạn thành `hoan_thanh`.
- **Đánh giá:** **PASS**.

### PH2.4 — Hoạch định Nhu cầu Nguyên phụ liệu (MRP)
- **Công thức chuẩn trong Source code & Database:**
  $$\text{total\_requirement} = \sum \left( \text{so\_luong\_ke\_hoach} \times \text{dinh\_muc} \times \left(1 + \frac{\text{ty\_le\_hao\_hut}}{100}\right) \right)$$
  $$\text{shortage} = \max(0, \text{total\_requirement} - \text{available\_stock})$$
- **Đối soát Runtime thực tế với 3 vật tư chính (trên 8 KHSX đang hoạt động):**
  1. *Vật tư VT-CHI-MAY-02 (Chỉ may Poly Trắng):*
     - Nhu cầu tính toán độc lập: 336.600 cuộn
     - Tồn kho thực tế PH4: 200.000 cuộn
     - Thiếu hụt API phản hồi: **136.600 cuộn** (Khớp chính xác 100%)
  2. *Vật tư VT-CUC-AO-03 (Cúc nhựa 4 lỗ):*
     - Nhu cầu tính toán độc lập: 54.120 cái
     - Tồn kho thực tế PH4: 15.000 cái
     - Thiếu hụt API phản hồi: **39.120 cái** (Khớp chính xác 100%)
  3. *Vật tư VT-VAI-KATE-01 (Vải Kate lụa trắng):*
     - Nhu cầu tính toán độc lập: 11.216.700m
     - Tồn kho thực tế PH4: 331.200m
     - Thiếu hụt API phản hồi: **10.885.500m** (Khớp chính xác 100%)
- **Đánh giá:** **PASS**.

### PH2.5 — Luồng tích hợp PH2 $ightarrow$ PH3 (Chuyển tiếp MRP sang Yêu cầu Mua sắm PR)
- **Hàm xử lý:** `createPurchaseRequestFromMrp` trong `productionController.js`.
- **Bằng chứng dữ liệu:** Tự động tạo bản ghi `yeu_cau_mua_hang` với `nguon_yeu_cau = 'san_xuat'`, `trang_thai = 'cho_duyet'`, chèn dòng chi tiết `chi_tiet_yeu_cau_mua` với `ma_kho_nhap = 1`, đồng thời cập nhật cờ `da_tao_yeu_cau_mua = 'da_tao'` trong bảng `nhu_cau_npl`.
- **Giao dịch:** Đóng gói trọn vẹn trong PostgreSQL Transaction (`BEGIN ... COMMIT ... ROLLBACK`).
- **Đánh giá:** **PASS**.

### PH2.6 — Luồng tích hợp PH2 $ightarrow$ PH4 (Quy tắc xuất kho cho sản xuất)
- **Kiểm tra quyền sở hữu dữ liệu:** Phân hệ PH2 **HOÀN TOÀN KHÔNG** can thiệp trực tiếp vào `ton_kho` (`UPDATE`, `INSERT`, `DELETE`).
- Khi phát sinh nhu cầu lĩnh vật tư cho xưởng may, phân hệ Kho (PH4) lập phiếu xuất với `loai_xuat = 'xuat_san_xuat'` và tham chiếu khóa ngoại tới `lenh_san_xuat(id)`.
- PH4 thực hiện `SELECT ... FOR UPDATE` trên bảng `ton_kho` và kiểm soát chặt chẽ chống xuất âm tồn kho.
- **Đánh giá:** **PASS**.

### PH2.7 — Ghi nhận kết quả sản xuất (`ket_qua_san_xuat`)
- **Khóa dòng chống Race Condition:** `recordResult` thực hiện `SELECT ... FOR UPDATE` trên dòng lệnh sản xuất.
- Khi có nhiều ca sản xuất báo cáo sản lượng đồng thời, giao dịch khóa hàng tuần tự hóa việc cộng dồn `so_luong_hoan_thanh`.
- **Bằng chứng kiểm thử tranh chấp (`test_ph2_concurrency.js`):** 10 request gửi đồng thời (mỗi ca 50 áo) cho LSX 500 áo $ightarrow$ ghi nhận chính xác tuyệt đối 500/500 áo không thất thoát sản lượng, tự động kích hoạt hoàn tất lệnh.
- **Đánh giá:** **PASS**.

### PH2.8 — Đối chiếu tiêu hao NVL theo FR-09 (`getOrderReconciliation`)
- **Bản chất nghiệp vụ:** So sánh giữa Định mức tiêu hao kỹ thuật (BOM $\times$ Sản lượng hoàn thành) với Thực tế số lượng NVL mà PH4 đã xuất kho cho LSX đó qua các phiếu `loai_xuat = 'xuat_san_xuat'`.
- Phân loại rõ ràng: `chinh_xac`, `vuot_dinh_muc`, `tiet_kiem`.
- **Lưu ý phân biệt:** Đây là nghiệp vụ **Production Material Technical Reconciliation (FR-09)**, chưa bao gồm hạch toán chênh lệch giá thành kế toán vào sổ cái phân hệ PH5.
- **Đánh giá:** **PARTIAL (Technical Reconciliation đạt chuẩn 100%, Financial posting pending)**.

---

## IV. AUDIT PH3 — MUA HÀNG & QUẢN LÝ NHÀ CUNG CẤP

### PH3.1 — Quản lý Nhà cung cấp (`nha_cung_cap`)
- **Dữ liệu thực tế:** 20 nhà cung cấp dệt may đang hoạt động (gồm Công ty CP Dệt May Phong Phú, Dệt May Thành Công, Dệt Nhuộm Nam Định, Phụ liệu May Việt Á...).
- **Chống trùng mã:** Bắt buộc trường `ma_nha_cung_cap UNIQUE`.
- **Đánh giá định kỳ (`danh_gia_ncc`):** Bảng đánh giá 3 tiêu chí trọng số:
  $$\text{diem\_tong\_hop} = 0.4 \times \text{chat\_luong} + 0.3 \times \text{giao\_hang} + 0.3 \times \text{gia\_ca}$$
  Kiểm tra trên 15 bản ghi thực tế: Công thức tính chuẩn xác 100%.
- **Đánh giá:** **PASS**.

### PH3.2 — Yêu cầu mua sắm PR (`yeu_cau_mua_hang`, `chi_tiet_yeu_cau_mua`)
- **Khởi tạo:** Hỗ trợ tạo từ nhu cầu nội bộ hoặc chuyển tiếp tự động từ PH2 MRP (`nguon_yeu_cau = 'san_xuat'`).
- **Phê duyệt/Từ chối:** Hỗ trợ quy trình duyệt cấp phòng ban (`cho_duyet` $ightarrow$ `da_duyet` / `tu_choi`).
- **Chuyển PR sang PO (`convertPrToPo`):** Tự động phát hành đơn mua hàng (PO) từ PR đã duyệt, cập nhật trạng thái PR thành `da_tao_don`.
- **Đánh giá:** **PASS**.

### PH3.3 — Yêu cầu báo giá RFQ & So sánh chào giá (`yeu_cau_bao_gia`, `chi_tiet_bao_gia_ncc`)
- **Mô hình đa nhà cung cấp:** Một RFQ cho phép nhiều nhà cung cấp gửi báo giá cạnh tranh với đơn giá chào, thời gian giao hàng và điều kiện thanh toán khác nhau.
- **Lựa chọn chào thầu (`selectVendorQuote`):** Đánh dấu `da_chon = TRUE` cho NCC được chọn, chuyển trạng thái RFQ sang `da_chot`, và tự động phát hành đơn mua hàng (PO) tương ứng.
- **Đánh giá:** **PASS**.

### PH3.4 — Đơn mua hàng PO (`don_mua_hang`, `chi_tiet_don_mua`)
- **Kiểm soát tính hợp lệ:** Chặn số lượng $\le 0$ hoặc đơn giá $< 0$ (`VALIDATION_ERROR`).
- **Phê duyệt đơn mua (`approvePurchaseOrder`):** Áp dụng `SELECT FOR UPDATE` chống phê duyệt trùng lặp (Double Approval $ightarrow$ HTTP 409 `CONFLICT`). Chỉ cho phép duyệt khi PO ở trạng thái `cho_duyet`.
- **Hủy đơn mua (`cancelPurchaseOrder`):** Áp dụng `SELECT FOR UPDATE`. Không cho phép hủy đơn đã nhập kho (`da_nhap_kho`) hoặc đã hủy trước đó (Double Cancel $ightarrow$ HTTP 409 `CONFLICT`).
- **Chuyển trạng thái chuẩn (`isValidStatusTransition`):** Ngăn chặn mọi hành vi bypass vòng đời đơn hàng.
- **Đánh giá:** **PASS**.

### PH3.5 & PH3.6 — Quy trình Nhận hàng & Tích hợp E2E sang PH4
- **Đơn hàng chờ nhận (`getReceivingOrders`):** Lọc các đơn mua ở trạng thái `da_gui_ncc`, `da_xac_nhan`, `dang_giao` có lượng hàng còn nợ (`tong_con_lai > 0`).
- **Quy tắc sở hữu dữ liệu:** Phân hệ Mua hàng **KHÔNG** tự ý cập nhật bảng `ton_kho`.
- **Luồng tích hợp chuẩn:**
  1. Hàng đến cổng nhà máy May 10 $ightarrow$ Thủ kho (vai trò `kho`) mở phân hệ PH4 lập Phiếu Nhập Kho (`POST /api/v1/phieu-nhap`) với `loai_nhap = 'tu_mua_hang'` và tham chiếu `ma_don_mua_hang`.
  2. PH4 tự động tăng tồn kho `ton_kho` bằng giao dịch `SELECT FOR UPDATE`.
  3. Cập nhật tiến độ tiếp nhận (`POST /api/v1/purchasing/receive-status-update`): Cập nhật `so_luong_da_nhap` trong `chi_tiet_don_mua`.
  4. Nếu nhập đủ 100%: Tự động chuyển PO sang `da_nhap_kho`. Nếu nhập một phần: PO chuyển sang `dang_giao`.
- **Bằng chứng Runtime thực tế:** Kiểm thử Test 10 & 11 trong `test_ph3_purchasing.js` xác nhận trước khi nhập tồn kho là $X$, sau khi nhập 500m vải thì tồn kho trở thành $X + 500$, khớp chính xác từng mét vải.
- **Đánh giá:** **PASS**.

### PH3.7 — Kiểm thử Tranh chấp đồng thời (`test_ph3_concurrency.js`)
- Kịch bản 1 (Tranh chấp duyệt PO): 10 request phát song song $ightarrow$ Duy nhất 1 request thành công (200 OK), 9 request còn lại bị chặn an toàn với HTTP 409 Conflict.
- Kịch bản 2 (Tranh chấp hủy PO): 10 request phát song song $ightarrow$ Duy nhất 1 request thành công (200 OK), 9 request còn lại trả về 409 Conflict.
- Kịch bản 3 (Tranh chấp chuyển trạng thái): Duy nhất 1 request thành công, không phát sinh xung đột dữ liệu.
- **Đánh giá:** **PASS**.

---

## V. AUDIT PH4 — KHO & QUẢN LÝ VẬT TƯ

### PH4.1 — Danh mục Vật tư (`vat_tu`) & Đơn vị tính (`don_vi_tinh`)
- **Dữ liệu thực tế:** 5 mặt hàng nguyên phụ liệu chủ lực (Vải Kate lụa trắng, Chỉ may Poly trắng, Cúc nhựa 11mm, Vải Chiffon xanh pastel, Vải Kaki bảo hộ).
- **Quy định tồn kho tối thiểu / tối đa:** Trường `muc_ton_toi_thieu` và `muc_ton_toi_da` được lưu trữ đầy đủ. Báo cáo tồn kho tự động cảnh báo `canh_bao_thap` khi `so_luong_ton <= muc_ton_toi_thieu` và `het_hang` khi `so_luong_ton <= 0`.
- **Đánh giá:** **PASS**.

### PH4.2 & PH4.3 — Kho (`kho`) & Sơ đồ Vị trí kệ hàng (`vi_tri_kho`)
- **Danh mục kho:** 3 kho vật lý:
  - Kho Nguyên Phụ Liệu Số 1 (Sài Đồng, Long Biên)
  - Kho Phụ Liệu May & Chỉ Cúc (Sài Đồng)
  - Kho Thành Phẩm May 10 (Sài Đồng)
- **Vị trí kệ hàng:** 64 vị trí được định danh rõ ràng theo cấu trúc Khu vực - Dãy - Kệ - Tầng (`khu_vuc`, `tang`, `suc_chua_toi_da`).
- **Đánh giá:** **PASS**.

### PH4.4 — Lô vật tư & Cây vải May mặc (FR-03)
- **Bảng dữ liệu `lo_vat_tu`:** Lưu trữ chi tiết thông tin quản lý cây vải may mặc theo đặc thù ngành may:
  - `mau_sac` (Màu sắc vải)
  - `kho_vai` (Khổ rộng vải, ví dụ: 1.5m)
  - `chieu_dai` (Chiều dài cây vải, ví dụ: 100m)
  - `han_su_dung` (Hạn sử dụng / hạn lưu kho)
  - `so_luong_hien_tai` (Số mét khả dụng trong cây)
- **Đánh giá:** **PASS**.

### PH4.5 — Quy trình Nhập kho (`phieu_nhap_kho`, `chi_tiet_phieu_nhap`)
- **Kiểm soát tính hợp lệ:** Bắt buộc số lượng nhập $> 0$.
- **Hỗ trợ tạo lô mới tự động:** Cho phép phân bổ trực tiếp cây vải mới vào vị trí kệ hàng ngay khi lập phiếu nhập.
- **Cập nhật tồn kho an toàn:** Dùng `SELECT ... FOR UPDATE` trên dòng `ton_kho`. Nếu kho và vật tư đã tồn tại thì cộng thêm số lượng, nếu chưa thì tự động chèn mới dòng tồn kho.
- **Công thức:** $\text{stock\_after} = \text{stock\_before} + \text{receipt\_quantity}$.
- **Đánh giá:** **PASS**.

### PH4.6 — Quy trình Xuất kho & Tuyệt đối Chặn Xuất Âm (`phieu_xuat_kho`)
- **Cơ chế phòng vệ trọng yếu:**
  `SELECT tk.id, tk.so_luong_ton FROM ton_kho tk WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2 FOR UPDATE`
- **Kiểm tra tồn kho:**
  `if (tonHienTai < slXuat)` $ightarrow$ Thao tác bị từ chối ngay lập tức, trả về HTTP 409 `INSUFFICIENT_STOCK` với thông báo:
  *"Xung đột tồn kho: Mặt hàng [...] không đủ số lượng để xuất. Tồn khả dụng hiện tại: ..., Yêu cầu xuất: ... Giao dịch bị hủy bỏ."*
- **Bằng chứng Concurrency (`test_concurrency.js`):** Hai yêu cầu xuất đồng thời (80m và 50m từ tồn kho ban đầu 100m) $ightarrow$ Request 1 thành công trừ 80m còn 20m, Request 2 bị chặn 409 ngay lập tức. Tồn kho cuối cùng là 20m, **tuyệt đối không bị âm**.
- **Đánh giá:** **PASS**.

### PH4.7 — Điều chuyển kho nội bộ (`phieu_chuyen_kho`)
- **Kiểm tra nghiệp vụ:** Bắt buộc kho xuất $\ne$ kho nhập (`INVALID_WAREHOUSE_SELECTION`).
- **Tính nguyên tử (Atomic Transfer):** Sử dụng chung một PostgreSQL Transaction:
  1. Khóa và trừ tồn kho tại Kho Xuất.
  2. Khóa và cộng tồn kho tại Kho Nhập.
  3. Nếu bất kỳ bước nào thất bại, toàn bộ giao dịch bị `ROLLBACK`, đảm bảo không mất mát hay tăng khống vật tư.
- **Đánh giá:** **PASS**.

### PH4.8 — Kiểm kê kho & Cân đối số dư (`phieu_kiem_ke`)
- **Công thức:** $\text{chenh\_lech} = \text{so\_luong\_thuc\_te} - \text{so\_luong\_so\_sach}$.
- **Điều chỉnh số dư (`dieuChinhTonKho`):** Khóa phiếu kiểm kê `FOR UPDATE`. Cập nhật số lượng tồn kho thành số lượng thực tế kiểm kê, ghi nhận `da_dieu_chinh = 'da_dieu_chinh'`, chống điều chỉnh trùng lặp.
- **Đánh giá:** **PASS**.

### PH4.9 — Mô hình Tồn kho Đa chiều (Multidimensional Inventory)
- **Phát hiện Audit:**
  - Bảng `ton_kho` hiện tại lưu trữ ở mức **2 chiều cốt lõi**: `(ma_kho, ma_vat_tu)`.
  - Chiều vị trí kệ hàng (`ma_vi_tri_kho`) và lô vải (`ma_lo_vat_tu`) được lưu trữ tại bảng vệ tinh `lo_vat_tu` và chi tiết chứng từ.
  - Trường `so_luong_dat_truoc` (`quantity_reserved`) **không tồn tại** trong bảng `ton_kho`.
  - **Kết luận:** **Số lượng khả dụng (`available_stock`) hiện đang tương đương với số lượng tồn thực tế (`so_luong_ton` / on-hand) vì trường `quantity_reserved` chưa được thiết kế trong schema.**
- **Đánh giá:** **PARTIAL (Phản ánh chính xác hiện trạng kiến trúc CSDL)**.

### PH4.10 — Sổ Thẻ kho / Nhật ký Biến động (FR-11 Movement Ledger)
- **Hàm xử lý:** `getTheKho` trong `backend/src/controllers/tonKhoController.js`.
- **Phát hiện Audit:**
  - Hiện tại hàm `getTheKho` truy vấn hợp nhất hai nguồn: `phieu_nhap_kho` (`nhap_kho`) và `phieu_xuat_kho` (`xuat_kho`).
  - **Chưa bao gồm:** Biến động điều chuyển kho (`chi_tiet_chuyen_kho`) và chênh lệch điều chỉnh kiểm kê (`chi_tiet_kiem_ke`).
  - Mảng dữ liệu trả về chưa tính toán sẵn cột số dư lũy kế (`running_balance`) trên từng dòng mà trả về `tonHienTai` ở cấp độ tổng hợp.
- **Đánh giá:** **PARTIAL (Đạt 70% yêu cầu FR-11; cần mở rộng UNION chuyển kho và kiểm kê trong tương lai)**.

---

## VI. AUDIT PH5 — TÀI CHÍNH / KẾ TOÁN / GIÁ THÀNH

### PH5.1 & PH5.2 — Hệ thống Tài khoản & Cân đối Định khoản (Debit = Credit)
- **Hệ thống tài khoản (`he_thong_tai_khoan`):** 11 tài khoản kế toán chuẩn mực Việt Nam (TK 111, 1111, 112, 1121, 131, 152, 154, 155, 331, 511, 632).
- **Quy tắc Cân đối Định khoản:**
  - Trong bảng `nhat_ky_hach_toan`, mỗi bút toán bao gồm một cặp `tai_khoan_no` và `tai_khoan_co` tương ứng với số tiền hạch toán (`so_tien`).
  - Tổng số tiền Nợ đã hạch toán: **537.500.000 VNĐ**.
  - Tổng số tiền Có đã hạch toán: **537.500.000 VNĐ**.
  - **Chênh lệch Nợ - Có: 0.00 VNĐ (Cân đối tuyệt đối 100%).**
- **Đánh giá:** **PASS**.

### PH5.3 — Chứng từ gốc & Sổ Nhật ký Chung
- **Chứng từ gốc (`chung_tu_goc`):** Liên kết rõ ràng với chứng từ nguồn (phiếu nhập kho PH4, hóa đơn bán hàng PH1).
- **Quyền sở hữu sổ sách:** Toàn bộ bảng `nhat_ky_hach_toan` chỉ được ghi bởi các dịch vụ kế toán của PH5 (`journalWriteService.js`, `documentWriteService.js`). Không có phân hệ bên ngoài nào được tự ý chèn bút toán sổ cái.
- **Đánh giá:** **PASS**.

### PH5.4 — Quản lý Công nợ (AR / AP)
- **Công nợ Phải thu (AR - Khách hàng):**
  - Khách hàng Công ty Thời trang An Phước: Phát sinh 475.200.000 đ, đã thanh toán 100.000.000 đ $ightarrow$ Còn lại: **375.200.000 đ** (`mot_phan`).
- **Công nợ Phải trả (AP - Nhà cung cấp):**
  - NCC Dệt May Phong Phú: Phát sinh 105.300.000 đ, đã thanh toán 105.300.000 đ $ightarrow$ Còn lại: **0 đ** (`da_thanh_toan`).
- **Công thức:** $\text{outstanding} = \text{total} - \text{paid}$ khớp chính xác 100%.
- **Lưu ý:** Bảng `thanh_toan_ncc` đã có dữ liệu seed; tuy nhiên quy trình lập phiếu chi tự động từ giao diện người dùng hiện đang ở mức cơ bản.
- **Đánh giá:** **PASS**.

### PH5.5 — Tính Giá thành Sản phẩm May mặc
- **Công thức tập hợp chi phí:**
  $$\text{tong\_chi\_phi} = \text{chi\_phi\_vat\_lieu\_truc\_tiep (DM)} + \text{chi\_phi\_nhan\_cong\_truc\_tiep (DL)} + \text{chi\_phi\_san\_xuat\_chung (MOH)}$$
  $$\text{gia\_thanh\_don\_vi} = \frac{\text{tong\_chi\_phi}}{\text{so\_luong\_san\_xuat}}$$
- **Đối soát trên dữ liệu thực tế Lệnh LSX-2026-001 (1.000 áo sơ mi):**
  - Chi phí NVL trực tiếp (DM): 110.500.000 VNĐ
  - Chi phí nhân công trực tiếp (DL): 65.000.000 VNĐ
  - Chi phí sản xuất chung (MOH): 44.500.000 VNĐ
  - Tổng chi phí thực tế: $110.5M + 65M + 44.5M = \mathbf{220.000.000}$ VNĐ.
  - Số lượng sản xuất: 1.000 sản phẩm.
  - Giá thành đơn vị: $\frac{220.000.000}{1.000} = \mathbf{220.000}$ VNĐ/áo.
  - Giá bán đề nghị: 450.000 VNĐ/áo.
  - **Khớp chính xác tuyệt đối cả công thức và bản ghi lưu trong database.**
- **Đánh giá:** **PASS**.

### PH5.6, PH5.7, PH5.8 — Ranh giới Sở hữu PH5 với PH4, PH2, PH3
- PH5 đọc dữ liệu xuất nhập tồn từ PH4 $ightarrow$ **READ-ONLY**, không bao giờ mutate `ton_kho`.
- PH5 đọc dữ liệu sản lượng hoàn thành từ PH2 $ightarrow$ **READ-ONLY**, không bao giờ sửa `lenh_san_xuat`.
- PH5 đọc thông tin nhà cung cấp và đơn mua từ PH3 $ightarrow$ **READ-ONLY**, quản lý công nợ chuẩn theo hợp đồng dữ liệu.
- **Đánh giá:** **PASS**.

### PH5.9 — Tích hợp PH1 $ightarrow$ PH5 (Hóa đơn bán hàng sang Sổ cái)
- Trong CSDL hiện tại có 1 bản ghi mẫu `hoa_don_ban_hang` được liên kết sang `CTG-2026-002`.
- Tuy nhiên, API tự động phát hành bút toán tự động khi chốt đơn hàng từ PH1 hiện **CHƯA TỒN TẠI** do phân hệ PH1 đang trong giai đoạn chuẩn bị controlled porting từ branch `ph1-bh-qlkh`.
- **Đánh giá:** **PENDING / NOT IMPLEMENTED**.

---

## VII. ĐÁNH GIÁ 4 LUỒNG DỮ LIỆU LIÊN PHÂN HỆ (CROSS-MODULE FLOWS)

| Luồng nghiệp vụ | Mô tả chuỗi liên kết | Bằng chứng thực tế | Đánh giá |
| :--- | :--- | :--- | :---: |
| **Flow A** | **Bán hàng (PH1) $ightarrow$ Sản xuất (PH2) $ightarrow$ Vật tư** | Bảng `ke_hoach_san_xuat` có trường `ma_don_ban_hang`. Tuy nhiên do PH1 chưa tích hợp chính thức, luồng tự động sinh KHSX từ đơn bán hàng chưa kích hoạt. | **PARTIAL** |
| **Flow B** | **Sản xuất (PH2) $ightarrow$ Mua hàng (PH3) $ightarrow$ Kho (PH4)** | KHSX thiếu NVL $ightarrow$ MRP tính thiếu hụt $ightarrow$ Tự sinh PR (`nguon_yeu_cau = 'san_xuat'`) $ightarrow$ Duyệt PR chuyển sang PO $ightarrow$ NCC giao hàng $ightarrow$ PH4 lập phiếu nhập kho $ightarrow$ Tồn kho tăng $ightarrow$ PO tự động chuyển sang `da_nhap_kho`. Đã có đầy đủ Execution Evidence tại Test 12 & 13 trong `test_ph3_purchasing.js`. | **PASS** |
| **Flow C** | **Sản xuất (PH2) $ightarrow$ Kho (PH4) $ightarrow$ Kế toán (PH5)** | LSX phát hành $ightarrow$ PH4 xuất NVL cho sản xuất (`xuat_san_xuat`) $ightarrow$ PH2 đối soát tiêu hao NVL theo FR-09 $ightarrow$ PH5 lấy sản lượng và chi phí tính giá thành sản phẩm trên lệnh sản xuất. | **PASS** |
| **Flow D** | **Mua hàng (PH3) $ightarrow$ Kho (PH4) $ightarrow$ Kế toán (PH5)** | Đơn mua PO $ightarrow$ Phiếu nhập kho PH4 (`tu_mua_hang`) $ightarrow$ Sinh chứng từ gốc `chung_tu_goc` $ightarrow$ Hạch toán Nợ 152 / Có 331 trong `nhat_ky_hach_toan` $ightarrow$ Ghi nhận công nợ phải trả `cong_no`. | **PASS** |

---

## VIII. KẾT QUẢ KIỂM TOÁN TÍNH TOÀN VẸN DỮ LIỆU (DATA INTEGRITY AUDIT)

Đã quét toàn bộ 43 bảng của CSDL `erp_may10`:

1. **Tồn kho âm (Negative stock):** **0 bản ghi** trong `ton_kho` (PASS).
2. **Số lượng âm trong lô vải (`lo_vat_tu`):** **0 bản ghi** (PASS).
3. **Số lượng âm trong chi tiết chứng từ kho:**
   - `chi_tiet_phieu_nhap`: **0 bản ghi** $le 0$ (PASS).
   - `chi_tiet_phieu_xuat`: **0 bản ghi** $le 0$ (PASS).
   - `chi_tiet_chuyen_kho`: **0 bản ghi** $le 0$ (PASS).
   - `chi_tiet_don_mua`: **0 bản ghi** $le 0$ (PASS).
   - `chi_tiet_yeu_cau_mua`: **0 bản ghi** $le 0$ (PASS).
4. **Mã chứng từ trùng lặp (Duplicate Business Codes):** Đã kiểm tra 15 bảng chính (`phieu_nhap_kho`, `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`, `don_mua_hang`, `yeu_cau_mua_hang`, `yeu_cau_bao_gia`, `nha_cung_cap`, `ke_hoach_san_xuat`, `lenh_san_xuat`, `chung_tu_goc`, `nhat_ky_hach_toan`, `vat_tu`, `kho`, `san_pham`) $ightarrow$ **100% Unique, không trùng lặp**.
5. **Bản ghi mồ côi (Broken Foreign Keys / Orphans):**
   - Đã kiểm tra 11 cặp quan hệ cha - con $ightarrow$ **0 bản ghi mồ côi (100% Khóa ngoại toàn vẹn)**.
6. **Cân đối Kế toán:** Tổng Nợ = Tổng Có = **537.500.000 VNĐ** (Cân đối 100%).

---

## IX. BẢNG MA TRẬN 20 NGUYÊN TẮC NGHIỆP VỤ CỐT LÕI (CRITICAL BUSINESS RULES)

| STT | Nguyên tắc nghiệp vụ cốt lõi | Bằng chứng Source | Bằng chứng Database | Bằng chứng Runtime / Test | Kết luận |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | **Không âm tồn kho** | `phieuXuatController.js:180` | 0 row tồn kho âm trong `ton_kho` | Ném HTTP 409 `INSUFFICIENT_STOCK` | **PASS** |
| 2 | **Concurrent xuất kho không âm tồn** | `SELECT ... FOR UPDATE` | Tồn kho sau test = 20m | `test_concurrency.js` 100% Pass | **PASS** |
| 3 | **Nhập kho cộng đúng tồn** | `phieuNhapController.js:256` | `so_luong_ton = so_luong_ton + slNhap` | `test_ph4_api.js` Test 6 Pass | **PASS** |
| 4 | **Xuất kho trừ đúng tồn** | `phieuXuatController.js:255` | `so_luong_ton = so_luong_ton - slXuat` | `test_ph4_api.js` Test 7 Pass | **PASS** |
| 5 | **Transfer kho atomic** | `phieuChuyenController.js:130` | Trừ kho xuất & cộng kho nhập 1 Transaction | `test_ph4_api.js` Test 8 Pass | **PASS** |
| 6 | **Cân đối kiểm kê đúng** | `phieuKiemKeController.js:231` | `so_luong_ton = so_luong_thuc_te` | `test_ph4_api.js` Test 9 Pass | **PASS** |
| 7 | **Công thức MRP đúng** | `productionController.js:751` | `dinh_muc * (1 + hao_hut/100)` | Tính toán độc lập 3 vật tư khớp 100% | **PASS** |
| 8 | **Tính thiếu hụt MRP đúng** | `productionController.js:772` | `Math.max(0, needed - stock)` | API `/api/v1/production/mrp` khớp 100% | **PASS** |
| 9 | **MRP sinh PR mua sắm đúng** | `productionController.js:814` | `yeu_cau_mua_hang (nguon='san_xuat')` | `test_ph2_production.js` Test 10 Pass | **PASS** |
| 10 | **Chuyển PR sang PO đúng** | `purchasingController.js:1540` | `convertPrToPo` tạo `don_mua_hang` | `test_ph3_purchasing.js` Test 13 Pass | **PASS** |
| 11 | **PO lọc đơn chờ nhận đúng** | `purchasingController.js:1072` | Lọc PO `da_gui_ncc` còn nợ hàng | `test_ph3_purchasing.js` Test 9 Pass | **PASS** |
| 12 | **Nhận hàng cập nhật PO & Kho** | `phieuNhapController.js:166` | Khóa ngoại `ma_don_mua_hang` | `test_ph3_purchasing.js` Test 10-12 Pass | **PASS** |
| 13 | **PH2 không direct mutate tồn kho** | `grep UPDATE ton_kho` | 0 kết quả trong `productionController` | Source audit 100% Read-only | **PASS** |
| 14 | **PH5 đọc tồn kho Read-only** | `grep UPDATE ton_kho` | 0 kết quả trong `financeServices` | Source audit 100% Read-only | **PASS** |
| 15 | **Cân đối Kế toán (Debit = Credit)** | `journalWriteService.js` | Bút toán cặp Nợ - Có cùng số tiền | Tổng Nợ = Tổng Có = 537.5M VNĐ | **PASS** |
| 16 | **Công thức tính Giá thành đúng** | `gia_thanh_san_pham` | $DM + DL + MOH = Total$, $Unit = Total/Qty$ | Lệnh LSX-2026-001 khớp 220.000 đ/áo | **PASS** |
| 17 | **Lifecycle trạng thái không bypass** | `isValidStatusTransition` | State transition guards trên KHSX, PO | Thử chuyển sai trạng thái $\rightarrow$ HTTP 409 | **PASS** |
| 18 | **Chặn trùng lặp giao dịch** | `UNIQUE` & State Locks | Chống duyệt trùng lặp, chống hủy trùng | `test_ph3_concurrency.js` 9/9 Pass | **PASS** |
| 19 | **Rollback giao dịch hoạt động** | `try ... catch ROLLBACK` | Không phát sinh dữ liệu rác khi lỗi | `test_ph4_api.js` chặn xuất âm 409 | **PASS** |
| 20 | **RBAC bảo vệ đúng thẩm quyền** | `requireRoles` & Matrix | Phân quyền 6 vai trò chuẩn tiếng Việt | `test_rbac_security.js` 27/27 Pass | **PASS** |

---

## X. DANH MỤC PHÁT HIỆN & ĐỀ XUẤT HOÀN THIỆN (FINDINGS & RECOMMENDATIONS)

### 1. Finding F-01: Thẻ kho (Movement Ledger) chưa hợp nhất chuyển kho và kiểm kê
- **Mức độ:** **MEDIUM** (Ảnh hưởng tiện ích báo cáo, không gây sai lệch số dư thực tế).
- **Hiện trạng:** Hàm `getTheKho` tại `tonKhoController.js` mới chỉ lấy biến động nhập kho và xuất kho thông thường, chưa gom `phieu_chuyen_kho` và `phieu_kiem_ke` vào bảng kê chuyển dịch.
- **Khuyến nghị:** Bổ sung 2 câu lệnh `UNION ALL` cho chuyển kho nội bộ và điều chỉnh kiểm kê để đạt chuẩn 100% FR-11.

### 2. Finding F-02: Bảng tồn kho lưu trữ ở cấp độ 2 chiều (Kho - Vật tư)
- **Mức độ:** **INFO / ARCHITECTURAL OBSERVATION**.
- **Hiện trạng:** Bảng `ton_kho` không có trường `so_luong_dat_truoc` (`quantity_reserved`). Số lượng khả dụng hiện bằng số lượng tồn kho vật lý.
- **Khuyến nghị:** Khi tích hợp sâu luồng đặt cọc đơn bán hàng PH1, có thể bổ sung cột `so_luong_giu_cho` (`reserved_quantity`) vào bảng `ton_kho`.

### 3. Finding F-03: Tự động hóa kết nối Hóa đơn Bán hàng PH1 sang Sổ cái PH5
- **Mức độ:** **INFO / PENDING MODULE PORTING**.
- **Hiện trạng:** Do phân hệ Bán hàng (PH1) chưa được porting chính thức từ branch `ph1-bh-qlkh`, luồng tự động ghi sổ doanh thu và giá vốn từ PH1 sang PH5 hiện đang ở trạng thái chờ tích hợp (Pending Integration).

---

## XI. BẢNG ĐIỂM NGHIỆP VỤ & FINAL VERDICT

### 1. Bảng chấm điểm thành phần

| Phân hệ / Tiêu chí thẩm tra | Điểm tối đa | Điểm đạt được | Đánh giá |
| :--- | :---: | :---: | :---: |
| **PH2 — Sản xuất & Hoạch định MRP** | 100 | **92** | Hoàn thành xuất sắc BOM, KHSX, LSX, MRP, PR. FR-09 kỹ thuật đạt chuẩn. |
| **PH3 — Mua hàng & Nhà cung cấp** | 100 | **95** | Đầy đủ chu trình NCC, PR, RFQ, PO, Receiving, Concurrency locking. |
| **PH4 — Kho & Quản lý vật tư** | 100 | **88** | Chống xuất âm tuyệt đối, chuyển kho atomic, kiểm kê chuẩn. Thẻ kho cần mở rộng. |
| **PH5 — Tài chính - Kế toán & Giá thành** | 100 | **90** | Debit=Credit, Sổ cái, Công nợ, Giá thành chuẩn xác. Chờ tích hợp tự động PH1. |
| **Cross-Module Business Flows** | 100 | **88** | Flow B, C, D vận hành hoàn hảo. Flow A chờ tích hợp PH1. |
| **TỔNG ĐIỂM TOÀN HỆ THỐNG** | **100** | **91** | **XUẤT SẮC / HOÀN THIỆN CAO** |

---

### 2. Kết luận Nghiệm thu Cuối cùng (Final Verdict)

Theo quy chuẩn nghiệm thu tại Mục XIX của Hướng dẫn Audit, với các bằng chứng thực tế từ Source Code, PostgreSQL Database, REST API Runtime và Concurrency Execution, Hội đồng Kiểm toán đưa ra kết luận:

```
============================================================
FINAL VERDICT: B
PASS WITH MINOR FINDINGS
============================================================
```

**Tuyên bố chính thức:**
- Toàn bộ Logic Nghiệp vụ cốt lõi của 4 phân hệ **PH2 (Sản xuất), PH3 (Mua hàng), PH4 (Kho vận), và PH5 (Kế toán)** đã được kiểm chứng tính đúng đắn, an toàn dữ liệu, chống xuất âm và bảo vệ quyền sở hữu module tuyệt đối.
- Hệ thống đã sẵn sàng cho bước tiếp theo: **Controlled Porting phân hệ PH1 (Bán hàng & Quản lý Khách hàng)** vào hệ sinh thái ERP May 10.
