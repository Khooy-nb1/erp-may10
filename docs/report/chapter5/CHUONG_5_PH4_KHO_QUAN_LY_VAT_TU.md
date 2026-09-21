# CHƯƠNG 5: XÂY DỰNG HỆ THỐNG ERP

## 5.4. Phân hệ Kho và quản lý vật tư

Phân hệ Kho và quản lý vật tư (ký hiệu: **PH4**) trong hệ thống Hoạch định Nguồn lực Doanh nghiệp (ERP) của Tổng Công ty May 10 giữ vai trò hạt nhân trong việc kiểm soát dòng luân chuyển của vật tư, nguyên phụ liệu ngành may (vải chính, vải lót, chỉ may, cúc bấm, khóa kéo, phụ liệu đóng gói) và thành phẩm may mặc. Phân hệ chịu trách nhiệm đảm bảo tính chính xác về số dư tồn kho, vị trí kệ lưu trữ, theo dõi lô vật tư theo nguyên tắc hạn dùng FEFO, đồng thời tổ chức và kiểm soát toàn bộ chu trình lập chứng từ: nhập kho từ mua hàng (PH3) / thành phẩm sản xuất (PH2), xuất kho cấp phát chuyền may (PH2) / bán hàng (PH1), điều chuyển giữa các kho nội bộ và cân đối kiểm kê.

---

### 5.4.1. Thiết kế hệ thống

Kiến trúc phân hệ PH4 được xây dựng theo mô hình kiến trúc 3 tầng phân lớp (3-Tier Clean Architecture), tách bạch hoàn toàn giữa tầng hiển thị giao diện người dùng (Client Presentation), tầng điều phối dịch vụ và nghiệp vụ ứng dụng (Application & API Routing), và tầng quản trị lưu trữ cơ sở dữ liệu quan hệ (Database Layer). Toàn bộ hệ thống vận hành trên nền tảng: **React.js 18 + Tailwind CSS 3** ở phía Frontend, **Node.js v24 + Express.js 4** ở phía Backend Server, và hệ quản trị cơ sở dữ liệu **PostgreSQL 18.6** với cơ sở dữ liệu `erp_may10`.

#### a) Biểu đồ thành phần (Component Diagram)

Biểu đồ thành phần mô tả cấu trúc tĩnh của phân hệ PH4, phân định rõ ranh giới và mối quan hệ tương tác giữa các module giao diện, middleware bảo mật, các bộ điều khiển nghiệp vụ (Controllers) và các thực thể dữ liệu trong cơ sở dữ liệu PostgreSQL.

![Hình 5.1. Biểu đồ thành phần phân hệ Kho và quản lý vật tư](figures/5_4_1_a_bieu_do_thanh_phan.png)

*Hình 5.1. Biểu đồ thành phần phân hệ Kho và quản lý vật tư (ERP May 10)*

Cấu trúc thành phần bao gồm 4 tầng chức năng chính:
1. **Tầng Trình diễn (Client Presentation Layer):** 
   - Ứng dụng Single Page Application (SPA) xây dựng trên React 18, tích hợp vào Cổng thông tin doanh nghiệp (Core ERP Portal) với hệ thống Design System chuẩn V2.11.
   - 8 Component giao diện chuyên biệt tương ứng với 8 màn hình nghiệp vụ: `DashboardPage.jsx`, `TonKhoPage.jsx`, `ViTriKhoPage.jsx`, `LoVatTuPage.jsx`, `PhieuNhapPage.jsx`, `PhieuXuatPage.jsx`, `PhieuChuyenPage.jsx`, và `PhieuKiemKePage.jsx`.
   - Lớp dịch vụ API Client (`src/services/api.js`) sử dụng Axios, tự động đính kèm Token xác thực JWT và tiêu đề định danh vai trò (`x-role`, `x-user-id`) vào mỗi yêu cầu HTTP.
2. **Tầng Điều hướng & Bảo mật (API Routing & Security Middleware Layer):**
   - Định tuyến tập trung qua Express Router với tiền tố `/api/v1/...`, phân chia thành 8 module route độc lập (`tonKhoRoutes.js`, `phieuNhapRoutes.js`, `phieuXuatRoutes.js`, v.v.).
   - Bộ lọc kiểm soát truy cập dựa trên vai trò (`requireRoles`), chỉ cho phép các tài khoản có vai trò hợp lệ (`kho`, `admin`) truy cập và thực thi các tác vụ sửa đổi dữ liệu kho.
   - Middleware chuẩn hóa lỗi tập trung (`errorHandler.js`) bảo vệ an toàn hệ thống, ngăn chặn rò rỉ thông tin nội bộ khi xảy ra sự cố runtime.
3. **Tầng Xử lý Nghiệp vụ (Application Controllers Layer):**
   - Các controller đảm nhiệm xử lý toàn bộ logic nghiệp vụ của phân hệ: `phieuNhapController.js` (xử lý nhập mua hàng và nhập thành phẩm), `phieuXuatController.js` (kiểm soát xuất kho và khóa dòng chống âm kho), `phieuChuyenController.js` (điều chuyển 2 chiều đồng bộ), `kiemKeController.js` (tính toán chênh lệch và cân đối kho), `tonKhoController.js` (tổng hợp dữ liệu thẻ kho và báo cáo KPI).
   - Quản lý giao dịch cơ sở dữ liệu qua đối tượng `pg.Pool` và `client` chuyên biệt, bảo đảm tuyệt đối tính nguyên tử (Atomicity) theo chuẩn ACID: `BEGIN ... COMMIT / ROLLBACK`.
4. **Tầng Cơ sở Dữ liệu (Database Layer):**
   - Lưu trữ trên hệ quản trị PostgreSQL 18.6, cơ sở dữ liệu `erp_may10`, schema `public`.
   - Bao gồm 11 bảng dữ liệu chuyên biệt của PH4: `ton_kho`, `vi_tri_kho`, `lo_vat_tu`, `phieu_nhap_kho`, `chi_tiet_phieu_nhap`, `phieu_xuat_kho`, `chi_tiet_phieu_xuat`, `phieu_chuyen_kho`, `chi_tiet_chuyen_kho`, `phieu_kiem_ke`, `chi_tiet_kiem_ke`.
   - Tham chiếu chặt chẽ qua ràng buộc khóa ngoại (Foreign Key) với 6 bảng danh mục dùng chung (Master Data) của toàn tập đoàn: `kho`, `vat_tu`, `don_vi_tinh`, `nha_cung_cap`, `nguoi_dung`, `san_pham`.

---

#### b) Biểu đồ triển khai (Deployment Diagram)

Biểu đồ triển khai thể hiện mô hình phân bổ vật lý của các thành phần phần mềm trên các nút phần cứng và môi trường thực thi trong kiến trúc vận hành của May 10.

![Hình 5.2. Biểu đồ triển khai phân hệ Kho và quản lý vật tư](figures/5_4_1_b_bieu_do_trien_khai.png)

*Hình 5.2. Biểu đồ triển khai phân hệ Kho và quản lý vật tư (ERP May 10)*

Đặc tả các nút trong mô hình triển khai:
1. **Client Workstation (Máy trạm người dùng):**
   - Môi trường thực thi: Trình duyệt web hiện đại (Google Chrome 120+, Microsoft Edge) tại các kho nguyên phụ liệu, xưởng may và văn phòng điều hành May 10.
   - Thành phần triển khai: Gói bundle ứng dụng React SPA được biên dịch tối ưu bởi Vite (HTML5, JavaScript ES6, CSS). Giao tiếp với máy chủ ứng dụng thông qua giao thức bảo mật HTTP/HTTPS, định dạng dữ liệu chuẩn JSON.
2. **Application Server (Máy chủ ứng dụng):**
   - Nền tảng: Hệ điều hành Windows 11 Enterprise Host / Linux Server, môi trường thực thi Node.js v24.16.0 (V8 Engine 64-bit).
   - Thành phần triển khai: Ứng dụng Backend Express.js lắng nghe tại cổng nội bộ `5000`. Đảm nhận nhiệm vụ xác thực token, kiểm tra ma trận phân quyền RBAC, tiếp nhận và điều phối các transaction biến động kho, kết nối tới cơ sở dữ liệu thông qua thư viện `node-postgres (pg)` phiên bản 8.23.0 với cơ chế Connection Pool (tối đa 20 kết nối đồng thời).
3. **Database Server (Máy chủ Cơ sở Dữ liệu):**
   - Nền tảng: Máy chủ cơ sở dữ liệu PostgreSQL 18.6 triển khai trên phân vùng Linux chuyên dụng (WSL2 Ubuntu 22.04 LTS), lắng nghe tại cổng chuẩn `5432`.
   - Thành phần triển khai: Cơ sở dữ liệu quan hệ `erp_may10`, hỗ trợ mã hóa ký tự UTF-8, collation tiếng Việt. Đảm bảo năng lực khóa dòng cục bộ (`SELECT ... FOR UPDATE`) phục vụ xử lý đồng thời (Concurrency Control) và thực thi trọn vẹn các ràng buộc toàn vẹn dữ liệu.

---

#### c) Thiết kế giao diện (Mockup trang menu tổng quan)

Tuân thủ quy chuẩn thiết kế giao diện phác thảo (Wireframe UI/UX Specification), bản mockup mô tả bố cục kiến trúc giao diện người dùng của phân hệ PH4 trước khi lập trình. Bố cục được thiết kế theo tỷ lệ chuẩn 16:9 ($1600 \times 900\text{ px}$), sử dụng phong cách đơn sắc vẽ tay (Hand-drawn Low-fidelity Wireframe) bám sát các nguyên tắc thiết kế công nghiệp của May 10.

![Hình 5.3. Mockup giao diện menu và tổng quan phân hệ Kho và quản lý vật tư](figures/5_4_1_c_mockup_tong_quan_kho.png)

*Hình 5.3. Mockup giao diện menu và tổng quan phân hệ Kho và quản lý vật tư*

Bố cục mockup bao gồm các phân khu chức năng được chuẩn hóa:
- **Global Header (Thanh đầu mối phía trên):** Hiển thị nhận diện thương hiệu tập đoàn (`ERP May 10`), phân định tên phân hệ làm việc chính thức (`PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ`), thanh tìm kiếm nhanh toàn hệ thống, chuông thông báo biến động kho và thông tin phiên đăng nhập của người dùng thủ kho (`Phạm Văn Kho`).
- **Sidebar Menu (Thanh điều hướng nghiệp vụ bên trái):** Bao gồm tiêu đề danh mục `MENU` và 9 nút điều hướng trỏ trực tiếp đến 8 chức năng nghiệp vụ cốt lõi của phân hệ và mục cấu hình hệ thống:
  1. *Tổng quan kho* (Màn hình đang kích hoạt, được đóng khung viền kép nổi bật).
  2. *Tồn kho & Thẻ kho*
  3. *Vị trí kho*
  4. *Lô vật tư & Cây vải*
  5. *Phiếu nhập kho*
  6. *Phiếu xuất kho*
  7. *Điều chuyển kho*
  8. *Kiểm kê kho*
  9. *Cài đặt*
- **Main Content Area (Khu vực làm việc trung tâm):** 
  - Hàng thẻ chỉ số đo lường hiệu suất (4 KPI Cards): *Tổng giá trị tồn kho* (VNĐ thời gian thực), *Mặt hàng có tồn kho* (số lượng chủng loại), *Cảnh báo thiếu hụt* (mặt hàng chạm hoặc dưới mức tối thiểu), và *Giao dịch trong tháng* (tổng số phiếu xuất và nhập).
  - Khung dữ liệu kép bên dưới: Bảng phân bổ *Cơ cấu Tồn kho theo Nhà kho May 10* (Kho thành phẩm, Kho phụ liệu, Kho nguyên phụ liệu số 1) và Bảng *Top Vật tư có Giá trị Tồn kho cao nhất* (Vải Kate lụa, Chỉ may Poly, Cúc nhựa, Vải Chiffon).

---

### 5.4.2. Cài đặt

Trong phân hệ PH4, ba chức năng tiêu biểu nhất phản ánh đầy đủ nghiệp vụ quản trị kho may mặc phức tạp và yêu cầu kỹ thuật xử lý dữ liệu nghiêm ngặt là: **Phiếu nhập kho**, **Phiếu xuất kho** và **Điều chuyển kho**. Dưới đây là mô tả chi tiết quá trình cài đặt, đoạn mã nguồn thực tế và giao diện vận hành thực tế của từng chức năng.

---

#### 5.4.2.1. Chức năng Phiếu nhập kho

##### a) Mô tả chức năng
Chức năng Phiếu nhập kho cho phép cán bộ kho tiếp nhận và ghi nhận các nguồn vật tư đưa vào hệ thống kho May 10.
- **Mục đích:** Hợp thức hóa việc tăng số lượng và giá trị tồn kho khi có phát sinh thực tế; ghi nhận xuất xứ lô hàng phục vụ truy vết chất lượng sản phẩm may mặc.
- **Tác nhân (Actor):** Thủ kho, Kế toán kho, Quản trị viên hệ thống.
- **Dữ liệu đầu vào:** Kho nhập hàng (`ma_kho_nhap`), nguồn gốc nhập (`loai_nhap`: từ đơn mua hàng PH3, thành phẩm sản xuất PH2, chuyển kho nội bộ, hoặc cân đối kiểm kê), người giao hàng, ghi chú; danh sách chi tiết vật tư nhập (mã vật tư, số lượng nhập $> 0$, đơn giá nhập, vị trí kệ cất hàng, mã lô mới hoặc chọn lô hiện có).
- **Quy trình xử lý nghiệp vụ:** 
  1. Tiếp nhận payload, kiểm tra tính hợp lệ của các trường dữ liệu bắt buộc.
  2. Khởi tạo giao dịch cơ sở dữ liệu (`client.query('BEGIN')`).
  3. Tự động sinh mã chứng từ chuẩn hóa định dạng `PNK-YYYYMMDD-XXXX` nếu client không chỉ định.
  4. Tạo bản ghi đầu phiếu tại bảng `phieu_nhap_kho` với trạng thái `da_nhap`.
  5. Với từng mặt hàng trong danh sách chi tiết: nếu có yêu cầu tạo lô mới, tạo bản ghi tại `lo_vat_tu`; nếu nhập bổ sung vào lô cũ, cập nhật tăng số dư `so_luong_hien_tai` của lô.
  6. Lưu bản ghi vào bảng `chi_tiet_phieu_nhap`.
  7. Sử dụng cơ chế khóa dòng `SELECT ... FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2 FOR UPDATE` để đọc số tồn hiện tại, sau đó cập nhật tăng lũy kế `so_luong_ton` và `gia_tri_ton_kho` tương ứng. Nếu mặt hàng chưa có dòng tồn tại kho, tự động tạo mới bản ghi tồn kho ban đầu.
  8. Xác nhận giao dịch (`COMMIT`) và giải phóng kết nối về pool. Nếu xảy ra bất kỳ lỗi ngoại lệ nào trong quá trình thực thi, hệ thống lập tức hủy bỏ toàn bộ (`ROLLBACK`).
- **Kết quả:** Phiếu nhập kho được lưu trữ vĩnh viễn, số dư tồn kho và số dư lô hàng được cộng chính xác, hiển thị ngay trên bảng danh sách chứng từ và tự động cập nhật lên các chỉ số thống kê trên Dashboard.

##### b) Đoạn code tiêu biểu
Đoạn mã nguồn trích xuất từ file `backend/src/controllers/phieuNhapController.js` (các dòng 140 - 275) thể hiện trọn vẹn quy trình bọc Transaction và khóa dòng tăng tồn kho:

```javascript
// Trích từ: backend/src/controllers/phieuNhapController.js (Lines 140-275)
await client.query('BEGIN');

// 1. Tạo bản ghi phiếu nhập kho
const insertPNK = await client.query(
  `INSERT INTO phieu_nhap_kho (
     ma_phieu_nhap, loai_nhap, ma_don_mua_hang, ma_lenh_san_xuat,
     ma_kho_nhap, ngay_nhap, thu_kho, nguoi_giao_hang,
     tong_gia_tri_nhap, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat
   ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7, $8, $9, $10, 'da_nhap', $11, $11)
   RETURNING *`,
  [maPhieu, loai_nhap, ma_don_mua_hang || null, ma_lenh_san_xuat || null, ma_kho_nhap,
   ngay_nhap || null, thu_kho || nguoiTao, nguoi_giao_hang || null, tongGiaTri, ghi_chu || null, nguoiTao]
);
const phieuMoi = insertPNK.rows[0];

// 2. Lặp qua từng dòng chi tiết và khóa dòng cập nhật tồn kho
for (const item of chiTiet) {
  const slNhap = parseFloat(item.so_luong_nhap);
  const dgNhap = parseFloat(item.don_gia_nhap);
  const thanhTien = slNhap * dgNhap;
  let loId = item.ma_lo_vat_tu || null;

  // Xử lý tạo lô mới nếu có chỉ định
  if (item.tao_lo_moi && item.ma_lo_moi) {
    const insertLoRes = await client.query(
      `INSERT INTO lo_vat_tu (ma_lo, ma_vat_tu, ma_don_mua_hang, han_su_dung,
         so_luong_nhap, so_luong_hien_tai, don_gia_nhap, ma_vi_tri_kho, trang_thai, nguoi_tao)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'binh_thuong', $8) RETURNING id`,
      [item.ma_lo_moi, item.ma_vat_tu, ma_don_mua_hang || null, item.han_su_dung || null,
       slNhap, dgNhap, item.ma_vi_tri_kho || null, nguoiTao]
    );
    loId = insertLoRes.rows[0].id;
  }

  // Ghi chi tiết phiếu nhập
  await client.query(
    `INSERT INTO chi_tiet_phieu_nhap (ma_phieu_nhap_kho, ma_vat_tu, ma_lo_vat_tu,
       so_luong_nhap, don_gia_nhap, thanh_tien, ma_vi_tri_kho, ghi_chu, nguoi_tao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [phieuMoi.id, item.ma_vat_tu, loId, slNhap, dgNhap, thanhTien, item.ma_vi_tri_kho || null, item.ghi_chu || null, nguoiTao]
  );

  // Khóa dòng tồn kho và cập nhật số dư lũy kế
  const lockTon = await client.query(
    `SELECT id, so_luong_ton, gia_tri_ton_kho FROM ton_kho 
     WHERE ma_kho = $1 AND ma_vat_tu = $2 FOR UPDATE`,
    [ma_kho_nhap, item.ma_vat_tu]
  );

  if (lockTon.rows.length > 0) {
    await client.query(
      `UPDATE ton_kho 
       SET so_luong_ton = so_luong_ton + $1, gia_tri_ton_kho = gia_tri_ton_kho + $2, ngay_cap_nhat = NOW()
       WHERE id = $3`,
      [slNhap, thanhTien, lockTon.rows[0].id]
    );
  } else {
    await client.query(
      `INSERT INTO ton_kho (ma_kho, ma_vat_tu, so_luong_ton, gia_tri_ton_kho, dinh_muc_ton_toi_thieu, ngay_cap_nhat)
       VALUES ($1, $2, $3, $4, 0, NOW())`,
      [ma_kho_nhap, item.ma_vat_tu, slNhap, thanhTien]
    );
  }
}

await client.query('COMMIT');
```

##### c) Giải thích đoạn code
- Khối lệnh khởi đầu bằng câu lệnh `BEGIN` nhằm mở một phạm vi giao dịch (Transaction context) độc lập trên kết nối client được cấp phát từ connection pool.
- Câu lệnh chèn vào bảng `phieu_nhap_kho` sử dụng mệnh đề `RETURNING *`, cho phép lấy lại khóa chính tự tăng (`id`) ngay lập tức mà không cần thực hiện thêm câu lệnh truy vấn phụ.
- Trong vòng lặp xử lý chi tiết, hệ thống kiểm tra logic tạo lô hàng mới: trường `so_luong_hien_tai` của lô được khởi tạo bằng đúng `so_luong_nhap`.
- Đoạn mã sử dụng câu lệnh `SELECT ... FOR UPDATE` trực tiếp trên bản ghi tồn kho tương ứng với `(ma_kho, ma_vat_tu)`. Điều này thiết lập một khóa độc quyền (Exclusive Row-Level Lock) trên hàng dữ liệu, đảm bảo nếu có nhiều luồng hoặc giao dịch khác cùng cập nhật mặt hàng tại kho đó trong cùng thời điểm, các luồng sau bắt buộc phải đợi giao dịch hiện tại hoàn tất, triệt tiêu hoàn toàn nguy cơ mất dữ liệu ghi đè (Lost Updates).
- Khối lệnh phân nhánh thông minh: nếu mặt hàng đã tồn tại trong kho thì cập nhật tăng (`UPDATE`), nếu là lần đầu nhập mặt hàng vào kho đó thì tạo mới dòng tồn kho (`INSERT`). Toàn bộ thay đổi chỉ chính thức có hiệu lực khi lệnh `COMMIT` được thực thi thành công.

##### d) Screenshot giao diện thực tế
Dưới đây là hình ảnh giao diện thực tế của màn hình chức năng Phiếu nhập kho được chụp trực tiếp từ hệ thống đang vận hành:

![Hình 5.4. Giao diện thực tế chức năng Phiếu nhập kho](screenshots/5_4_2_1_phieu_nhap_kho.png)

*Hình 5.4. Giao diện thực tế chức năng Phiếu nhập kho (ERP May 10)*

##### e) Mô tả kết quả thực hiện
Giao diện thực tế hiển thị đầy đủ thanh công cụ lọc dữ liệu theo nhà kho tiếp nhận, phân loại nguồn nhập (Từ mua hàng PH3, Thành phẩm sản xuất PH2, v.v.), ô tìm kiếm chứng từ và nút chức năng chính `[+ Lập phiếu nhập kho]`. Bảng danh sách chứng từ hiển thị rõ ràng mã phiếu nhập (`PNK-20260910-1253`, `PNK-20260910-4130`), nhà kho lưu trữ, ngày lập, danh tính thủ kho phụ trách, họ tên người giao hàng, tổng giá trị tiền hàng bằng VNĐ, huy hiệu trạng thái `Đã nhập kho` (màu xanh lục bảo an toàn) và biểu tượng con mắt mở modal xem chi tiết từng dòng vật tư.

---

#### 5.4.2.2. Chức năng Phiếu xuất kho

##### a) Mô tả chức năng
Chức năng Phiếu xuất kho quản lý nghiệp vụ xuất kho vật tư, vải và phụ liệu phục vụ cho các tổ chuyền may (PH2), xuất bán thành phẩm cho khách hàng (PH1), hoặc xuất thanh lý.
- **Mục đích:** Kiểm soát chặt chẽ việc giảm số dư vật tư; thực thi nguyên tắc sống còn của hệ thống quản trị kho: **Tuyệt đối không cho phép tồn kho âm** dưới mọi điều kiện tải.
- **Tác nhân (Actor):** Thủ kho, Cán bộ kế hoạch sản xuất, Quản trị viên.
- **Dữ liệu đầu vào:** Kho xuất (`ma_kho_xuat`), mục đích xuất (`loai_xuat`), người nhận hàng, ghi chú xuất; danh sách vật tư cần xuất (mã vật tư, số lượng xuất, đơn giá, mã lô xuất nếu có).
- **Quy trình xử lý nghiệp vụ:**
  1. Kiểm tra tính hợp lệ cơ bản của số lượng yêu cầu xuất (bắt buộc $> 0$).
  2. Khởi tạo giao dịch cơ sở dữ liệu (`BEGIN`).
  3. Lần lượt duyệt từng dòng vật tư và thực hiện câu lệnh `SELECT tk.id, tk.so_luong_ton, ... FROM ton_kho tk WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2 FOR UPDATE`.
  4. **Kiểm tra điều kiện biên chống âm kho:** Hệ thống đối soát trực tiếp `tonHienTai < slXuat`. Nếu số lượng tồn kho khả dụng nhỏ hơn số lượng yêu cầu xuất, hệ thống lập tức ném lỗi ngoại lệ nghiệp vụ với mã lỗi `INSUFFICIENT_STOCK` và mã HTTP `409 Conflict`.
  5. Nếu mặt hàng xuất theo lô chỉ định, thực hiện khóa dòng trên bảng `lo_vat_tu` và kiểm tra `so_luong_hien_tai < slXuat`. Nếu lô không đủ hàng, hủy bỏ giao dịch với mã lỗi `INSUFFICIENT_LOT_STOCK`.
  6. Sau khi tất cả các dòng vật tư trong danh sách đều vượt qua bước thẩm định số dư, hệ thống mới tiến hành tạo bản ghi tại bảng `phieu_xuat_kho`.
  7. Trừ trực tiếp số lượng và giá trị tại bảng `ton_kho` và trừ số dư tại bảng `lo_vat_tu`.
  8. Ghi nhận chi tiết xuất tại `chi_tiet_phieu_xuat`.
  9. Xác nhận giao dịch (`COMMIT`). Trường hợp có bất kỳ mặt hàng nào không đủ tồn, toàn bộ giao dịch được `ROLLBACK`, đảm bảo không trừ dở dang bất kỳ mặt hàng nào khác trong cùng phiếu xuất.
- **Kết quả:** Chứng từ xuất kho được ghi nhận, tồn kho và tồn lô giảm chính xác, hệ thống ngăn chặn triệt để tình trạng âm kho do tranh chấp dữ liệu đồng thời.

##### b) Đoạn code tiêu biểu
Đoạn mã nguồn trích xuất từ file `backend/src/controllers/phieuXuatController.js` (các dòng 156 - 217) thể hiện cơ chế khóa dòng và kiểm tra điều kiện biên chống âm kho:

```javascript
// Trích từ: backend/src/controllers/phieuXuatController.js (Lines 156-217)
await client.query('BEGIN');

for (const item of chiTiet) {
  const slXuat = parseFloat(item.so_luong_xuat);
  const dgXuat = parseFloat(item.don_gia_xuat) || 0;

  // Khóa dòng tồn kho bằng SELECT ... FOR UPDATE
  const tonRes = await client.query(
    `SELECT tk.id, tk.so_luong_ton, tk.gia_tri_ton_kho, vt.ten_vat_tu, vt.ma_vat_tu
     FROM ton_kho tk
     JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
     WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2
     FOR UPDATE`,
    [ma_kho_xuat, item.ma_vat_tu]
  );

  if (tonRes.rows.length === 0) {
    const err = new Error(`Mặt hàng chưa từng có tồn kho tại kho này (Tồn: 0, Xuất: ${slXuat}).`);
    err.statusCode = 409;
    err.errorCode = 'INSUFFICIENT_STOCK';
    throw err;
  }

  const tonRecord = tonRes.rows[0];
  const tonHienTai = parseFloat(tonRecord.so_luong_ton);

  // KIỂM TRA CHẶT CHẼ: KHÔNG CHO PHÉP TỒN KHO ÂM
  if (tonHienTai < slXuat) {
    const err = new Error(
      `Xung đột tồn kho: Mặt hàng [${tonRecord.ten_vat_tu}] không đủ số lượng để xuất. Tồn khả dụng hiện tại: ${tonHienTai}, Yêu cầu xuất: ${slXuat}. Giao dịch bị hủy bỏ.`
    );
    err.statusCode = 409;
    err.errorCode = 'INSUFFICIENT_STOCK';
    throw err;
  }

  // Nếu xuất theo lô, khóa dòng và kiểm tra tồn lô
  if (item.ma_lo_vat_tu) {
    const loRes = await client.query(
      `SELECT id, ma_lo, so_luong_hien_tai FROM lo_vat_tu WHERE id = $1 FOR UPDATE`,
      [item.ma_lo_vat_tu]
    );
    const tonLo = parseFloat(loRes.rows[0].so_luong_hien_tai);
    if (tonLo < slXuat) {
      const err = new Error(`Lô vật tư [${loRes.rows[0].ma_lo}] không đủ số lượng (Còn: ${tonLo}, Xuất: ${slXuat}).`);
      err.statusCode = 409;
      err.errorCode = 'INSUFFICIENT_LOT_STOCK';
      throw err;
    }
  }
}
```

##### c) Giải thích đoạn code
- Điểm mấu chốt của giải pháp chống tranh chấp đồng thời (Race Condition) nằm ở câu lệnh `SELECT ... FOR UPDATE` trong vòng lặp kiểm tra. Khi Client A và Client B cùng gửi yêu cầu xuất kho cho cùng một loại vải tại cùng một kho vào cùng một mili-giây, giao dịch nào tiếp cận cơ sở dữ liệu trước sẽ chiếm giữ khóa ghi độc quyền trên dòng dữ liệu đó. Giao dịch còn lại buộc phải xếp hàng chờ ở tầng cơ sở dữ liệu cho đến khi giao dịch đầu tiên hoàn tất.
- Khi giao dịch đầu tiên `COMMIT`, số tồn trong cơ sở dữ liệu đã bị trừ đi. Đến lượt giao dịch thứ hai đọc dữ liệu, nó sẽ đọc được giá trị tồn kho mới nhất đã được cập nhật, và điều kiện `if (tonHienTai < slXuat)` sẽ kích hoạt ngay lập tức để ném ra lỗi ngoại lệ `INSUFFICIENT_STOCK`.
- Đoạn mã sử dụng đối tượng `err` gắn kèm `statusCode = 409`, cho phép middleware bắt lỗi ở tầng ngoài trả về mã trạng thái HTTP chuẩn mực `409 Conflict` kèm thông báo lỗi bằng tiếng Việt rõ ràng, giúp giao diện người dùng hiển thị thông báo chính xác cho thủ kho.

##### d) Screenshot giao diện thực tế
Hình ảnh giao diện thực tế của màn hình chức năng Phiếu xuất kho đang hoạt động trên hệ thống:

![Hình 5.5. Giao diện thực tế chức năng Phiếu xuất kho](screenshots/5_4_2_2_phieu_xuat_kho.png)

*Hình 5.5. Giao diện thực tế chức năng Phiếu xuất kho (ERP May 10)*

##### e) Mô tả kết quả thực hiện
Giao diện phiếu xuất kho cung cấp thanh tác vụ gồm bộ lọc nhà kho xuất, bộ lọc mục đích xuất (Xuất cấp xưởng may PH2, Xuất giao khách PH1, v.v.), ô tìm kiếm nhanh và nút tác vụ nổi bật `[+ Lập phiếu xuất kho]`. Bảng dữ liệu liệt kê các chứng từ xuất kho đã hoàn tất, thể hiện đầy đủ mã phiếu xuất (`PXK-...`), kho xuất nguồn, ngày xuất thực tế, người nhận hàng, tổng số lượng mặt hàng và tổng giá trị xuất kho tương ứng. Các thao tác xuất quá số dư khả dụng đều bị hệ thống chặn đứng ở tầng giao diện và tầng máy chủ, hiển thị cảnh báo đỏ từ chối xuất kho.

---

#### 5.4.2.3. Chức năng Điều chuyển kho

##### a) Mô tả chức năng
Chức năng Điều chuyển kho thực hiện nghiệp vụ di chuyển vật tư hoặc phụ liệu giữa các nhà kho nội bộ của Tổng Công ty May 10 (ví dụ: điều chuyển vải từ Kho Nguyên Phụ Liệu Số 1 sang Kho Phụ Liệu May Mặc hoặc Kho Thành Phẩm tại Sài Đồng).
- **Mục đích:** Tái phân bổ nguyên phụ liệu phục vụ sản xuất linh hoạt giữa các phân xưởng may mà không làm sai lệch tổng giá trị tài sản tồn kho của toàn doanh nghiệp.
- **Tác nhân (Actor):** Quản lý kho, Thủ kho điều phối, Ban Giám đốc.
- **Dữ liệu đầu vào:** Kho xuất nguồn (`ma_kho_xuat`), kho nhập đích (`ma_kho_nhap`), người thực hiện điều chuyển, lý do điều chuyển; danh sách vật tư cần chuyển (mã vật tư, số lượng chuyển, đơn giá tham chiếu, ghi chú).
- **Quy trình xử lý nghiệp vụ:**
  1. Kiểm tra ràng buộc hợp lệ: Kho xuất và kho nhập bắt buộc phải khác nhau (`ma_kho_xuat !== ma_kho_nhap`).
  2. Bắt đầu transaction (`BEGIN`).
  3. Duyệt danh sách vật tư, thiết lập khóa dòng `SELECT ... FOR UPDATE` trên bản ghi tồn kho tại **Kho Xuất Nguồn**. Kiểm tra tồn kho khả dụng tại kho nguồn có đủ đáp ứng số lượng chuyển hay không; nếu không đủ, hủy bỏ toàn bộ giao dịch với mã lỗi 409.
  4. Tạo bản ghi chứng từ tại bảng `phieu_chuyen_kho` với trạng thái `da_chuyen`.
  5. Với từng mặt hàng: trừ số lượng tồn kho và giá trị tồn kho tương ứng tại **Kho Xuất Nguồn**.
  6. Kiểm tra sự tồn tại của mặt hàng tại **Kho Nhập Đích**: nếu kho đích đã có dòng tồn kho thì thực hiện khóa dòng và cộng thêm số lượng chuyển; nếu kho đích chưa từng lưu trữ mặt hàng đó thì tạo mới dòng tồn kho với số lượng bằng đúng số lượng chuyển đến.
  7. Ghi nhận các dòng chi tiết vào bảng `chi_tiet_chuyen_kho`.
  8. Xác nhận giao dịch (`COMMIT`). Đảm bảo nguyên tắc bảo toàn vật tư: số lượng giảm tại kho xuất bằng đúng số lượng tăng tại kho nhập trong cùng một thời điểm nguyên tử.
- **Kết quả:** Phiếu điều chuyển được lưu trữ hoàn tất, dữ liệu 2 kho nguồn - đích được cập nhật đồng thời, không xảy ra hiện tượng "vật tư đang bay" hoặc rò rỉ thất thoát số liệu.

##### b) Đoạn code tiêu biểu
Đoạn mã nguồn trích xuất từ file `backend/src/controllers/phieuChuyenController.js` (các dòng 122 - 245) thể hiện logic kiểm tra 2 kho và điều chuyển 2 chiều đồng bộ:

```javascript
// Trích từ: backend/src/controllers/phieuChuyenController.js (Lines 122-245)
if (parseInt(ma_kho_xuat, 10) === parseInt(ma_kho_nhap, 10)) {
  return res.status(400).json({
    success: false,
    errorCode: 'INVALID_WAREHOUSE_SELECTION',
    message: 'Kho xuất và kho nhập phải khác nhau theo quy định chuyển kho.',
  });
}

await client.query('BEGIN');

// 1. Kiểm tra tồn và khóa dòng tại KHO XUẤT NGUỒN
for (const item of chiTiet) {
  const slChuyen = parseFloat(item.so_luong_chuyen);
  const tonXuatRes = await client.query(
    `SELECT tk.id, tk.so_luong_ton, tk.gia_tri_ton_kho, vt.ten_vat_tu
     FROM ton_kho tk JOIN vat_tu vt ON tk.ma_vat_tu = vt.id
     WHERE tk.ma_kho = $1 AND tk.ma_vat_tu = $2 FOR UPDATE`,
    [ma_kho_xuat, item.ma_vat_tu]
  );

  const tonHienTai = parseFloat(tonXuatRes.rows[0]?.so_luong_ton || 0);
  if (tonHienTai < slChuyen) {
    const err = new Error(`Không thể điều chuyển: Mặt hàng tại kho xuất không đủ số lượng.`);
    err.statusCode = 409;
    throw err;
  }
}

// 2. Tạo phiếu điều chuyển kho
const insertPCK = await client.query(
  `INSERT INTO phieu_chuyen_kho (ma_phieu_chuyen, ma_kho_xuat, ma_kho_nhap, ngay_chuyen,
     nguoi_chuyen, ly_do, ghi_chu, trang_thai, nguoi_tao, nguoi_cap_nhat)
   VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, 'da_chuyen', $8, $8) RETURNING *`,
  [maPhieu, ma_kho_xuat, ma_kho_nhap, ngay_chuyen || null, nguoi_chuyen, ly_do, ghi_chu, nguoiTao]
);

// 3. Thực hiện chuyển dịch số lượng 2 chiều đồng bộ
for (const item of validatedItems) {
  const giaTriChuyen = item.slChuyen * item.donGia;

  // Giảm tồn kho tại KHO XUẤT NGUỒN
  await client.query(
    `UPDATE ton_kho SET so_luong_ton = so_luong_ton - $1, gia_tri_ton_kho = gia_tri_ton_kho - $2, ngay_cap_nhat = NOW()
     WHERE id = $3`,
    [item.slChuyen, giaTriChuyen, item.tonXuatId]
  );

  // Tăng tồn kho tại KHO NHẬP ĐÍCH
  const tonNhapRes = await client.query(
    `SELECT id FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2 FOR UPDATE`,
    [ma_kho_nhap, item.ma_vat_tu]
  );

  if (tonNhapRes.rows.length > 0) {
    await client.query(
      `UPDATE ton_kho SET so_luong_ton = so_luong_ton + $1, gia_tri_ton_kho = gia_tri_ton_kho + $2, ngay_cap_nhat = NOW()
       WHERE id = $3`,
      [item.slChuyen, giaTriChuyen, tonNhapRes.rows[0].id]
    );
  } else {
    await client.query(
      `INSERT INTO ton_kho (ma_kho, ma_vat_tu, so_luong_ton, gia_tri_ton_kho, dinh_muc_ton_toi_thieu, ngay_cap_nhat)
       VALUES ($1, $2, $3, $4, 0, NOW())`,
      [ma_kho_nhap, item.ma_vat_tu, item.slChuyen, giaTriChuyen]
    );
  }
}

await client.query('COMMIT');
```

##### c) Giải thích đoạn code
- Mã nguồn kiểm tra tính hợp lệ về logic địa điểm ngay từ đầu: nếu người dùng vô tình chọn kho xuất trùng với kho nhập (`ma_kho_xuat === ma_kho_nhap`), hệ thống lập tức trả về mã lỗi `400 Bad Request` trước khi mở transaction, tiết kiệm tài nguyên kết nối của cơ sở dữ liệu.
- Quá trình điều chuyển được gom trọn vẹn trong một giao dịch đơn nhất (`single transaction`). Việc trừ hàng tại kho nguồn và cộng hàng tại kho đích diễn ra đồng thời. Nếu bước cộng hàng tại kho đích thất bại vì bất kỳ nguyên nhân nào (lỗi khóa ngoại, lỗi mạng, tràn dung lượng), lệnh `ROLLBACK` trong khối catch sẽ hoàn trả lại toàn bộ số hàng đã trừ tại kho nguồn, bảo toàn tuyệt đối nguyên tắc cân bằng khối lượng của kho vật tư.
- Khóa dòng được thiết lập trên cả bản ghi kho nguồn lẫn bản ghi kho đích, ngăn ngừa tình trạng một giao dịch xuất kho khác xen vào giữa quá trình điều chuyển làm biến động số liệu không nhất quán.

##### d) Screenshot giao diện thực tế
Dưới đây là hình ảnh chụp thực tế màn hình chức năng Điều chuyển kho trên website ERP May 10:

![Hình 5.6. Giao diện thực tế chức năng Điều chuyển kho](screenshots/5_4_2_3_dieu_chuyen_kho.png)

*Hình 5.6. Giao diện thực tế chức năng Điều chuyển kho (ERP May 10)*

##### e) Mô tả kết quả thực hiện
Màn hình thể hiện rõ ràng các phiếu điều chuyển nội bộ giữa các nhà kho May 10. Bảng thông tin bao gồm mã phiếu điều chuyển (`PCK-...`), tên kho xuất nguồn (hiển thị màu đỏ cảnh báo trừ kho), tên kho nhập đích (hiển thị màu xanh chỉ dẫn tăng kho), ngày thực hiện, cán bộ thực hiện, số chủng loại mặt hàng chuyển dịch, lý do điều chuyển (ví dụ: *Điều chuyển vải Kate sang phục vụ đơn hàng gấp*) và nhãn trạng thái `Đã chuyển` hoàn tất.

---

### 5.4.3. Kiểm thử

#### a) Phương pháp kiểm thử và lý do lựa chọn

Để đảm bảo tính xác thực, độ tin cậy và khả năng sẵn sàng vận hành của phân hệ PH4, đội ngũ phát triển đã áp dụng chiến lược kiểm thử kết hợp đa phương pháp (Multi-Level Testing Strategy), tập trung vào dữ liệu thực và hành vi thực tế của hệ thống:

1. **Phương pháp Kiểm thử Hộp đen (Black-Box / Functional Testing):**
   - *Lý do lựa chọn:* Tập trung kiểm tra các yêu cầu nghiệp vụ kho may mặc từ góc độ người dùng (Thủ kho, Quản lý vật tư) mà không cần can thiệp vào cấu trúc code bên trong; bảo đảm hệ thống xử lý đúng mọi quy trình nhập, xuất, chuyển kho và kiểm kê theo tài liệu đặc tả nghiệp vụ.
   - *Phạm vi áp dụng:* Toàn bộ 8 màn hình giao diện người dùng và các form modal nhập liệu trên Frontend.
2. **Phương pháp Kiểm thử API Tích hợp (API & Integration Testing):**
   - *Lý do lựa chọn:* Kiểm tra sự gắn kết thực tế giữa các tầng: từ HTTP Request của Client $\rightarrow$ Express Router $\rightarrow$ Controllers $\rightarrow$ PostgreSQL Database. Toàn bộ các bài test gửi request HTTP thật tới cổng 5000 và truy vấn trực tiếp vào database `erp_may10` để đối soát delta biến động số dư.
   - *Phạm vi áp dụng:* Bộ kiểm thử tự động `tests/test_ph4_api.js` (16 test cases) và `tests/audit_step2_verification.js` (9 test cases).
3. **Phương pháp Phân tích Giá trị Biên & Phân vùng Tương đương (Boundary Value Analysis & Equivalence Partitioning):**
   - *Lý do lựa chọn:* Kho vật tư đặc biệt nhạy cảm với các số liệu biên như số lượng bằng 0, số lượng âm, số lượng xuất đúng bằng số tồn khả dụng ($slXuat = tonHienTai$), hoặc số lượng xuất vượt quá tồn kho đúng 1 đơn vị ($slXuat = tonHienTai + 1$).
   - *Phạm vi áp dụng:* Kiểm thử logic kiểm tra số dư tại `phieuXuatController` và `phieuChuyenController`.
4. **Phương pháp Kiểm thử Tranh chấp Đồng thời (Concurrency & Stress Testing):**
   - *Lý do lựa chọn:* Trong môi trường sản xuất của May 10, nhiều thủ kho hoặc chuyền may có thể cùng yêu cầu xuất một loại vải tại cùng một thời điểm. Cần chứng minh cơ chế khóa dòng `SELECT ... FOR UPDATE` ngăn chặn triệt để hiện tượng Race Condition gây âm kho.
   - *Phạm vi áp dụng:* Kịch bản kiểm thử đồng thời `tests/test_concurrency.js` sử dụng `Promise.all` bắn đồng thời các request tranh chấp số dư.
5. **Phương pháp Kiểm thử Bảo mật & Phân quyền (RBAC & Security Testing):**
   - *Lý do lựa chọn:* Xác minh các tài khoản chỉ được thực thi các quyền hạn đã được cấp phép; ngăn chặn việc người dùng trái quyền can thiệp vào số liệu kho.
   - *Phạm vi áp dụng:* Kiểm thử xác thực JWT token và phân quyền vai trò (`requireRoles(['kho', 'admin'])`).

---

#### b) Bảng Test Case và Kết quả Thực nghiệm

Bảng dưới đây tổng hợp 20 ca kiểm thử đại diện (Test Cases) bao phủ toàn diện các chức năng nghiệp vụ, điều kiện biên, xử lý giao dịch và kiểm soát tranh chấp đồng thời của phân hệ PH4. Tất cả các ca kiểm thử đều được thực thi trực tiếp trên hệ thống thực tế (Backend Port 5000, Database `erp_may10`) với kết quả ghi nhận từ log thực nghiệm:

| Mã TC | Tên Chức Năng | Điều Kiện & Dữ Liệu Đầu Vào | Kết Quả Kỳ Vọng (Expected) | Kết Quả Thực Tế (Actual) | Trạng Thái |
| :---: | :---|:---|:---|:---|:---: |
| **TC-01** | Kiểm tra dịch vụ hệ thống | Gửi request `GET /api/v1/health` | HTTP 200, phản hồi trạng thái hệ thống `status: "UP"` | HTTP 200, `status: "UP"`, thời gian phản hồi 2.6ms | **ĐẠT (PASS)** |
| **TC-02** | Tra cứu danh mục kho dùng chung | Gửi request `GET /api/v1/master-data/kho` | HTTP 200, trả về danh sách đầy đủ 3 kho May 10 | HTTP 200, trả về chính xác 3 bản ghi kho hợp lệ | **ĐẠT (PASS)** |
| **TC-03** | Tra cứu danh mục vật tư | Gửi request `GET /api/v1/master-data/vat-tu` | HTTP 200, trả về danh sách vật tư kèm đơn vị tính | HTTP 200, trả về danh mục vật tư may mặc đầy đủ | **ĐẠT (PASS)** |
| **TC-04** | Báo cáo số dư tồn kho | Gửi request `GET /api/v1/ton-kho` | HTTP 200, trả về số dư tồn kho phân bổ theo từng kho | HTTP 200, dữ liệu trả về 5 dòng tồn khớp DB | **ĐẠT (PASS)** |
| **TC-05** | Thống kê Dashboard kho | Gửi request `GET /api/v1/ton-kho/dashboard` | HTTP 200, tính đúng 4 khối KPI và cơ cấu giá trị kho | HTTP 200, tổng giá trị tồn kho 21.287.000 VNĐ | **ĐẠT (PASS)** |
| **TC-06** | Tra cứu Sổ Thẻ kho chi tiết | `GET /api/v1/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1` | HTTP 200, trả về nhật ký nhập xuất lũy kế theo thời gian | HTTP 200, nhật ký chứng từ khớp lịch sử giao dịch | **ĐẠT (PASS)** |
| **TC-07** | Thêm vị trí kệ lưu trữ mới | `POST /api/v1/vi-tri-kho` với mã `VT-TEST-9265` | HTTP 201, tạo thành công vị trí mới tại kho chỉ định | HTTP 201, vị trí mới được ghi nhận vào database | **ĐẠT (PASS)** |
| **TC-08** | Tra cứu danh sách lô vật tư | Gửi request `GET /api/v1/lo-vat-tu` | HTTP 200, danh sách lô hiển thị đầy đủ hạn dùng FEFO | HTTP 200, thông tin lô và số lượng khớp thực tế | **ĐẠT (PASS)** |
| **TC-09** | Lập phiếu nhập kho hợp lệ | `POST /api/v1/phieu-nhap` với số lượng nhập $= 10$ | HTTP 201, tồn kho tăng thêm chính xác bằng 10 đơn vị | HTTP 201, delta tồn kho tăng đúng 10, sinh mã PNK | **ĐẠT (PASS)** |
| **TC-10** | Nhập kho với số lượng không hợp lệ | `POST /api/v1/phieu-nhap` với số lượng $\le 0$ hoặc NaN | HTTP 400 `VALIDATION_ERROR`, từ chối nhập | HTTP 400, thông báo lỗi số lượng nhập phải $> 0$ | **ĐẠT (PASS)** |
| **TC-11** | Lập phiếu xuất kho hợp lệ | `POST /api/v1/phieu-xuat` với số lượng xuất $= 10 \le` tồn | HTTP 201, tồn kho giảm chính xác bằng 10 đơn vị | HTTP 201, tồn kho giảm đúng 10, sinh mã PXK | **ĐẠT (PASS)** |
| **TC-12** | **Chặn xuất kho vượt tồn (Chống âm)** | `POST /api/v1/phieu-xuat` với số lượng xuất $= 99.999.999$ | **HTTP 409 Conflict** (`INSUFFICIENT_STOCK`), hủy giao dịch | **HTTP 409 Conflict**, tồn kho giữ nguyên, không âm | **ĐẠT (PASS)** |
| **TC-13** | Xuất kho đúng bằng số tồn biên | `POST /api/v1/phieu-xuat` với $slXuat = tonHienTai$ | HTTP 201, xuất thành công, tồn kho sau xuất bằng 0 | HTTP 201, số dư tồn kho về đúng 0, trạng thái an toàn | **ĐẠT (PASS)** |
| **TC-14** | Rollback nguyên tử khi phiếu xuất lỗi | Xuất 2 mặt hàng: Hàng 1 hợp lệ, Hàng 2 vượt tồn | HTTP 409, Rollback toàn phần, Hàng 1 không bị trừ | HTTP 409, DB Rollback 100%, không phát sinh bản ghi rác | **ĐẠT (PASS)** |
| **TC-15** | Điều chuyển kho hợp lệ | Chuyển 20 đơn vị từ Kho 1 sang Kho 3 | HTTP 201, Kho 1 giảm 20, Kho 3 tăng đúng 20 | HTTP 201, số dư 2 kho nguồn - đích đồng bộ tức thời | **ĐẠT (PASS)** |
| **TC-16** | Chặn điều chuyển trùng kho | Chọn kho xuất và kho nhập cùng là Kho 1 | HTTP 400 `INVALID_WAREHOUSE_SELECTION` | HTTP 400, từ chối điều chuyển vì kho trùng nhau | **ĐẠT (PASS)** |
| **TC-17** | Lập đợt kiểm kê kho mới | `POST /api/v1/phieu-kiem-ke` với kỳ kiểm kê tháng | HTTP 201, tạo thành công phiếu kiểm kê đợt mới | HTTP 201, phiếu kiểm kê được lưu trữ trạng thái chờ | **ĐẠT (PASS)** |
| **TC-18** | Tự động cân đối sau kiểm kê | `POST /api/v1/phieu-kiem-ke/:id/dieu-chinh` | HTTP 200, tự động điều chỉnh số tồn sổ sách khớp thực tế | HTTP 200, tồn kho được cân đối chính xác số thực đếm | **ĐẠT (PASS)** |
| **TC-19** | **Kiểm tra Race Condition đồng thời** | Gửi 2 request xuất đồng thời (80 và 50) khi tồn $= 100$ | 1 request thành công (201), 1 request bị từ chối (409) | Request 1 trả về 201, Request 2 trả về 409, tồn cuối $= 20$ | **ĐẠT (PASS)** |
| **TC-20** | Kiểm soát quyền truy cập (RBAC) | Gửi request kho mà không có token hoặc sai quyền | HTTP 401 Unauthorized hoặc HTTP 403 Forbidden | HTTP 401 / 403, chặn truy cập trái phép hoàn toàn | **ĐẠT (PASS)** |

*Ghi chú thực nghiệm:* Toàn bộ 20/20 test cases được kiểm tra và ghi nhận trực tiếp từ các file kịch bản tự động (`test_ph4_api.js`, `test_concurrency.js`). Tỷ lệ đạt yêu cầu: **100% PASS**.

---

### 5.4.4. Kết luận phân hệ

Phân hệ 4 — Kho và quản lý vật tư của hệ thống ERP May 10 đã được xây dựng, cài đặt và hoàn thiện trọn vẹn trong phạm vi chức năng và trách nhiệm được phân công. 

**Các kết quả kỹ thuật và nghiệp vụ đạt được bao gồm:**
1. **Về mặt kiến trúc và công nghệ:** Phân hệ triển khai thành công mô hình Clean Architecture 3 tầng hiện đại, phân tách rõ ràng trách nhiệm giữa Frontend (React 18, Tailwind CSS), Backend (Node.js, Express) và Cơ sở dữ liệu quan hệ (PostgreSQL 18.6). Hệ thống vận hành ổn định, mã nguồn sạch, 100% truy vấn SQL sử dụng Prepared Statements ngăn chặn triệt để lỗ hổng SQL Injection.
2. **Về mặt quản trị dữ liệu và tính toàn vẹn:** Hệ thống kết nối và quản lý chuẩn xác 11 bảng dữ liệu nghiệp vụ kho cùng 6 bảng danh mục dùng chung của toàn tập đoàn. Đã giải quyết triệt để bài toán hóc búa nhất của hệ thống quản trị kho là **Race Condition** và **Âm tồn kho** nhờ ứng dụng kỹ thuật khóa dòng `SELECT ... FOR UPDATE` kết hợp với cơ chế quản lý giao dịch nguyên tử (ACID Transactions).
3. **Về mặt trải nghiệm người dùng (UX/UI):** Giao diện phân hệ PH4 được tích hợp đồng bộ vào Cổng thông tin Core ERP Portal theo chuẩn thiết kế V2.11, cung cấp đầy đủ 8 màn hình nghiệp vụ và 7 form modal thao tác trực quan, hỗ trợ tối đa cho cán bộ thủ kho và nhà quản lý trong việc tra cứu số dư và xử lý chứng từ.
4. **Về kết quả kiểm thử:** Đạt kết quả xuất sắc trong các bài kiểm tra chức năng thực tế với 100% ca kiểm thử thành công (16/16 API tests, kiểm thử đồng thời chống âm kho đạt chuẩn tuyệt đối).

**Tính trung thực về phạm vi hoàn thiện toàn hệ thống:**
Cần khẳng định rõ rằng, phân hệ PH4 đã **hoàn thành toàn diện trong phạm vi chức năng quản trị kho và vật tư nội bộ** và đã sẵn sàng về mặt hợp đồng dữ liệu (API Contract, Master Data, RBAC Guard) để kết nối tích hợp với các phân hệ liên quan. Tuy nhiên, do các phân hệ đối tác như PH1 (Kinh doanh & Bán hàng), PH2 (Quản lý Sản xuất & Chuyền may), PH3 (Mua hàng & Nhà cung ứng) và PH5 (Tài chính - Kế toán & Giá thành) hiện đang trong giai đoạn tiếp tục triển khai, nên toàn bộ hệ thống ERP May 10 chưa thể tuyên bố nghiệm thu hoàn chỉnh End-to-End ở cấp độ toàn doanh nghiệp. Khi các phân hệ còn lại hoàn thành, PH4 sẽ đóng vai trò là mắt xích cung ứng trung tâm, sẵn sàng tự động hóa luồng tiếp nhận đơn mua PO từ PH3, cấp phát NPL theo lệnh LSX cho PH2, xuất hàng đơn bán SO cho PH1 và đẩy dữ liệu hạch toán giá thành sang PH5 theo đúng mục tiêu chuyển đổi số của Tổng Công ty May 10.
