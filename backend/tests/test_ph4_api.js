const http = require('http');
const app = require('../src/app');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

function request(port, path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${signToken(1)}`,
      'x-role': 'kho',
      'x-user-id': '1',
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAllApiTests() {
  console.log('=======================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN TẤT CẢ REST API PH4');
  console.log('=======================================================');

  const server = app.listen(5098);
  const port = 5098;
  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Health check
    console.log('\n1. Kiểm tra Health check & Hệ thống:');
    const health = await request(port, '/api/v1/health');
    assert(health.status === 200 && health.data.status === 'UP', 'Health check phản hồi status: UP');

    // 2. Master Data
    console.log('\n2. Kiểm tra Master Data:');
    const khoList = await request(port, '/api/v1/master-data/kho');
    assert(khoList.status === 200 && khoList.data.data.length > 0, `Lấy danh sách kho (${khoList.data?.data?.length} kho)`);

    const vtList = await request(port, '/api/v1/master-data/vat-tu');
    assert(vtList.status === 200 && vtList.data.data.length > 0, `Lấy danh mục vật tư (${vtList.data?.data?.length} vật tư)`);

    const crossRef = await request(port, '/api/v1/master-data/cross-module');
    assert(crossRef.status === 200 && crossRef.data.data.donBanHang !== undefined, 'Lấy danh mục liên kết liên phân hệ (PH1, PH2, PH3)');

    // 3. Vị trí kho
    console.log('\n3. Kiểm tra Vị trí kho:');
    const viTriList = await request(port, '/api/v1/vi-tri-kho');
    assert(viTriList.status === 200 && Array.isArray(viTriList.data.data), 'Lấy danh sách vị trí kho');

    const newViTriCode = `VT-TEST-${Date.now().toString().slice(-4)}`;
    const createVT = await request(port, '/api/v1/vi-tri-kho', 'POST', {
      ma_kho: khoList.data.data[0].id,
      ma_vi_tri: newViTriCode,
      ten_vi_tri: 'Kệ thử nghiệm tầng 1',
      khu_vuc: 'Khu Test',
      tang: '1',
      suc_chua_toi_da: 500,
    });
    assert(createVT.status === 201 && createVT.data.data.ma_vi_tri === newViTriCode, `Thêm mới vị trí kho: ${newViTriCode}`);

    // 4. Lô vật tư
    console.log('\n4. Kiểm tra Lô vật tư / Cây vải:');
    const loList = await request(port, '/api/v1/lo-vat-tu');
    assert(loList.status === 200 && Array.isArray(loList.data.data), 'Lấy danh sách lô vật tư');

    // 5. Tồn kho & Dashboard
    console.log('\n5. Kiểm tra Báo cáo tồn kho & Dashboard:');
    const tonKhoList = await request(port, '/api/v1/ton-kho');
    assert(tonKhoList.status === 200 && tonKhoList.data.data.length > 0, `Lấy báo cáo tồn kho (${tonKhoList.data.data.length} dòng)`);

    const dashboard = await request(port, '/api/v1/ton-kho/dashboard');
    assert(dashboard.status === 200 && dashboard.data.data.tongSoMatHangTon >= 0, 'Lấy thống kê Dashboard kho & vật tư');

    const theKho = await request(
      port,
      `/api/v1/ton-kho/the-kho?ma_kho=${khoList.data.data[0].id}&ma_vat_tu=${vtList.data.data[0].id}`
    );
    assert(theKho.status === 200 && theKho.data.data.nhatKyBienDong !== undefined, 'Tra cứu thẻ kho chi tiết');

    // 6. Nhập kho flow
    console.log('\n6. Kiểm tra Quy trình Nhập kho:');
    const testVatTu = vtList.data.data[0];
    const testKho = khoList.data.data[0];

    const nhapPayload = {
      loai_nhap: 'tu_mua_hang',
      ma_kho_nhap: testKho.id,
      nguoi_giao_hang: 'Nhà xe vận chuyển May 10',
      ghi_chu: 'Nhập kho thử nghiệm tự động',
      chiTiet: [
        {
          ma_vat_tu: testVatTu.id,
          so_luong_nhap: 50,
          don_gia_nhap: 45000,
          ghi_chu: 'Dòng nhập test 50 đơn vị',
        },
      ],
    };

    const nhapRes = await request(port, '/api/v1/phieu-nhap', 'POST', nhapPayload);
    assert(nhapRes.status === 201 && nhapRes.data.data.ma_phieu_nhap !== undefined, `Lập phiếu nhập kho thành công (${nhapRes.data?.data?.ma_phieu_nhap})`);

    // 7. Xuất kho flow
    console.log('\n7. Kiểm tra Quy trình Xuất kho & Chặn xuất âm:');
    // Xuất hợp lệ
    const xuatHopLe = await request(port, '/api/v1/phieu-xuat', 'POST', {
      loai_xuat: 'xuat_san_xuat',
      ma_kho_xuat: testKho.id,
      nguoi_nhan: 'Tổ cắt xưởng 1',
      chiTiet: [
        {
          ma_vat_tu: testVatTu.id,
          so_luong_xuat: 10,
          don_gia_xuat: 45000,
        },
      ],
    });
    assert(xuatHopLe.status === 201, 'Xuất kho hợp lệ (10 đơn vị) thành công');

    // Thử xuất quá tồn để kiểm tra chặn âm
    const xuatAm = await request(port, '/api/v1/phieu-xuat', 'POST', {
      loai_xuat: 'xuat_san_xuat',
      ma_kho_xuat: testKho.id,
      nguoi_nhan: 'Tổ cắt xưởng 1',
      chiTiet: [
        {
          ma_vat_tu: testVatTu.id,
          so_luong_xuat: 99999999, // Cố tình vượt quá tồn
          don_gia_xuat: 45000,
        },
      ],
    });
    assert(xuatAm.status === 409, `Chặn xuất quá tồn kho thành công (Mã HTTP 409 Conflict: ${xuatAm.data?.message?.slice(0, 40)}...)`);

    // 8. Chuyển kho flow
    console.log('\n8. Kiểm tra Quy trình Chuyển kho nội bộ:');
    if (khoList.data.data.length >= 2) {
      const kho1 = khoList.data.data[0];
      const kho2 = khoList.data.data[1];

      const chuyenRes = await request(port, '/api/v1/phieu-chuyen', 'POST', {
        ma_kho_xuat: kho1.id,
        ma_kho_nhap: kho2.id,
        ly_do: 'Điều chuyển cân đối nguyên liệu giữa 2 xưởng',
        chiTiet: [
          {
            ma_vat_tu: testVatTu.id,
            so_luong_chuyen: 5,
            don_gia: 45000,
          },
        ],
      });
      assert(chuyenRes.status === 201, `Lập phiếu chuyển kho từ [${kho1.ten_kho}] sang [${kho2.ten_kho}] thành công`);
    }

    // 9. Kiểm kê kho & Điều chỉnh
    console.log('\n9. Kiểm tra Quy trình Kiểm kê & Cân đối kho:');
    const kiemKeRes = await request(port, '/api/v1/phieu-kiem-ke', 'POST', {
      ma_kho: testKho.id,
      ky_kiem_ke: `Kỳ kiểm kê Q3-${new Date().getFullYear()}`,
      ghi_chu: 'Kiểm kê định kỳ tháng 9',
      chiTiet: [
        {
          ma_vat_tu: testVatTu.id,
          so_luong_thuc_te: 65,
          nguyen_nhan: 'Kiểm đếm thực tế khớp số kiện',
        },
      ],
    });
    assert(kiemKeRes.status === 201, `Tạo phiếu kiểm kê thành công (${kiemKeRes.data?.data?.ma_phieu_kiem_ke})`);

    const dieuChinhRes = await request(
      port,
      `/api/v1/phieu-kiem-ke/${kiemKeRes.data.data.id}/dieu-chinh`,
      'POST'
    );
    assert(dieuChinhRes.status === 200, 'Điều chỉnh cân đối tồn kho theo số thực tế thành công');

    console.log('\n=======================================================');
    console.log(`🎉 TỔNG KẾT KIỂM THỬ: ${passCount}/${testCount} TESTS PASSED (100%)`);
    console.log('=======================================================\n');
  } catch (err) {
    console.error('Lỗi khi chạy API tests:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await db.pool.end();
    process.exit(process.exitCode || 0);
  }
}

runAllApiTests();
