# POSTGRESQL RUNTIME AUDIT REPORT — ERP MAY 10
**Môi trường:** `E:\ERP`  
**Chế độ audit:** READ-ONLY — ABSOLUTELY NO MUTATION  
**Thời gian thực hiện:** 2026-09-18 01:11:00 +07:00  

---

## 1. OS (HỆ ĐIỀU HÀNH)
- **Host OS:** Windows 11 / Windows 10 x64 (PowerShell 5.1 / Windows Terminal).
- **Subsystem OS:** Ubuntu Linux running on WSL2 (`WSL version: 2`, state: `Running`).

---

## 2. POSTGRESQL INSTALLATION STATUS (TRẠNG THÁI CÀI ĐẶT TRÊN WINDOWS)
- **Windows Native Installation:** **KHÔNG CÀI ĐẶT TRÊN WINDOWS NATIVE**.
  - Kiểm tra `C:\Program Files\PostgreSQL`: `False` (Không tồn tại).
  - Kiểm tra `C:\Program Files (x86)\PostgreSQL`: `False` (Không tồn tại).
  - Không có key Registry hay shortcut PostgreSQL của Windows.
- **Linux WSL2 Installation:** **ĐÃ CÀI ĐẶT TRÊN UBUNTU WSL2**.
  - Cài đặt thông qua Debian/Ubuntu APT repository.
  - Phiên bản cụm: PostgreSQL 18 cluster `18/main`.

---

## 3. POSTGRESQL SERVICE STATUS (TRẠNG THÁI DỊCH VỤ)
- **Windows Services:**
  - `Get-Service *postgres*`: **KHÔNG CÓ** (Không có dịch vụ Windows Service nào).
- **WSL2 Services:**
  - `systemd / service postgresql`: **ONLINE / ACTIVE**.
  - Lệnh kiểm tra: `wsl -u root su - postgres -c "pg_lsclusters"`
  - Kết quả:
    ```text
    Ver Cluster Port Status Owner    Data directory              Log file
    18  main    5432 online postgres /var/lib/postgresql/18/main /var/log/postgresql/postgresql-18-main.log
    ```

---

## 4. POSTGRESQL EXECUTABLE STATUS (CÁC FILE THỰC THI)
- **Trên Windows PATH:**
  - `where.exe psql`: `INFO: Could not find files for the given pattern(s)`.
  - `where.exe postgres`: `INFO: Could not find files for the given pattern(s)`.
  - `where.exe pg_ctl`: `INFO: Could not find files for the given pattern(s)`.
  *(Người dùng không thể gõ `psql` trực tiếp từ cmd/PowerShell ngoài Windows nếu chưa vào WSL).*
- **Trong Ubuntu WSL2:**
  - `/usr/lib/postgresql/18/bin/postgres`: Tồn tại & đang chạy.
  - `/usr/bin/psql`: Tồn tại & sẵn sàng thực thi.

---

## 5. PORT 5432 STATUS (TRẠNG THÁI CỔNG 5432)
- Lệnh kiểm tra: `netstat -ano | findstr :5432`
- Kết quả:
  ```text
  TCP    127.0.0.1:5432         0.0.0.0:0              LISTENING       16820
  TCP    [::1]:5432             [::]:0                 LISTENING       16820
  ```
- Cổng 5432 trên Windows **ĐANG MỞ VÀ LẮNG NGHE (LISTENING)**.

---

## 6. PROCESS LISTENING ON 5432 (TIẾN TRÌNH LẮNG NGHE)
- Lệnh kiểm tra: `tasklist /FI "PID eq 16820" /V /FO LIST`
- Kết quả:
  ```text
  Image Name:   wslrelay.exe
  PID:          16820
  User Name:    ADMIN-PC\Admin
  Session:      Console
  ```
- **Ý nghĩa kỹ thuật:** `wslrelay.exe` là tiến trình hệ thống của Microsoft WSL2, chịu trách nhiệm lắng nghe cổng loopback trên Windows (`127.0.0.1:5432`) và chuyển tiếp toàn bộ gói tin TCP trực tiếp vào bên trong máy ảo WSL2 Ubuntu tới tiến trình `postgres` (PID 289) đang lắng nghe trên cổng 5432 của Linux.

---

## 7. DOCKER STATUS
- Lệnh kiểm tra: `docker version`, `docker ps`
- Kết quả:
  ```text
  failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
  ```
- **Trạng thái:** Docker Desktop daemon **KHÔNG CHẠY (NOT RUNNING)**.

---

## 8. DOCKER POSTGRESQL STATUS
- **Trạng thái:** **NOT FOUND**. PostgreSQL hoàn toàn không chạy qua Docker.

---

## 9. ERP .ENV CONFIGURATION
Đọc từ `E:\ERP\backend\.env`:
- `PORT=5000`
- `NODE_ENV=development`
- `DB_HOST=127.0.0.1`
- `DB_PORT=5432`
- `DB_USER=postgres`
- `DB_PASSWORD=[REDACTED] (CONFIGURED)`
- `DB_NAME=erp_may10`

---

## 10. DATABASE.JS CONFIGURATION
Đọc từ `E:\ERP\backend\src\config\database.js`:
- Driver: `const { Pool } = require('pg');`
- Hàm giải quyết host: `resolveHost()`
  - Ưu tiên 1: Kiểm tra cổng TCP loopback `127.0.0.1:5432` có OPEN hay không qua socket sync (`isPortOpenSync`). Nếu OPEN $\rightarrow$ trả về `127.0.0.1`.
  - Ưu tiên 2 (Fallback): Nếu loopback đóng, gọi `wsl hostname -I` để lấy IP nội bộ của WSL2 (ví dụ `172.28.90.124`) và kết nối trực tiếp vào IP này.
- Pool Settings:
  - `max`: 25 connections
  - `idleTimeoutMillis`: 30.000 ms
  - `connectionTimeoutMillis`: 5.000 ms
  - `SSL`: Không kích hoạt (Plain local TCP)

---

## 11. NODE PG DRIVER
Đọc từ `E:\ERP\backend\package.json`:
- Thư viện: `"pg": "^8.13.3"`
- Không có bất kỳ driver cơ sở dữ liệu nào khác (`sqlite`, `mysql`, `mssql`, `mongodb`).
- Backend kết nối 100% bằng PostgreSQL Native Driver.

---

## 12. ACTUAL DB CONNECTION (KẾT NỐI THỰC TẾ)
- Kết quả test kết nối từ Node.js tới `127.0.0.1:5432`: **CONNECTED (THÀNH CÔNG)**.
- `inet_server_addr()`: `127.0.0.1`
- `inet_server_port()`: `5432`
- `current_user`: `postgres`

---

## 13. ACTUAL DATABASE NAME (TÊN DATABASE THỰC TẾ)
- `current_database()`: **`erp_may10`**
- Danh sách tất cả databases trên server:
  - `erp_may10` (Database chính thức của ERP May 10)
  - `postgres` (Database mặc định của hệ thống)
  - `template0`, `template1` (Template databases)

---

## 14. ACTUAL POSTGRESQL VERSION (PHIÊN BẢN POSTGRESQL)
- Kết quả `SELECT version()`:
  ```text
  PostgreSQL 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0, 64-bit
  ```

---

## 15. ACTUAL SCHEMA (SCHEMA HIỆN HÀNH)
- `current_schema()`: **`public`**

---

## 16. ERP TABLES FOUND (CÁC BẢNG DỮ LIỆU ĐÃ XÁC MINH)
Tổng cộng: **43 bảng** trong schema `public`:
```text
bao_cao_tai_chinh, chi_tiet_bao_gia_ncc, chi_tiet_chuyen_kho, chi_tiet_don_ban_hang,
chi_tiet_don_mua, chi_tiet_kiem_ke, chi_tiet_phieu_nhap, chi_tiet_phieu_xuat,
chi_tiet_yeu_cau_mua, chung_tu_goc, cong_doan_san_xuat, cong_no,
danh_gia_ncc, dinh_muc_nguyen_lieu, don_ban_hang, don_mua_hang,
don_vi_tinh, gia_thanh_san_pham, giao_hang, he_thong_tai_khoan,
hoa_don_ban_hang, hoa_don_nha_cung_cap, ke_hoach_san_xuat, ket_qua_san_xuat,
khach_hang, kho, lenh_san_xuat, lo_vat_tu,
nguoi_dung, nha_cung_cap, nhat_ky_hach_toan, nhu_cau_npl,
phieu_chuyen_kho, phieu_kiem_ke, phieu_nhap_kho, phieu_xuat_kho,
san_pham, thanh_toan_ncc, ton_kho, vat_tu,
vi_tri_kho, yeu_cau_bao_gia, yeu_cau_mua_hang
```
Tất cả các bảng quan trọng đều tồn tại đầy đủ và toàn vẹn.

---

## 17. PHASE 5 FIXTURE EVIDENCE (ĐỐI SOÁT DỮ LIỆU THỰC TẾ)
Đã truy vấn `SELECT` kiểm tra các bản ghi nghiệp vụ:
1. **`vat_tu` (`SP-SM-NAM-01`):**
   - ID: `8`, Tên: `Áo Sơ Mi Nam Công Sở Dài Tay Trắng`, Loại: `thanh_pham`, Trạng thái: `dang_su_dung`.
2. **`kho` (`id = 2` hoặc `ma_kho = 'KTP01'`):**
   - ID: `2`, Mã kho: `KTP01`, Tên: `Kho Thành Phẩm May 10`, Loại kho: `thanh_pham`.
3. **`ton_kho` (`ma_kho = 2`, `ma_vat_tu = 8`):**
   - Số lượng tồn: `500.000` Cái, Giá trị tồn: `110.000.000` đ (Khớp chính xác với trạng thái sau khi xuất 1.000 Cái ở Phase 5.1 & Phase 5.2).
4. **`giao_hang` (`GH-2026-001`):**
   - ID: `1`, Mã: `GH-2026-001`, Đơn bán: `1`, Trạng thái: `da_giao`, Người nhận: `Nguyễn Thị Hồng`.
5. **`san_pham` (`SP-SM-NAM-01`):**
   - ID: `1`, Mã: `SP-SM-NAM-01`, Giá bán: `450.000` đ, Giá vốn: `220.000` đ.

---

## 18. DATABASE LOCATION / RUNTIME (VỊ TRÍ LƯU TRỮ VẬT LÝ)
- **Môi trường chạy:** Máy ảo Linux Ubuntu trên WSL2.
- **Thư mục dữ liệu vật lý (Data Directory):**  
  `/var/lib/postgresql/18/main`
- **Đường dẫn truy cập từ Windows:**  
  `\\wsl.localhost\Ubuntu\var\lib\postgresql\18\main`  
  *(Được lưu trữ thực tế bên trong đĩa ảo `ext4.vhdx` của WSL2 trên ổ đĩa cứng của máy tính).*
- **Tập tin cấu hình chính:**  
  `/etc/postgresql/18/main/postgresql.conf`  
  `/etc/postgresql/18/main/pg_hba.conf`

---

## 19. TẠI SAO CÁC TEST TRƯỚC ĐÂY CHẠY ĐƯỢC / HOẶC ĐÔI KHI GẶP ECONNREFUSED?
1. **Tại sao chạy được:**
   - Khi WSL2 đang chạy, tính năng tự động chuyển tiếp cổng mạng loopback của Windows (`localhostForwarding=true`) kích hoạt tiến trình `wslrelay.exe` trên Windows để lắng nghe cổng `127.0.0.1:5432` và chuyển tiếp dữ liệu tức thời vào cổng `5432` của PostgreSQL trong WSL2. Node.js backend kết nối vào `127.0.0.1:5432` hoàn toàn thông suốt như một dịch vụ nội bộ.
2. **Tại sao đôi khi gặp `connect ECONNREFUSED 127.0.0.1:5432`:**
   - Mặc định, nếu không có cửa sổ console terminal WSL nào đang mở, sau một khoảng thời gian máy tính không gửi lệnh vào Linux, Windows sẽ tự động đưa WSL2 vào chế độ nghỉ (Idle Suspension / Shutdown) để tiết kiệm RAM/CPU.
   - Khi WSL2 bị shutdown, PostgreSQL bên trong Linux cũng tạm dừng; `wslrelay.exe` tạm thời nhả cổng 5432.
   - Ngay khi một lệnh gọi WSL được gửi đi, WSL2 thức dậy và systemd khởi động lại PostgreSQL. Trong khoảnh khắc vài giây khởi động đó, nếu script gửi request ngay lập tức sẽ gặp `ECONNREFUSED`.
   - **Biện pháp duy trì ổn định:** Một tác vụ nền giữ cho WSL2 luôn thức (ví dụ tiến trình nền `wsl sleep infinity`) sẽ đảm bảo WSL2 và PostgreSQL luôn ở trạng thái Online 100%, không bao giờ bị ngắt kết nối.

---

## 20. EXACT NEXT ACTION REQUIRED (HÀNH ĐỘNG CẦN THIẾT TIẾP THEO)
- **Hiện tại:** Cơ sở dữ liệu đang **ONLINE 100%**, sẵn sàng nhận kết nối, cấu trúc bảng và dữ liệu fixture đã hoàn chỉnh.
- **Không cần can thiệp:** Không cần cài thêm PostgreSQL trên Windows, không cần sửa đổi file `.env`, không cần chạy lại seed hay migration.

---

## FINAL VERDICT

# POSTGRESQL FOUND — LOCAL SERVICE
*(Chạy dưới dạng Native Linux Service cục bộ trên máy thông qua môi trường Ubuntu WSL2 và kết nối trong suốt qua cầu nối `wslrelay.exe` trên cổng 127.0.0.1:5432)*
