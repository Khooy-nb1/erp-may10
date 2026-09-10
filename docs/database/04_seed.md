# 04 — MÔ TẢ DỮ LIỆU MẪU (SEED DATA SPECIFICATION)

Bộ dữ liệu mẫu (`seed.sql`) được thiết kế bám sát thực tế sản xuất kinh doanh của Tổng Công Ty May 10, phục vụ việc chứng minh tính toàn vẹn và khả năng vận hành thông suốt của cả 5 phân hệ trên CSDL chung gồm **41 bảng** và **6 bảng Master Data**.

---

## 1. Người Dùng Hệ Thống (`nguoi_dung`)

Tối thiểu 6 tài khoản mẫu tương ứng 6 vai trò nghiệp vụ then chốt:

| ID | Họ và tên | Email | Vai trò | Phòng ban | Mật khẩu mẫu |
|:---:|---|---|---|---|---|
| 1 | Quản Trị Viên Hệ Thống | `admin@may10.vn` | `admin` | Công Nghệ Thông Tin | `Password@123` |
| 2 | Nguyễn Văn Bán | `banhang@may10.vn` | `ban_hang` | Phòng Kinh Doanh | `Password@123` |
| 3 | Trần Văn Xuất | `sanxuat@may10.vn` | `san_xuat` | Phòng Kỹ Thuật Sản Xuất | `Password@123` |
| 4 | Lê Thị Mua | `muahang@may10.vn` | `mua_hang` | Phòng Cung Ứng | `Password@123` |
| 5 | Phạm Văn Kho | `kho@may10.vn` | `kho` | Bộ Phận Kho Vận | `Password@123` |
| 6 | Hoàng Thị Toán | `ketoan@may10.vn` | `ke_toan` | Phòng Tài Chính Kế Toán | `Password@123` |

---

## 2. Danh Mục 6 Bảng Master Data

### 1. Người dùng (`nguoi_dung`):
- 6 tài khoản người dùng mẫu phân quyền đầy đủ cho 6 vai trò nghiệp vụ cốt lõi.

### 2. Đơn vị tính (`don_vi_tinh`):
- `cai`: Cái (cho áo sơ mi, quần tây, vest thành phẩm)
- `met`: Mét (chiều dài cây vải dệt)
- `cuon`: Cuộn (chỉ may poly)
- `kg`: Kilogram (khối lượng phụ liệu)

### 3. Kho vật lý (`kho`):
- `KNL01`: Kho Nguyên Phụ Liệu Số 1 (1.200 m², sức chứa 50.000 đơn vị, loại `nguyen_lieu`)
- `KTP01`: Kho Thành Phẩm May 10 (1.500 m², sức chứa 80.000 cái, loại `thanh_pham`)
- `KPL01`: Kho Phụ Liệu May Mặc (600 m², sức chứa 20.000 đơn vị, loại `vat_tu_phu`)

### 4. Nhà cung cấp (`nha_cung_cap`):
- `NCC001`: Công Ty Cổ Phần Dệt May Phong Phú (Chuyên vải dệt thoi, hạn mức nợ 2 tỷ VNĐ, thời hạn 45 ngày, điểm đánh giá 9.2/10)
- `NCC002`: Công Ty TNHH Phụ Liệu May Thăng Long (Chuyên chỉ may, cúc áo, mex, hạn mức 500 triệu VNĐ, thời hạn 30 ngày, điểm đánh giá 8.8/10)

### 5. Sản phẩm may mặc (`san_pham`):
1. `SP-SM-NAM-01`: Áo Sơ Mi Nam Công Sở Dài Tay Trắng
   - Giá bán: 450.000 VNĐ | Giá vốn: 220.000 VNĐ
   - Thời gian SX: 0.45 giờ/sp | Định mức vải: 1.65 mét/sp | Size: L | Màu: Trắng
2. `SP-SM-NU-02`: Áo Sơ Mi Nữ Tay Lỡ Xanh Pastel
   - Giá bán: 420.000 VNĐ | Giá vốn: 205.000 VNĐ
   - Thời gian SX: 0.40 giờ/sp | Định mức vải: 1.45 mét/sp | Size: M | Màu: Xanh Pastel
3. `SP-QT-NAM-03`: Quần Tây Nam Slimfit Đen
   - Giá bán: 580.000 VNĐ | Giá vốn: 280.000 VNĐ
   - Thời gian SX: 0.60 giờ/sp | Định mức vải: 1.35 mét/sp | Size: 32 | Màu: Đen

### 6. Vật tư / Nguyên phụ liệu (`vat_tu`):
1. `VT-VAI-KATE-01`: Vải Kate Lụa Trắng Khổ 1.5m (Loại `vai_chinh`, tồn tối thiểu 500m, giá nhập bình quân 65.000 VNĐ/m, NCC Phong Phú)
2. `VT-CHI-MAY-02`: Chỉ May Poly 40/2 Trắng (Loại `chi_may`, cuộn 5.000m, giá nhập bình quân 28.000 VNĐ/cuộn, NCC Thăng Long)
3. `VT-CUC-AO-03`: Cúc Nhựa 4 Lỗ 11mm Trắng Đục (Loại `cuc_kep`, giá nhập 250 VNĐ/cái, NCC Thăng Long)
4. `VT-VAI-XANH-04`: Vải Chiffon Xanh Pastel Khổ 1.4m (Loại `vai_chinh`, giá nhập 72.000 VNĐ/m)

---

## 3. Khách Hàng (`khach_hang`)
1. `KH001`: Công Ty Cổ Phần Thời Trang An Phước (Hạn mức tín dụng: 1.5 tỷ VNĐ, thời hạn 45 ngày)
2. `KH002`: Đại Lý Phân Phối Thời Trang Miền Bắc Viettien Mart (Hạn mức: 800 triệu VNĐ, thời hạn 30 ngày)

---

## 4. Dữ Liệu Nghiệp Vụ Xuyên Suốt (Business Scenario)

Kịch bản demo là chuỗi quy trình khép kín:
1. **Đơn bán hàng**: Khách hàng An Phước đặt 1.000 áo sơ mi nam trắng (`DBH-2026-001`, tổng giá trị 476.000.000 VNĐ).
2. **Kế hoạch sản xuất**: Phòng Kỹ thuật lập `KHSX-2026-001` để sản xuất 1.000 áo sơ mi từ 1 tuần trước đến tuần tới.
3. **Định mức NPL**: Tính toán 1 áo cần 1.70m vải kate lụa (đã bao gồm 3% hao hụt), 0.051 cuộn chỉ, 8.2 cúc áo.
4. **Hoạch định MRP**: Tồn kho vải còn 200m -> cần đặt mua 1.500m vải (`nhu_cau_npl` #1).
5. **Yêu cầu & Đơn mua hàng**: Phòng Cung ứng tạo đề xuất `YCMH-2026-001` và phát hành đơn đặt hàng `DMH-2026-001` gửi Phong Phú mua 1.500m vải (tổng tiền 105.300.000 VNĐ gồm VAT).
6. **Nhập kho**: Phong Phú giao 1.500m vải -> Thủ kho lập phiếu nhập kho `PNK-2026-001` nhập vào Kệ Vải A tầng 1 (`KNL01-A-01`), gán mã lô `LO-VAI-2026-001`.
7. **Điều hành sản xuất**: Lập lệnh sản xuất `LSX-2026-001`, xuất 850m vải theo phiếu xuất kho `PXK-2026-001` cho xưởng may.
8. **Tiến độ công đoạn**: Công đoạn 1 "Cắt vải tự động" hoàn thành, công đoạn 2 "Ráp thân" đang chạy. Báo cáo kết quả `KQSX-2026-001` đạt 600 áo hoàn thành.
9. **Kế toán & Công nợ**:
   - Nhập vải: Chứng từ `CTG-2026-001`, hạch toán bút toán `BT-2026-001` Nợ TK 152 / Có TK 331 số tiền 97.500.000 VNĐ.
   - Bán hàng: Hóa đơn `HDBH-2026-001`, chứng từ `CTG-2026-002`, hạch toán `BT-2026-002` Nợ TK 131 / Có TK 511 số tiền 440.000.000 VNĐ.
   - Công nợ phải thu An Phước 375.200.000 VNĐ (đã thu 100.000.000 VNĐ tạm ứng).
   - Công nợ phải trả Phong Phú đã thanh toán 105.300.000 VNĐ qua ủy nhiệm chi Vietcombank.
10. **Tính giá thành**: Tập hợp chi phí vải trực tiếp 110.5 triệu + nhân công 65 triệu + SX chung 44.5 triệu = 220 triệu VNĐ cho 1.000 áo -> Giá thành đơn vị 220.000 VNĐ/cái (`gia_thanh_san_pham` #1).
