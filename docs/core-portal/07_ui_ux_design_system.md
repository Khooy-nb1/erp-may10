# DESIGN SYSTEM DOANH NGHIỆP MAY 10 (MAY 10 CORPORATE UI/UX)
**TỔNG CÔNG TY MAY 10 - CTCP**

---

## 1. Bản Sắc Nhận Diện Thương Hiệu May 10

Hệ thống ERP May 10 được thiết kế theo tiêu chuẩn công nghiệp hiện đại, mang đậm bản sắc văn hóa doanh nghiệp của Tổng Công ty May 10.

### Bảng Màu Chủ Đạo (Corporate Color Palette):

| Tên Token | Mã Màu Hex | Ứng Dụng Trong Hệ Thống |
| :--- | :--- | :--- |
| `may10-primary` | `#8B1E2D` | Màu đỏ đô May 10 truyền thống. Dùng cho Logo, Header Accent, Button chính, Active Nav Item. |
| `may10-dark` | `#151515` | Màu đen đậm cho tiêu đề chính, chữ nổi bật, thanh trạng thái. |
| `may10-bg` | `#F7F7F5` | Nền canvas nhẹ nhàng, chống lóa mắt cho nhân viên văn phòng và thủ kho khi làm việc liên tục. |
| `may10-success` | `#238636` | Trạng thái hoàn thành, chỉ số thực tế, nhập kho thành công. |
| `may10-warning` | `#D97706` | Cảnh báo tồn kho dưới định mức, phân hệ đang chuẩn bị kết nối. |
| `may10-danger` | `#DC2626` | Báo động hết hàng, chặn xuất âm, lỗi từ chối quyền truy cập (403). |

---

## 2. Quy Chuẩn Typography & Spacing

* **Font Family:** `Inter`, `Roboto`, `-apple-system`, `sans-serif` hỗ trợ tiếng Việt đầy đủ với dấu thanh chuẩn.
* **Tỷ lệ hiển thị (Data Density):** Giao diện được tối ưu mật độ dữ liệu (High Density) cho môi trường doanh nghiệp dệt may, kích thước chữ 11px - 14px giúp hiển thị nhiều dòng chứng từ mà không bị rối.
* **Mã chứng từ & Số liệu:** Luôn sử dụng font `font-mono` với độ đậm `font-bold` để tránh nhầm lẫn giữa các ký tự tương đồng (O và 0, l và 1).

---

## 3. Đáp Ứng Đa Thiết Bị (Responsive Breakpoints)

* **Desktop ($\ge 1024$px):** Sidebar cố định 64 (256px), Header trải rộng, bảng biểu 6 - 8 cột hiển thị đầy đủ.
* **Tablet (768px - 1023px):** Bảng có thanh cuộn ngang mượt mà, lưới 2 cột cho các thẻ phân hệ.
* **Mobile ($< 768$px):** Sidebar chuyển sang dạng Drawer trượt có backdrop làm mờ, Header thu gọn, các thẻ KPI tự động xếp chồng 1 cột.
