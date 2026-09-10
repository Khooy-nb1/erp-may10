# PHÂN HỆ 4: KHO & QUẢN LÝ VẬT TƯ (ERP MAY 10)
## 05. ĐẶC TẢ LIÊN KẾT LIÊN PHÂN HỆ (CROSS-MODULE INTEGRATION)

---

### 1. Kiến trúc liên kết dữ liệu giữa 5 Phân hệ ERP May 10

```
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  PH1: Bán hàng & Khách hàng  │          │    PH3: Mua hàng & NCC       │
│  - don_ban_hang (ma_don_ban) │          │  - don_mua_hang (ma_don_mua) │
└──────────────┬───────────────┘          └──────────────┬───────────────┘
               │                                         │
               │ Xuất giao khách                         │ Nhập kho khi NCC giao
               ▼                                         ▼
   ┌────────────────────────────────────────────────────────────┐
   │            PH4: KHO & QUẢN LÝ VẬT TƯ (May 10)              │
   │  - phieu_nhap_kho, chi_tiet_phieu_nhap                     │
   │  - phieu_xuat_kho, chi_tiet_phieu_xuat                     │
   │  - phieu_chuyen_kho, phieu_kiem_ke                         │
   │  - ton_kho, vi_tri_kho, lo_vat_tu                          │
   └──────────────▲──────────────────────────────┬──────────────┘
                  │                              │
  Nhập thành phẩm │ Xuất cấp NVL                 │ Dữ liệu xuất/nhập/tồn
  sau KCS         │ xưởng may                    │ phục vụ tính giá thành
                  │                              ▼
┌─────────────────┴────────────┐          ┌──────────────────────────────┐
│  PH2: Sản xuất & Hoạch định  │          │   PH5: Tài chính - Kế toán   │
│  - lenh_san_xuat (ma_lenh)   │          │  - nhat_ky_hach_toan         │
│  - ket_qua_san_xuat          │          │  - gia_thanh_san_pham        │
└──────────────────────────────┘          └──────────────────────────────┘
```

---

### 2. Chi tiết điểm tích hợp với từng Phân hệ

#### 1. Liên kết với PH1 (Bán hàng & Quản lý khách hàng):
* **Bảng liên kết:** `phieu_xuat_kho.ma_don_ban_hang` $\rightarrow$ `don_ban_hang.id`.
* **Quy trình nghiệp vụ:** Khi nhân viên bán hàng chốt đơn hàng và chuyển trạng thái giao hàng, thủ kho lập Phiếu xuất kho với `loai_xuat = 'giao_khach'`, chọn `ma_don_ban_hang` tương ứng để xuất hàng thành phẩm may mặc giao cho khách.
* **API tra cứu:** `GET /api/v1/master-data/cross-module` cung cấp danh sách đơn bán hàng đang sẵn sàng xuất kho.

#### 2. Liên kết với PH2 (Sản xuất & Hoạch định nhu cầu nguyên phụ liệu):
* **Bảng liên kết 1 (Xuất NVL):** `phieu_xuat_kho.ma_lenh_san_xuat` $\rightarrow$ `lenh_san_xuat.id`.
  * Khi xưởng may triển khai lệnh sản xuất, thủ kho lập phiếu xuất với `loai_xuat = 'xuat_san_xuat'`, xuất vải và phụ liệu cấp cho chuyền may.
* **Bảng liên kết 2 (Nhập thành phẩm):** `phieu_nhap_kho.ma_lenh_san_xuat` $\rightarrow$ `lenh_san_xuat.id` và `ket_qua_san_xuat.ma_phieu_nhap_kho` $\rightarrow$ `phieu_nhap_kho.id`.
  * Sau khi KCS kiểm tra thành phẩm may mặc đạt chuẩn, bộ phận sản xuất bàn giao thành phẩm vào kho với `loai_nhap = 'thanh_pham_san_xuat'`, tăng số lượng tồn thành phẩm.

#### 3. Liên kết với PH3 (Mua hàng & Quản lý nhà cung cấp):
* **Bảng liên kết 1 (Đơn mua):** `phieu_nhap_kho.ma_don_mua_hang` $\rightarrow$ `don_mua_hang.id`.
  * Khi nhà cung cấp giao vật tư theo hợp đồng, thủ kho đối chiếu đơn mua hàng và lập phiếu nhập kho với `loai_nhap = 'tu_mua_hang'`.
* **Bảng liên kết 2 (Lô vật tư):** `lo_vat_tu.ma_don_mua_hang` $\rightarrow$ `don_mua_hang.id` và `lo_vat_tu.ma_nha_cung_cap` $\rightarrow$ `nha_cung_cap.id`.
  * Từng cây vải và kiện phụ liệu được đánh mã lô gắn liền với mã nhà cung cấp để phục vụ truy xuất nguồn gốc chất lượng.

#### 4. Liên kết với PH5 (Tài chính - Kế toán & Giá thành):
* **Dữ liệu cung cấp:**
  * Bảng `ton_kho`: Cung cấp số lượng và giá trị tồn kho tại mọi thời điểm để kế toán lập Bảng cân đối kế toán (Tài khoản 152 - Nguyên vật liệu, 155 - Thành phẩm).
  * Bảng `chi_tiet_phieu_nhap` và `chi_tiet_phieu_xuat`: Là chứng từ gốc để phân hệ 5 tự động hạch toán định khoản kế toán (Nợ TK 621, Có TK 152) và tính toán chi phí giá thành sản phẩm may mặc theo phương pháp bình quân gia quyền.
