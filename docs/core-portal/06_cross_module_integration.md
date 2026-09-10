# KẾ HOẠCH & ĐIỂM TÍCH HỢP LIÊN PHÂN HỆ (CROSS-MODULE INTEGRATION)
**TỔNG CÔNG TY MAY 10 - CTCP**

---

## 1. Trục Dữ Liệu Tập Trung (Single Source of Truth)

Toàn bộ hệ sinh thái ERP May 10 được xây dựng xung quanh phân hệ lõi **PH4 — Kho & Quản lý vật tư**. Dưới đây là các điểm tiếp xúc kỹ thuật giữa PH4 và 4 phân hệ còn lại:

```text
       ┌────────────────────────┐
       │   PH1: BÁN HÀNG        │
       │   (don_ban_hang)       │
       └───────────┬────────────┘
                   │
                   ▼ (Yêu cầu giữ chỗ & Xuất thành phẩm)
       ┌────────────────────────┐         (Nhập mua NPL)        ┌────────────────────────┐
       │   PH4: KHO & VẬT TƯ    │ ◄─────────────────────────────┤   PH3: MUA HÀNG        │
       │   (ton_kho, vi_tri_kho)│                               │   (don_mua_hang)       │
       └───────────┬────────────┘                               └────────────────────────┘
                   │ ▲
 (Xuất cấp NPL)    │ │ (Nhập thành phẩm may)
                   ▼ │
       ┌───────────┴────────────┐
       │   PH2: SẢN XUẤT (BOM)  │
       │   (lenh_san_xuat)      │
       └───────────┬────────────┘
                   │
                   ▼ (Bút toán kho tự động & Giá thành)
       ┌────────────────────────┐
       │   PH5: TÀI CHÍNH       │
       │   (but_toan_tong_hop)  │
       └────────────────────────┘
```

---

## 2. Chi Tiết Điểm Tích Hợp

### 2.1. Tích Hợp PH4 với PH1 (Bán Hàng)
* **Bảng CSDL:** `don_ban_hang` ➔ `phieu_xuat_kho` (cột `ma_don_ban_hang`).
* **Nghiệp vụ:** Khi kinh doanh ký hợp đồng may mặc và phát hành Đơn bán hàng, hệ thống kiểm tra tồn kho tại `ton_kho`. Khi giao hàng cho khách, tạo Phiếu xuất kho loại `giao_khach`.

### 2.2. Tích Hợp PH4 với PH2 (Sản Xuất & BOM)
* **Bảng CSDL:** `lenh_san_xuat` ➔ `phieu_xuat_kho` (cột `ma_lenh_san_xuat`), `phieu_nhap_kho` (cột `ma_lenh_san_xuat`).
* **Nghiệp vụ:**
  1. *Cấp phát nguyên liệu:* Dựa trên định mức BOM, hệ thống sinh đề nghị xuất kho vải, chỉ may, cúc áo cho chuyền may.
  2. *Nhập kho thành phẩm:* Khi chuyền may hoàn tất KCS, lập Phiếu nhập kho loại `thanh_pham_san_xuat`.

### 2.3. Tích Hợp PH4 với PH3 (Mua Hàng & Nhà Cung Cấp)
* **Bảng CSDL:** `don_mua_hang` ➔ `phieu_nhap_kho` (cột `ma_don_mua_hang`), `nha_cung_cap` (cột `ma_nha_cung_cap`).
* **Nghiệp vụ:** Khi nhà cung ứng giao vải tới cổng kho, thủ kho tra cứu mã PO và lập Phiếu nhập kho loại `tu_mua_hang`. Tự động cập nhật số dư tồn kho và ghi nhận thẻ kho.

### 2.4. Tích Hợp PH4 với PH5 (Tài Chính – Kế Toán)
* **Bảng CSDL:** `phieu_nhap_kho`, `phieu_xuat_kho` ➔ `but_toan_tong_hop`, `chi_tiet_but_toan`.
* **Nghiệp vụ:** Mọi phiếu nhập/xuất kho được duyệt sẽ tự động kích hoạt tạo bút toán hạch toán Nợ/Có (TK 152, 155, 156, 331, 621, 632) mà kế toán không cần phải gõ lại bằng tay.
