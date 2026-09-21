# CHAPTER 5 — PH4 ASSETS INVENTORY

| Mã Hình | Loại Tài Nguyên | Tên Hiển Thị | Tên File Vật Lý | Nguồn Gốc / Căn Cứ |
|:---:|:---:|:---|:---|:---|
| **Hình 5.1** | Component Diagram | Biểu đồ thành phần phân hệ Kho và quản lý vật tư | igures/5_4_1_a_bieu_do_thanh_phan.png | Kiến trúc 4 tầng Clean Architecture trích xuất từ source code (rontend/src/pages, ackend/src/routes, ackend/src/controllers, database/schema.sql). |
| **Hình 5.2** | Deployment Diagram | Biểu đồ triển khai phân hệ Kho và quản lý vật tư | igures/5_4_1_b_bieu_do_trien_khai.png | Mô hình triển khai thực tế trên môi trường máy chủ: Client Workstation (React/Vite Port 5173), Application Server (Node.js/Express Port 5000) và Database Server (PostgreSQL 18.6 Port 5432 trên WSL2). |
| **Hình 5.3** | Mockup Wireframe | Mockup giao diện Menu và Tổng quan phân hệ Kho và quản lý vật tư | igures/5_4_1_c_mockup_tong_quan_kho.png | Bản vẽ phác thảo thiết kế Hand-drawn Low-fidelity Wireframe chuẩn 16:9 ( \times 900\text{ px}$) được vẽ vector tự động, phản ánh đúng 8 chức năng thực tế của PH4. |
| **Hình 5.4** | Screenshot Thực Tế | Giao diện thực tế chức năng Phiếu nhập kho | screenshots/5_4_2_1_phieu_nhap_kho.png | Ảnh chụp màn hình runtime từ website đang chạy (http://localhost:5173/warehouse?tab=phieu-nhap), thể hiện danh sách phiếu nhập kho, dữ liệu thực tế và thanh tác vụ. |
| **Hình 5.5** | Screenshot Thực Tế | Giao diện thực tế chức năng Phiếu xuất kho | screenshots/5_4_2_2_phieu_xuat_kho.png | Ảnh chụp màn hình runtime từ website đang chạy (http://localhost:5173/warehouse?tab=phieu-xuat), thể hiện danh sách phiếu xuất kho, bộ lọc và trạng thái chứng từ. |
| **Hình 5.6** | Screenshot Thực Tế | Giao diện thực tế chức năng Điều chuyển kho | screenshots/5_4_2_3_dieu_chuyen_kho.png | Ảnh chụp màn hình runtime từ website đang chạy (http://localhost:5173/warehouse?tab=phieu-chuyen), thể hiện danh sách phiếu điều chuyển giữa các kho nội bộ May 10. |
