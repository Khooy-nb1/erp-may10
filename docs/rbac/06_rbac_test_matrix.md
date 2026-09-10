# 06 — MA TRẬN KIỂM THỬ HỒI QUY RBAC (TEST MATRIX)

## 1. Bảng Kịch Bản Kiểm Thử Quyền Người Dùng (Role Test Matrix)

| Test Case | Vai Trò Đăng Nhập | Thao Tác Kiểm Thử | Endpoint / Route | Kết Quả Mong Đợi | Trạng Thái Hiện Tại |
|:---|:---|:---|:---|:---:|:---:|
| **TC-01** | ADMIN | Xem tất cả phân hệ | `/sales`, `/warehouse`, `admin/*` | HTTP 200 / Render đầy đủ | ✅ PASS |
| **TC-02** | ADMIN | Lập phiếu nhập kho | `POST /api/v1/phieu-nhap` | HTTP 201 Created | ✅ PASS |
| **TC-03** | WAREHOUSE (`kho`) | Xem phân hệ kho | `/warehouse` | HTTP 200 / Render kho | ✅ PASS |
| **TC-04** | WAREHOUSE (`kho`) | Lập phiếu xuất kho | `POST /api/v1/phieu-xuat` | HTTP 201 Created | ✅ PASS |
| **TC-05** | WAREHOUSE (`kho`) | Truy cập quản trị user | `/admin/users` | HTTP 403 Forbidden | ✅ PASS |
| **TC-06** | WAREHOUSE (`kho`) | Truy cập ma trận quyền | `/admin/permissions` | HTTP 403 Forbidden | ❌ **FAIL (Lọt route)** |
| **TC-07** | SALES (`ban_hang`) | Xem phân hệ bán hàng | `/sales` | HTTP 200 / Render PH1 | ✅ PASS |
| **TC-08** | SALES (`ban_hang`) | Xem tồn kho (tra cứu) | `/warehouse?tab=ton-kho` | HTTP 200 / Được xem tồn | ✅ PASS |
| **TC-09** | SALES (`ban_hang`) | Lập phiếu nhập kho | `POST /api/v1/phieu-nhap` | HTTP 403 Forbidden | ✅ PASS (Bị chặn) |
| **TC-10** | PRODUCTION (`san_xuat`) | Xem phân hệ sản xuất | `/production` | HTTP 200 / Render PH2 | ✅ PASS |
| **TC-11** | PRODUCTION (`san_xuat`) | Tạo vị trí kho | `POST /api/v1/vi-tri-kho` | HTTP 403 Forbidden | ✅ PASS (Bị chặn) |
| **TC-12** | PURCHASING (`mua_hang`) | Xem phân hệ mua hàng | `/purchasing` | HTTP 200 / Render PH3 | ✅ PASS |
| **TC-13** | PURCHASING (`mua_hang`) | Xuất kho cấp phát | `POST /api/v1/phieu-xuat` | HTTP 403 Forbidden | ✅ PASS (Bị chặn) |
| **TC-14** | ACCOUNTING (`ke_toan`) | Xem phân hệ kế toán | `/accounting` | HTTP 200 / Render PH5 | ✅ PASS |
| **TC-15** | ACCOUNTING (`ke_toan`) | Điều chuyển kho | `POST /api/v1/phieu-chuyen` | HTTP 403 Forbidden | ✅ PASS (Bị chặn) |
| **TC-16** | KHÔNG ĐĂNG NHẬP | Gọi API xuất kho | `POST /api/v1/phieu-xuat` | HTTP 401 Unauthorized | ❌ **FAIL (Bị gán kho)** |
| **TC-17** | KHO GIẢ MẠO ADMIN | Gửi header `x-role: admin` | `POST /api/v1/vi-tri-kho` | HTTP 403 Forbidden | ❌ **FAIL (Leo quyền thành công)** |
| **TC-18** | ROLE TIẾNG ANH | Gửi header `x-role: warehouse`| `POST /api/v1/phieu-nhap` | HTTP 201 Created | ❌ **FAIL (Bị 403 do lệch mã)** |

---

## 2. Tiêu Chí Nghiệm Thu Cho Giai Đoạn Triển Khai Tiếp Theo
- [ ] 100% các Test Case trên đều đạt kết quả mong đợi.
- [ ] Header `x-role` không còn khả năng tự phong quyền.
- [ ] Request nặc danh nhận đúng mã HTTP 401.
- [ ] Role tiếng Anh và tiếng Việt được ánh xạ thông suốt, không làm đứt gãy PH4.
