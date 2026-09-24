# PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ (ERP MAY 10)
## 04. HƯỚNG DẪN VẬN HÀNH 8 MÀN HÌNH GIAO DIỆN

---

### Môi trường truy cập: `http://localhost:5173`

---

### Màn hình 1: Tổng quan (Dashboard)
* **Chức năng:** Hiển thị tức thời 4 thẻ chỉ số KPI quan trọng nhất của kho (Tổng giá trị tồn kho VNĐ, Tổng số mã vật tư lưu kho, Số mặt hàng đang thiếu hụt dưới mức an toàn, Tổng số lượt nhập/xuất trong tháng).
* **Biểu đồ & Bảng:**
  * Cơ cấu giá trị tồn kho phân bổ theo từng Nhà kho May 10.
  * Danh sách Top 5 mặt hàng có giá trị tồn kho lớn nhất toàn hệ thống.

---

### Màn hình 2: Báo cáo Tồn kho & Sổ Thẻ kho
* **Chức năng:** Tra cứu chi tiết số lượng và giá trị tồn của từng mặt hàng tại từng nhà kho.
* **Bộ lọc đa chiều:**
  * Lọc theo Nhà kho lưu trữ.
  * Lọc theo Loại vật tư (vải chính, vải lót, chỉ may, cúc, khóa kéo, phụ liệu).
  * Lọc "Chỉ xem cảnh báo thiếu hụt" để lên kế hoạch đặt mua thêm.
  * Ô tìm kiếm nhanh theo mã hoặc tên vật tư.
* **Sổ Thẻ kho:** Bấm nút **"Thẻ kho"** tại từng dòng để mở modal xem toàn bộ nhật ký biến động Nhập - Xuất theo dòng thời gian, chi tiết chứng từ và mã lô.

---

### Màn hình 3: Quản lý Vị trí kho (Kệ / Ô / Tầng)
* **Chức năng:** Số hóa bản đồ không gian nhà kho. Quản lý từng ô, kệ, tầng, sức chứa tối đa và trạng thái (trống, có hàng, đã đầy).
* **Thao tác:**
  * Bấm nút **"Thêm vị trí mới"** để khai báo kệ/tầng trong kho.
  * Xóa vị trí (hệ thống tự động chặn xóa nếu đang có lô vật tư lưu trữ tại đó).

---

### Màn hình 4: Quản lý Lô vật tư & Cây vải
* **Chức năng:** Quản lý theo lô vật tư, cây vải nhập về từ nhà cung cấp.
* **Cơ chế FEFO/FIFO:** Hệ thống tự động phân loại hạn dùng của từng lô hàng:
  * **Còn hạn:** Màu xanh bình thường.
  * **Sắp hết hạn (dưới 30 ngày):** Huy hiệu màu vàng cảnh báo.
  * **Quá hạn:** Huy hiệu màu đỏ cảnh báo không được xuất vào chuyền may.
* **Thao tác:** Khai báo lô hàng mới kèm đơn giá nhập và vị trí kệ cất.

---

### Màn hình 5: Phiếu Nhập kho
* **Chức năng:** Quản lý toàn bộ quá trình nhập nguyên phụ liệu từ đơn mua hàng PH3, nhập thành phẩm may hoàn thiện từ PH2, hoặc nhập chuyển kho.
* **Thao tác:** Bấm **"Lập phiếu nhập kho"**:
  * Chọn kho nhập, loại nhập, người giao hàng.
  * Thêm nhiều dòng vật tư, số lượng, đơn giá, vị trí cất.
  * Sau khi bấm xác nhận, hệ thống tự động cộng dồn số lượng vào bảng `ton_kho` và lô vật tư.

---

### Màn hình 6: Phiếu Xuất kho
* **Chức năng:** Lập lệnh xuất kho cấp phát cho xưởng may (PH2), xuất bán cho khách hàng (PH1), hoặc xuất chuyển kho.
* **Kiểm soát tức thời:** Form tự động hiển thị số lượng tồn khả dụng hiện tại của từng mặt hàng tại kho xuất đã chọn. Nếu người dùng nhập số lượng vượt quá tồn, giao diện sẽ cảnh báo màu vàng. Khi gửi request, backend sẽ kích hoạt khóa dòng `FOR UPDATE` bảo vệ kho, nếu tranh chấp sẽ hiển thị thông báo Toast lỗi 409 Conflict.

---

### Màn hình 7: Phiếu Chuyển kho nội bộ
* **Chức năng:** Điều chuyển nguyên vật liệu giữa các kho May 10 (ví dụ: Chuyển vải từ Kho Nguyên Phụ Liệu Số 1 sang Kho Thành Phẩm May 10).
* **Validation:** Bắt buộc 2 kho phải khác nhau. Khi lập phiếu, hệ thống đồng thời trừ tồn kho tại kho xuất và cộng tồn kho tại kho nhập.

---

### Màn hình 8: Phiếu Kiểm kê & Điều chỉnh cân đối kho
* **Chức năng:** Khởi tạo các kỳ kiểm kê định kỳ tháng/quý.
* **Quy trình:**
  1. Thủ kho/Ban kiểm kê lập phiếu và nhập số lượng kiểm đếm thực tế.
  2. Bảng đối soát tự động tính toán chênh lệch (+ / -) và giá trị chênh lệch theo đơn giá chuẩn.
  3. Bấm nút **"Cân Đối & Tự Động Điều Chỉnh Tồn Kho"**: Hệ thống tự động cập nhật số tồn sổ sách khớp 100% với số thực tế và đổi trạng thái sang "Đã điều chỉnh".
