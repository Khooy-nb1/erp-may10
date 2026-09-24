const http = require('http');
const app = require('../src/app');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

function sendJsonRequest(port, path, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${signToken(1)}`,
          'x-role': 'kho',
          'x-user-id': '1',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runConcurrencyTest() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ ĐỒNG THỜI (CONCURRENCY & RACE CONDITION TEST)');
  console.log('================================================================');

  const server = app.listen(5099);
  const port = 5099;

  try {
    // 1. Chuẩn bị dữ liệu kiểm thử: Kho 1, Vật tư 1 (hoặc tạo vật tư mẫu nếu cần)
    // Thiết lập tồn kho chính xác là 100.000 mét cho mặt hàng test
    const khoRes = await db.query(`SELECT id FROM kho LIMIT 1`);
    const vtRes = await db.query(`SELECT id, ten_vat_tu FROM vat_tu LIMIT 1`);

    if (khoRes.rows.length === 0 || vtRes.rows.length === 0) {
      throw new Error('Thiếu dữ liệu kho hoặc vat_tu trong database erp_may10.');
    }

    const testKhoId = khoRes.rows[0].id;
    const testVtId = vtRes.rows[0].id;
    const tenVT = vtRes.rows[0].ten_vat_tu;

    console.log(`📌 Thiết lập dữ liệu thử nghiệm:`);
    console.log(`   - Kho ID: ${testKhoId}`);
    console.log(`   - Vật tư: [${tenVT}] (ID: ${testVtId})`);
    console.log(`   - Đặt tồn kho ban đầu = 100.000 mét`);

    // Reset tồn kho của vật tư này về đúng 100
    await db.query(
      `INSERT INTO ton_kho (ma_kho, ma_vat_tu, so_luong_ton, gia_tri_ton_kho)
       VALUES ($1, $2, 100.000, 10000000)
       ON CONFLICT (ma_kho, ma_vat_tu) 
       DO UPDATE SET so_luong_ton = 100.000, gia_tri_ton_kho = 10000000`,
      [testKhoId, testVtId]
    );

    console.log(`\n⚡ Gửi đồng thời 2 Request xuất kho tại cùng 1 thời điểm:`);
    console.log(`   - Request A: Yêu cầu xuất 80.000 mét`);
    console.log(`   - Request B: Yêu cầu xuất 50.000 mét`);
    console.log(`   - Tổng yêu cầu: 130.000 mét > Tồn kho khả dụng (100.000 mét)`);

    const reqA_payload = {
      loai_xuat: 'xuat_san_xuat',
      ma_kho_xuat: testKhoId,
      nguoi_nhan: 'Xưởng may 1 - Request A',
      ghi_chu: 'Test Concurrency Request A: 80 mét',
      chiTiet: [
        {
          ma_vat_tu: testVtId,
          so_luong_xuat: 80,
          don_gia_xuat: 100000,
        },
      ],
    };

    const reqB_payload = {
      loai_xuat: 'xuat_san_xuat',
      ma_kho_xuat: testKhoId,
      nguoi_nhan: 'Xưởng may 2 - Request B',
      ghi_chu: 'Test Concurrency Request B: 50 mét',
      chiTiet: [
        {
          ma_vat_tu: testVtId,
          so_luong_xuat: 50,
          don_gia_xuat: 100000,
        },
      ],
    };

    // Bắn 2 request đồng thời qua Promise.all
    const [resA, resB] = await Promise.all([
      sendJsonRequest(port, '/api/v1/phieu-xuat', 'POST', reqA_payload),
      sendJsonRequest(port, '/api/v1/phieu-xuat', 'POST', reqB_payload),
    ]);

    console.log('\n📊 KẾT QUẢ PHẢN HỒI TỪ HỆ THỐNG:');
    console.log(`   - Response A: Status HTTP ${resA.statusCode} | Message: ${resA.body?.message || resA.raw}`);
    console.log(`   - Response B: Status HTTP ${resB.statusCode} | Message: ${resB.body?.message || resB.raw}`);

    // Kiểm tra số lượng tồn kho cuối cùng trong database
    const tonCuoiRes = await db.query(
      `SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`,
      [testKhoId, testVtId]
    );
    const tonCuoi = parseFloat(tonCuoiRes.rows[0].so_luong_ton);

    console.log(`\n🔍 KIỂM TRA ĐỐI SOÁT TỒN KHO TRONG POSTGRESQL:`);
    console.log(`   - Tồn kho cuối cùng: ${tonCuoi} mét`);

    // Tiêu chí nghiệm thu:
    // 1. Đúng 1 request status 201 (Created)
    // 2. Đúng 1 request status 409 (Conflict)
    // 3. Tồn kho không âm, bằng 20 mét (nếu A thành công trước) hoặc 50 mét (nếu B thành công trước)
    const successCount = (resA.statusCode === 201 ? 1 : 0) + (resB.statusCode === 201 ? 1 : 0);
    const conflictCount = (resA.statusCode === 409 ? 1 : 0) + (resB.statusCode === 409 ? 1 : 0);

    let passed = true;

    if (successCount !== 1 || conflictCount !== 1) {
      console.error('❌ THẤT BẠI: Phải có đúng 1 request thành công và 1 request bị từ chối với 409 Conflict!');
      passed = false;
    }

    if (tonCuoi < 0) {
      console.error('❌ THẤT BẠI NGHIÊM TRỌNG: TỒN KHO BỊ ÂM!');
      passed = false;
    }

    if (tonCuoi !== 20 && tonCuoi !== 50) {
      console.error(`❌ THẤT BẠI: Tồn kho cuối cùng (${tonCuoi}) không khớp với 20 hoặc 50 mét!`);
      passed = false;
    }

    if (passed) {
      console.log('\n================================================================');
      console.log('✅ TEST RACE CONDITION THÀNH CÔNG RỰC RỠ (100% PASS)!');
      console.log('   - Cơ chế PostgreSQL "SELECT ... FOR UPDATE" trong Transaction');
      console.log('     đã khóa dòng an toàn tuyệt đối.');
      console.log('   - Loại bỏ hoàn toàn khả năng âm tồn kho.');
      console.log('   - Trả về đúng mã HTTP 409 Conflict cho request tranh chấp.');
      console.log('================================================================\n');
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Lỗi kiểm thử concurrency:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await db.pool.end();
    process.exit(process.exitCode || 0);
  }
}

runConcurrencyTest();
