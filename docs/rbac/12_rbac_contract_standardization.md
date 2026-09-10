# BÁO CÁO CHUẨN HÓA HỢP ĐỒNG PHÂN QUYỀN RBAC (TIẾNG VIỆT)
## RBAC CONTRACT STANDARDIZATION — VIETNAMESE ROLE & DB STANDARD
**TỔNG CÔNG TY MAY 10 - CTCP**  
**Mã tài liệu:** `12_rbac_contract_standardization.md`  
**Ngày thực hiện:** 10 Tháng 09 Năm 2026  
**Cơ quan thực hiện:** Ban Kiến trúc Hệ thống & An ninh Thông tin May 10 ERP  
**Phạm vi áp dụng:** Phân hệ lõi PH4 và các phân hệ phát triển mới PH1, PH2, PH3, PH5  
**Nguyên tắc tối cao:** DOCUMENTATION ONLY — ZERO SOURCE CODE / DB MODIFICATION

---

## MỤC LỤC
1. [HIỆN TRẠNG RBAC CONTRACT VÀ NGUYÊN TẮC BẢO VỆ CƠ SỞ DỮ LIỆU](#1-hiện-trạng-rbac-contract-và-nguyên-tắc-bảo-vệ-cơ-sở-dữ-liệu)
2. [CÁC ĐIỂM BẤT ĐỒNG NHẤT LỊCH SỬ ĐÃ ĐƯỢC LÀM RÕ (PREVIOUS INCONSISTENCY)](#2-các-điểm-bất-đồng-nhất-lịch-sử-đã-được-làm-rõ-previous-inconsistency)
3. [BỘ VAI TRÒ DOANH NGHIỆP CHÍNH THỨC (FINAL CANONICAL ROLE SET)](#3-bộ-vai-trò-doanh-nghiệp-chính-thức-final-canonical-role-set)
4. [ÁNH XẠ VAI TRÒ SANG PHÂN HỆ VÀ TRUY CẬP CHÉO (ROLE → MODULE MAPPING)](#4-ánh-xạ-vai-trò-sang-phân-hệ-và-truy-cập-chéo-role--module-mapping)
5. [QUY ƯỚC MÃ ĐẶC QUYỀN TIẾNG VIỆT (PERMISSION CONVENTION)](#5-quy-ước-mã-đặc-quyền-tiếng-việt-permission-convention)
6. [CHUẨN ĐẶT TÊN CƠ SỞ DỮ LIỆU TIẾNG VIỆT (DATABASE NAMING STANDARD)](#6-chuẩn-đặt-tên-cơ-sở-dữ-liệu-tiếng-việt-database-naming-standard)
7. [BẢO VỆ TÍNH TƯƠNG THÍCH TUYỆT ĐỐI CỦA PHÂN HỆ PH4 (PH4 COMPATIBILITY)](#7-bảo-vệ-tính-tương-thích-tuyệt-đối-của-phân-hệ-ph4-ph4-compatibility)
8. [KỶ LUẬT PHÁT TRIỂN CHO CÁC ĐỘI NGŨ PH1/PH2/PH3/PH5 (MODULE TEAM RULES)](#8-kỷ-luật-phát-triển-cho-các-đội-ngũ-ph1ph2ph3ph5-module-team-rules)
9. [RANH GIỚI ĐÓNG BĂNG ĐỐI VỚI CENTRAL IAM / PHASE 2 (PHASE 2 BOUNDARY)](#9-ranh-giới-đóng-băng-đối-với-central-iam--phase-2-phase-2-boundary)
10. [DANH MỤC TÀI LIỆU ĐÃ ĐIỀU CHỈNH (FILES CHANGED)](#10-danh-mục-tài-liệu-đã-điều-chỉnh-files-changed)
11. [CAM KẾT CÁC VÙNG TUYỆT ĐỐI NGUYÊN VẸN (FILES EXPLICITLY UNCHANGED)](#11-cam-kết-các-vùng-tuyệt-đối-nguyên-vẹn-files-explicitly-unchanged)
12. [KẾT QUẢ KIỂM CHỨNG TOÀN DIỆN (VERIFICATION RESULT)](#12-kết-quả-kiểm-chứng-toàn-diện-verification-result)
13. [PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)](#13-phán-quyết-cuối-cùng-final-verdict)

---

## 1. HIỆN TRẠNG RBAC CONTRACT VÀ NGUYÊN TẮC BẢO VỆ CƠ SỞ DỮ LIỆU

Hệ thống ERP Tổng Công ty May 10 hiện đang vận hành trên cơ sở dữ liệu PostgreSQL 18.6 (`erp_may10`), schema `public`, bao gồm 41 bảng dữ liệu được thiết kế và lưu trữ với quy chuẩn **định danh 100% Tiếng Việt** (snake_case).

Trong bảng người dùng (`nguoi_dung`), cột vai trò (`vai_tro`) lưu trữ các mã vai trò tiếng Việt đã đi vào hoạt động thực tế. Phân hệ lõi **PH4 (Kho & Quản lý vật tư)** đã nghiệm thu và vận hành ổn định dựa trên tài khoản thủ kho mang `vai_tro = 'kho'` và quản trị viên mang `vai_tro = 'admin'`.

> [!IMPORTANT]
> **NGUYÊN TẮC BẤT BIẾN:**  
> Tuyệt đối không chuyển đổi Database, bảng dữ liệu, hoặc RBAC hiện tại sang tiếng Anh. Toàn bộ tài liệu quy chuẩn kỹ thuật dành cho các nhóm phân hệ mới (PH1, PH2, PH3, PH5) phải phản ánh chính xác cấu trúc thực tế của hệ thống hiện tại.

---

## 2. CÁC ĐIỂM BẤT ĐỒNG NHẤT LỊCH SỬ ĐÃ ĐƯỢC LÀM RÕ (PREVIOUS INCONSISTENCY)

Trong quá trình rà soát đối chiếu tài liệu giữa các giai đoạn phân tích và triển khai, Ban Kiến trúc ghi nhận sự xuất hiện của hai luồng định danh:
1. **Luồng Khảo sát / Đề xuất Lịch sử (Historical Audit Proposals):** Một số tài liệu khảo sát sơ bộ (như `04_rbac_contract_proposal.md`, `roleMapping.js` adapter) đã tạm thời liệt kê bộ role tiếng Anh (`ADMIN`, `SALES`, `PRODUCTION`, `PURCHASING`, `WAREHOUSE`, `WAREHOUSE_MANAGER`, `ACCOUNTING`) như một phương án chuẩn hóa quốc tế dự kiến cho tương lai xa.
2. **Luồng Hiện Trạng Thực Tế Cơ Sở Dữ Liệu:** Bảng `nguoi_dung` trong CSDL PostgreSQL thực tế lưu trữ: `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`. Hệ thống hoàn toàn không có role `warehouse_manager`.

**Hành động chuẩn hóa chính thức:**  
Ban Kiến trúc Hệ thống xác nhận bộ role tiếng Anh là **Đề xuất khảo sát lịch sử — KHÔNG PHẢI là hợp đồng phân quyền của CSDL và KHÔNG ĐƯỢC PHÉP sử dụng làm role code trong bất kỳ module nào**. Tài liệu `ERP_MODULE_DEVELOPMENT_CONTRACT.md` đã được chỉnh sửa đồng bộ để loại bỏ hoàn toàn sự hiểu nhầm về "hai bộ role song song".

---

## 3. BỘ VAI TRÒ DOANH NGHIỆP CHÍNH THỨC (FINAL CANONICAL ROLE SET)

Toàn bộ hệ thống May 10 ERP chỉ công nhận đúng **6 vai trò doanh nghiệp chính thức**:

| Role Code | Tên nghiệp vụ | Phạm vi phân hệ | Thẩm quyền cốt lõi |
|---|---|:---:|---|
| **`admin`** | Quản trị hệ thống | Toàn ERP | Toàn quyền kiểm soát, cấu hình hệ thống, quản lý người dùng và phê duyệt tối cao |
| **`ban_hang`** | Bán hàng | PH1 | Quản lý khách hàng, báo giá, hợp đồng, đơn bán hàng (SO), tra cứu tồn kho |
| **`san_xuat`** | Sản xuất | PH2 | Định mức kỹ thuật (BOM), kế hoạch sản xuất, lệnh sản xuất (LSX), tra cứu tồn kho NPL |
| **`mua_hang`** | Mua hàng | PH3 | Quản lý nhà cung cấp, yêu cầu mua sắm, đơn mua hàng (PO), tra cứu tồn kho NPL |
| **`kho`** | Kho & Quản lý vật tư | PH4 | Quản lý kho vải, NPL, lập và duyệt phiếu nhập, xuất, chuyển kho, kiểm kê cân đối |
| **`ke_toan`** | Tài chính – Kế toán & Giá thành | PH5 | Sổ cái, bút toán kho tự động, công nợ phải thu/trả, giá thành sản phẩm may mặc |

> [!CAUTION]
> Tuyệt đối không thêm role `warehouse_manager`. Mọi quyền hạn quản lý kho thuộc thẩm quyền của vai trò `kho` và `admin`.

---

## 4. ÁNH XẠ VAI TRÒ SANG PHÂN HỆ VÀ TRUY CẬP CHÉO (ROLE → MODULE MAPPING)

### 4.1. Phân Định Quyền Sở Hữu Phân Hệ (Module Ownership)
- `admin` ➔ Sở hữu toàn bộ hệ thống.
- `ban_hang` ➔ Sở hữu chính phân hệ **PH1: Bán hàng & Khách hàng**.
- `san_xuat` ➔ Sở hữu chính phân hệ **PH2: Quản lý Sản xuất & Định mức BOM**.
- `mua_hang` ➔ Sở hữu chính phân hệ **PH3: Mua hàng & Quản lý Nhà cung cấp**.
- `kho` ➔ Sở hữu chính phân hệ **PH4: Kho & Quản lý vật tư**.
- `ke_toan` ➔ Sở hữu chính phân hệ **PH5: Tài chính – Kế toán & Giá thành**.

### 4.2. Nguyên Tắc Phân Quyền Xuyên Phân Hệ (Cross-Module Access by Permission)
Hệ thống **không áp dụng cơ chế cô lập cứng (silo)**. Việc kiểm soát quyền truy cập dựa trên **Mã đặc quyền (Permission)**:
- Chuyên viên `ban_hang`, kỹ sư `san_xuat`, cán bộ `mua_hang` đều được cấp quyền `kho.view` để tra cứu số dư tồn kho thời gian thực.
- Kế toán viên `ke_toan` được cấp quyền xem chứng từ của PH1, PH3, PH4 để đối soát và hạch toán tự động.
- Backend phân quyền dựa trên `requirePermission([permission_code])`, hoàn toàn không dựa trên giả định mỗi role chỉ được vào một trang.

---

## 5. QUY ƯỚC MÃ ĐẶC QUYỀN TIẾNG VIỆT (PERMISSION CONVENTION)

Cú pháp phân quyền chuẩn tắc của hệ thống:
```text
[ten_module_tieng_viet].[hanh_dong]
```

### Danh Mục Mã Quyền Chuẩn:
- **Dùng chung:** `dashboard.view`.
- **PH1 — Bán hàng:** `ban_hang.view`, `ban_hang.create`, `ban_hang.update`, `ban_hang.delete`, `ban_hang.approve`.
- **PH2 — Sản xuất:** `san_xuat.view`, `san_xuat.create`, `san_xuat.update`, `san_xuat.approve`.
- **PH3 — Mua hàng:** `mua_hang.view`, `mua_hang.create`, `mua_hang.update`, `mua_hang.approve`.
- **PH4 — Kho & Vật tư:** `kho.view`, `kho.nhap`, `kho.xuat`, `kho.chuyen`, `kho.kiem_ke`.
  *(Tương thích ngược: Hệ thống adapter Phase 1 duy trì alias `warehouse.*` để phục vụ các test suite hiện hành).*
- **PH5 — Kế toán:** `ke_toan.view`, `ke_toan.create`, `ke_toan.update`, `ke_toan.approve`.
- **Quản trị hệ thống:** `admin.users`, `admin.roles`, `admin.permissions`.

---

## 6. CHUẨN ĐẶT TÊN CƠ SỞ DỮ LIỆU TIẾNG VIỆT (DATABASE NAMING STANDARD)

- **Database:** `erp_may10` (PostgreSQL 18.6).
- **Schema:** `public`.
- **Ngôn ngữ thực thể:** 100% Tiếng Việt, chữ thường, không dấu, phân cách bằng dấu gạch dưới (`snake_case`).
- **Danh sách bảng hiện hữu cốt lõi:**
  `nguoi_dung`, `don_vi_tinh`, `kho`, `nha_cung_cap`, `san_pham`, `vat_tu`, `vi_tri_kho`, `lo_vat_tu`, `ton_kho`, `phieu_nhap_kho`, `phieu_xuat_kho`, `phieu_chuyen_kho`, `phieu_kiem_ke`, `chi_tiet_phieu_nhap`, `chi_tiet_phieu_xuat`, `chi_tiet_phieu_chuyen`, `chi_tiet_phieu_kiem_ke`.
- **Yêu cầu bắt buộc đối với PH1/PH2/PH3/PH5:**  
  Các bảng mới tạo thêm (ví dụ: `don_ban_hang`, `lenh_san_xuat`, `don_mua_hang`, `but_toan_tong_hop`) bắt buộc phải đặt tên bằng tiếng Việt, thiết lập Foreign Key tham chiếu đến các bảng Master Data tiếng Việt hiện hữu. Tuyệt đối không đổi CSDL sang tiếng Anh.

---

## 7. BẢO VỆ TÍNH TƯƠNG THÍCH TUYỆT ĐỐI CỦA PHÂN HỆ PH4 (PH4 COMPATIBILITY)

Phân hệ PH4 (Kho & Quản lý vật tư) là trung tâm chuỗi cung ứng May 10, đang vận hành hoàn hảo với:
- 8 màn hình nghiệp vụ trực quan dưới `ModuleHeader`.
- 16/16 API tests đỗ 100%.
- Kiểm thử tranh chấp đồng thời (`SELECT ... FOR UPDATE`) đỗ 100%.
- Kiểm thử phân quyền vai trò `kho` và `admin` đỗ 100% (27/27 test cases).

**Cam kết bất biến đối với PH4:**
- Giữ nguyên vai trò `kho` và `admin`, không đổi thành `WAREHOUSE` hay `ADMIN`.
- Không can thiệp route `/warehouse/*`, controller, database, logic trừ kho, khóa dòng hay frontend của PH4.
- Các module mới khi tích hợp với kho bắt buộc phải sử dụng các API REST hiện hữu của PH4.

---

## 8. KỶ LUẬT PHÁT TRIỂN CHO CÁC ĐỘI NGŨ PH1/PH2/PH3/PH5 (MODULE TEAM RULES)

Các nhóm phát triển PH1, PH2, PH3, PH5 phải tuân thủ 8 quy tắc cấm kỵ:
1. ❌ Không tự tạo màn hình đăng nhập riêng.
2. ❌ Không tự tạo Header hoặc Sidebar riêng.
3. ❌ Không tự tạo role code riêng hoặc role tiếng Anh (`SALES`, `PRODUCTION`, `PURCHASING`, `ACCOUNTING`).
4. ❌ Không tự tạo role `warehouse_manager`.
5. ❌ Không tự đổi quy ước đặt tên quyền sang tiếng Anh (`sales.*`, `production.*`...).
6. ❌ Không tự đổi tên bảng, cột cơ sở dữ liệu sang tiếng Anh.
7. ❌ Không sửa mã nguồn, CSDL hay API của PH4.
8. ❌ Không sửa đổi Core UI tokens của V2.11.

---

## 9. RANH GIỚI ĐÓNG BĂNG ĐỐI VỚI CENTRAL IAM / PHASE 2 (PHASE 2 BOUNDARY)

Kế hoạch xây dựng hệ thống định danh tập trung (Central IAM / Single Sign-On / OAuth2 / OpenID Connect) là **phạm vi của Phase 2 (tương lai)**.
- Kế hoạch Phase 2 **hoàn toàn không phải là lý do** để các nhóm tự ý đổi vai trò hay bảng CSDL hiện tại sang tiếng Anh.
- Khi bước vào Phase 2, nếu kiến trúc Enterprise yêu cầu một bộ định danh quốc tế trừu tượng, Ban Kiến trúc sẽ tự xây dựng lớp adapter trung gian mà **không làm thay đổi cấu trúc bảng `nguoi_dung` và role tiếng Việt của CSDL hiện hữu**.

---

## 10. DANH MỤC TÀI LIỆU ĐÃ ĐIỀU CHỈNH (FILES CHANGED)

Chỉ có đúng **1 file tài liệu quy chuẩn** được điều chỉnh nội dung trong đợt chuẩn hóa này:

| File | Đường dẫn | Nội dung điều chỉnh |
|---|---|---|
| `ERP_MODULE_DEVELOPMENT_CONTRACT.md` | `E:\ERP\docs\ERP_MODULE_DEVELOPMENT_CONTRACT.md` | Chuẩn hóa 100% bộ 6 Role tiếng Việt (`admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan`); loại bỏ role `warehouse_manager`; chuẩn hóa Permission tiếng Việt; nhấn mạnh CSDL tiếng Việt; bổ sung kỷ luật module team và ranh giới Phase 2. |

---

## 11. CAM KẾT CÁC VÙNG TUYỆT ĐỐI NGUYÊN VẸN (FILES EXPLICITLY UNCHANGED)

Ban Kiến trúc Hệ thống xác nhận và cam kết các phân vùng kỹ thuật sau **HOÀN TOÀN KHÔNG BỊ THAY ĐỔI**:

- `frontend/src/`: **0 file bị sửa** (Toàn bộ component, context, router, layout nguyên vẹn).
- `backend/src/`: **0 file bị sửa** (Toàn bộ middleware, controllers, routes, config nguyên vẹn).
- `backend/tests/`: **0 file bị sửa** (Bộ 16 API test, Concurrency test, 27 RBAC test nguyên vẹn).
- `database/`: **0 migration, 0 schema change** (PostgreSQL `erp_may10` 41 bảng nguyên vẹn).
- Phân hệ PH4: **100% nguyên vẹn**.
- Core Portal: **100% nguyên vẹn**.

---

## 12. KẾT QUẢ KIỂM CHỨNG TOÀN DIỆN (VERIFICATION RESULT)

| Tiêu chí kiểm tra | Kết quả thẩm định | Ghi chú |
|---|:---:|---|
| **Database role naming = Vietnamese** | **PASS** | Bảng `nguoi_dung` lưu trữ `admin`, `ban_hang`, `san_xuat`, `mua_hang`, `kho`, `ke_toan` |
| **Contract role naming = Vietnamese** | **PASS** | Hợp đồng chỉ công nhận duy nhất 6 role tiếng Việt trên |
| **PH4 role naming = Vietnamese** | **PASS** | PH4 vận hành chuẩn mực với role `kho` và `admin` |
| **Core Portal role naming = Vietnamese** | **PASS** | Header, Sidebar, AuthContext sử dụng đồng bộ 6 vai trò tiếng Việt |
| **Permission convention thống nhất** | **PASS** | Cú pháp `[module_tieng_viet].[action]` được áp dụng toàn diện |
| **Không còn 2 canonical role set** | **PASS** | Bộ role tiếng Anh cũ được phân loại rõ là đề xuất khảo sát lịch sử |
| **Không có warehouse_manager** | **PASS** | Đã loại bỏ hoàn toàn khỏi hợp đồng phân quyền hiện tại |
| **Không yêu cầu đổi DB sang English** | **PASS** | Xác lập chuẩn CSDL tiếng Việt (snake_case) bắt buộc cho mọi phân hệ |
| **Central IAM đánh dấu FUTURE** | **PASS** | Ghi rõ là phạm vi Phase 2, không can thiệp CSDL hiện tại |
| **Source code & Database thay đổi** | **ZERO (0%)** | 100% là tài liệu quy chuẩn, không can thiệp code/DB |

---

## 13. PHÁN QUYẾT CUỐI CÙNG (FINAL VERDICT)

```text
======================================================================
                         FINAL VERDICT
     [ RBAC CONTRACT CORRECTED — READY FOR MODULE HANDOVER ]
======================================================================
 1. Hợp đồng phát triển ERP May 10 đã được chuẩn hóa thống nhất theo
    bộ 6 vai trò tiếng Việt: admin, ban_hang, san_xuat, mua_hang, kho, ke_toan.
 2. Khớp 100% với cấu trúc bảng nguoi_dung và cơ sở dữ liệu erp_may10.
 3. Loại bỏ hoàn toàn role warehouse_manager và các role tiếng Anh cũ.
 4. Bảo toàn nguyên vẹn 100% tính tương thích và sự ổn định của phân hệ PH4.
 5. Zero Source Code Change — Zero Database Change.
 6. Tài liệu chính thức sẵn sàng bàn giao cho các nhóm PH1, PH2, PH3, PH5.
======================================================================
```
