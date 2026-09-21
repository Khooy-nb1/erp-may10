/**
 * TEST SUITE: PH4 FR-11 — MOVEMENT LEDGER + RUNNING BALANCE
 * Sổ Thẻ Kho Điện Tử — Kiểm tra toàn diện 10 test case bắt buộc (F-01)
 */

const http = require('http');
const assert = require('assert');
const db = require('E:/ERP/backend/src/config/database');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Helper gọi API HTTP
function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Helper đăng nhập lấy token thủ kho / admin
function login(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: PH4 FR-11 — SỔ THẺ KHO / MOVEMENT LEDGER + RUNNING BALANCE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName, detail = '') {
    passed++;
    console.log(`[PASS] ${testName}${detail ? ' -> ' + detail : ''}`);
  }

  function recordFail(testName, err) {
    failed++;
    console.error(`[FAIL] ${testName}:`, err.message || err);
  }

  try {
    // Đăng nhập với vai trò Quản lý kho (kho)
    const loginRes = await login('kho@may10.vn', 'Admin@123');
    assert(loginRes.success && loginRes.data?.token, 'Đăng nhập thủ kho thất bại');
    const token = loginRes.data.token;
    console.log(`Authenticated user: ${loginRes.data.user.ho_ten} (${loginRes.data.user.vai_tro})\n`);

    // Lấy danh sách kho & vật tư
    const tonKhoRes = await apiGet('/ton-kho', token);
    assert(tonKhoRes.status === 200, 'Không lấy được báo cáo tồn kho');
    const items = tonKhoRes.data.data;
    assert(items.length > 0, 'Không có dữ liệu tồn kho để test');

    // TEST 1 — RECEIPT: Kiểm tra biến động Nhập kho (quantity_change > 0)
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      assert(theKho1.status === 200, 'API /the-kho trả về HTTP 200');
      const moves = theKho1.data.data.nhatKyBienDong;

      const receipts = moves.filter((m) => m.movement_type === 'RECEIPT');
      assert(receipts.length > 0, 'Phải có ít nhất 1 biến động RECEIPT');
      const sampleReceipt = receipts[0];
      assert(sampleReceipt.quantity_change > 0, 'RECEIPT quantity_change phải > 0');
      assert(sampleReceipt.huong_bien_dong === 'tang', 'RECEIPT huong_bien_dong phải là "tang"');
      assert(sampleReceipt.loai_bien_dong === 'nhap_kho', 'RECEIPT loai_bien_dong phải là "nhap_kho"');
      recordPass('TEST 1 — RECEIPT (Nhập kho)', `quantity_change = +${sampleReceipt.quantity_change}, type = ${sampleReceipt.movement_type}`);
    } catch (e) {
      recordFail('TEST 1 — RECEIPT (Nhập kho)', e);
    }

    // TEST 2 — ISSUE: Kiểm tra biến động Xuất kho (quantity_change < 0)
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;

      const issues = moves.filter((m) => m.movement_type === 'ISSUE');
      assert(issues.length > 0, 'Phải có ít nhất 1 biến động ISSUE');
      const sampleIssue = issues[0];
      assert(sampleIssue.quantity_change < 0, 'ISSUE quantity_change phải < 0');
      assert(sampleIssue.huong_bien_dong === 'giam', 'ISSUE huong_bien_dong phải là "giam"');
      assert(sampleIssue.loai_bien_dong === 'xuat_kho', 'ISSUE loai_bien_dong phải là "xuat_kho"');
      recordPass('TEST 2 — ISSUE (Xuất kho)', `quantity_change = ${sampleIssue.quantity_change}, type = ${sampleIssue.movement_type}`);
    } catch (e) {
      recordFail('TEST 2 — ISSUE (Xuất kho)', e);
    }

    // TEST 3 — TRANSFER OUT: Chuyển kho xuất (quantity_change < 0)
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;

      const transferOuts = moves.filter((m) => m.movement_type === 'TRANSFER_OUT');
      assert(transferOuts.length > 0, 'Phải có biến động TRANSFER_OUT');
      const sampleOut = transferOuts[0];
      assert(sampleOut.quantity_change < 0, 'TRANSFER_OUT quantity_change phải < 0');
      assert(sampleOut.huong_bien_dong === 'giam', 'TRANSFER_OUT huong_bien_dong phải là "giam"');
      assert(sampleOut.loai_bien_dong === 'chuyen_kho_xuat', 'TRANSFER_OUT loai_bien_dong phải là "chuyen_kho_xuat"');
      recordPass('TEST 3 — TRANSFER OUT (Chuyển kho xuất)', `quantity_change = ${sampleOut.quantity_change}, type = ${sampleOut.movement_type}`);
    } catch (e) {
      recordFail('TEST 3 — TRANSFER OUT (Chuyển kho xuất)', e);
    }

    // TEST 4 — TRANSFER IN: Chuyển kho nhập (quantity_change > 0)
    try {
      const theKho2 = await apiGet(`/ton-kho/the-kho?ma_kho=2&ma_vat_tu=1`, token);
      const moves2 = theKho2.data.data.nhatKyBienDong;

      const transferIns = moves2.filter((m) => m.movement_type === 'TRANSFER_IN');
      assert(transferIns.length > 0, 'Kho nhận (Kho 2) phải có biến động TRANSFER_IN');
      const sampleIn = transferIns[0];
      assert(sampleIn.quantity_change > 0, 'TRANSFER_IN quantity_change phải > 0');
      assert(sampleIn.huong_bien_dong === 'tang', 'TRANSFER_IN huong_bien_dong phải là "tang"');
      assert(sampleIn.loai_bien_dong === 'chuyen_kho_nhap', 'TRANSFER_IN loai_bien_dong phải là "chuyen_kho_nhap"');
      recordPass('TEST 4 — TRANSFER IN (Chuyển kho nhập)', `quantity_change = +${sampleIn.quantity_change}, type = ${sampleIn.movement_type}`);
    } catch (e) {
      recordFail('TEST 4 — TRANSFER IN (Chuyển kho nhập)', e);
    }

    // TEST 5 — STOCKTAKE POSITIVE: Kiểm kê tăng (actual > system, quantity_change > 0)
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;

      const stocktakePos = moves.filter((m) => m.movement_type === 'STOCKTAKE_ADJUSTMENT' && m.quantity_change > 0);
      assert(stocktakePos.length > 0, 'Phải có kiểm kê điều chỉnh tăng (chênh lệch dương)');
      const sample = stocktakePos[0];
      assert(sample.quantity_change > 0, 'Chênh lệch kiểm kê phải > 0');
      assert(sample.huong_bien_dong === 'tang', 'Hướng biến động phải là "tang"');
      assert(sample.loai_bien_dong === 'dieu_chinh_kiem_ke', 'Loại biến động phải là "dieu_chinh_kiem_ke"');
      recordPass('TEST 5 — STOCKTAKE POSITIVE (Kiểm kê điều chỉnh tăng)', `quantity_change = +${sample.quantity_change}`);
    } catch (e) {
      recordFail('TEST 5 — STOCKTAKE POSITIVE (Kiểm kê điều chỉnh tăng)', e);
    }

    // TEST 6 — STOCKTAKE NEGATIVE: Kiểm kê giảm (actual < system, quantity_change < 0)
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;

      const stocktakeNeg = moves.filter((m) => m.movement_type === 'STOCKTAKE_ADJUSTMENT' && m.quantity_change < 0);
      assert(stocktakeNeg.length > 0, 'Phải có kiểm kê điều chỉnh giảm (chênh lệch âm)');
      const sample = stocktakeNeg[0];
      assert(sample.quantity_change < 0, 'Chênh lệch kiểm kê phải < 0');
      assert(sample.huong_bien_dong === 'giam', 'Hướng biến động phải là "giam"');
      assert(sample.loai_bien_dong === 'dieu_chinh_kiem_ke', 'Loại biến động phải là "dieu_chinh_kiem_ke"');
      recordPass('TEST 6 — STOCKTAKE NEGATIVE (Kiểm kê điều chỉnh giảm)', `quantity_change = ${sample.quantity_change}`);
    } catch (e) {
      recordFail('TEST 6 — STOCKTAKE NEGATIVE (Kiểm kê điều chỉnh giảm)', e);
    }

    // TEST 7 — RUNNING BALANCE: Kiểm tra chuỗi tính số dư lũy kế từng dòng
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;
      assert(moves.length >= 5, 'Phải có chuỗi giao dịch tối thiểu 5 dòng để kiểm tra');

      let prevBal = parseFloat(moves[0].running_balance);

      for (let i = 1; i < Math.min(moves.length, 50); i++) {
        const m = moves[i];
        const expectedBal = Math.round((prevBal + m.quantity_change) * 1000) / 1000;
        const actualBal = Math.round(m.running_balance * 1000) / 1000;
        if (Math.abs(expectedBal - actualBal) > 0.001) {
          throw new Error(`Dòng ${i} không khớp lũy kế: Trước=${prevBal}, Change=${m.quantity_change}, Expected=${expectedBal}, Actual=${actualBal}`);
        }
        prevBal = actualBal;
      }
      recordPass('TEST 7 — RUNNING BALANCE (Số dư lũy kế từng dòng)', `Khớp 100% công thức running_balance = prev_balance + quantity_change`);
    } catch (e) {
      recordFail('TEST 7 — RUNNING BALANCE (Số dư lũy kế từng dòng)', e);
    }

    // TEST 8 — FINAL BALANCE: Số dư cuối cùng phải bằng chính xác tồn kho thực tế trong ton_kho
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;
      const actualStock = theKho1.data.data.tonHienTai.so_luong_ton;
      const lastMove = moves[moves.length - 1];

      assert(
        Math.abs(lastMove.running_balance - parseFloat(actualStock)) < 0.001,
        `Số dư cuối (${lastMove.running_balance}) không bằng tồn kho thực tế (${actualStock})`
      );

      // Thử tiếp trên Kho 2
      const theKho2 = await apiGet(`/ton-kho/the-kho?ma_kho=2&ma_vat_tu=1`, token);
      const moves2 = theKho2.data.data.nhatKyBienDong;
      const actualStock2 = theKho2.data.data.tonHienTai.so_luong_ton;
      const lastMove2 = moves2[moves2.length - 1];
      assert(
        Math.abs(lastMove2.running_balance - parseFloat(actualStock2)) < 0.001,
        `Kho 2 số dư cuối (${lastMove2.running_balance}) không bằng tồn kho thực tế (${actualStock2})`
      );

      recordPass('TEST 8 — FINAL BALANCE (Số dư cuối khớp tồn kho)', `Kho 1: ${lastMove.running_balance} === ${actualStock} | Kho 2: ${lastMove2.running_balance} === ${actualStock2}`);
    } catch (e) {
      recordFail('TEST 8 — FINAL BALANCE (Số dư cuối khớp tồn kho)', e);
    }

    // TEST 9 — WAREHOUSE TRANSFER: Đối soát 2 đầu phiếu chuyển kho
    try {
      const pckQuery = await db.query(`
        SELECT pck.id, pck.ma_phieu_chuyen, pck.ma_kho_xuat, pck.ma_kho_nhap, ct.ma_vat_tu, ct.so_luong_chuyen
        FROM phieu_chuyen_kho pck
        JOIN chi_tiet_chuyen_kho ct ON pck.id = ct.ma_phieu_chuyen_kho
        WHERE pck.trang_thai = 'da_chuyen'
        LIMIT 1
      `);
      assert(pckQuery.rows.length > 0, 'Phải có ít nhất 1 phiếu chuyển kho thực tế');
      const pck = pckQuery.rows[0];

      // Xem sổ thẻ kho tại kho xuất
      const tkXuat = await apiGet(`/ton-kho/the-kho?ma_kho=${pck.ma_kho_xuat}&ma_vat_tu=${pck.ma_vat_tu}`, token);
      const moveXuat = tkXuat.data.data.nhatKyBienDong.find((m) => m.ma_chung_tu === pck.ma_phieu_chuyen);
      assert(moveXuat, 'Kho xuất phải có bản ghi phiếu chuyển');
      assert(moveXuat.movement_type === 'TRANSFER_OUT', 'Kho xuất phải là TRANSFER_OUT');
      assert(moveXuat.quantity_change < 0, 'Kho xuất quantity_change phải âm');

      // Xem sổ thẻ kho tại kho nhập
      const tkNhap = await apiGet(`/ton-kho/the-kho?ma_kho=${pck.ma_kho_nhap}&ma_vat_tu=${pck.ma_vat_tu}`, token);
      const moveNhap = tkNhap.data.data.nhatKyBienDong.find((m) => m.ma_chung_tu === pck.ma_phieu_chuyen);
      assert(moveNhap, 'Kho nhập phải có bản ghi phiếu chuyển');
      assert(moveNhap.movement_type === 'TRANSFER_IN', 'Kho nhập phải là TRANSFER_IN');
      assert(moveNhap.quantity_change > 0, 'Kho nhập quantity_change phải dương');
      assert(Math.abs(moveXuat.quantity_change) === moveNhap.quantity_change, 'Số lượng xuất chuyển và nhập chuyển phải bằng nhau');

      recordPass(
        'TEST 9 — WAREHOUSE TRANSFER (Đối soát 2 đầu chuyển kho)',
        `${pck.ma_phieu_chuyen}: Kho xuất ${pck.ma_kho_xuat} (${moveXuat.quantity_change}) <-> Kho nhập ${pck.ma_kho_nhap} (+${moveNhap.quantity_change})`
      );
    } catch (e) {
      recordFail('TEST 9 — WAREHOUSE TRANSFER (Đối soát 2 đầu chuyển kho)', e);
    }

    // TEST 10 — STOCKTAKE ZERO DIFFERENCE: Kiểm kê khớp sổ sách (quantity_change = 0)
    try {
      const theKho1 = await apiGet(`/ton-kho/the-kho?ma_kho=1&ma_vat_tu=1`, token);
      const moves = theKho1.data.data.nhatKyBienDong;

      const zeroDiffStocktake = moves.filter(
        (m) => m.movement_type === 'STOCKTAKE_ADJUSTMENT' && m.quantity_change === 0
      );
      assert(zeroDiffStocktake.length > 0, 'Phải ghi nhận kiểm kê khớp sổ sách (chênh lệch = 0)');
      const sampleZero = zeroDiffStocktake[0];
      assert(sampleZero.quantity_change === 0, 'quantity_change phải bằng đúng 0');
      assert(sampleZero.so_luong === 0, 'so_luong phải bằng đúng 0');
      recordPass('TEST 10 — STOCKTAKE ZERO DIFFERENCE (Kiểm kê khớp sổ)', `quantity_change = 0, document = ${sampleZero.ma_chung_tu}`);
    } catch (e) {
      recordFail('TEST 10 — STOCKTAKE ZERO DIFFERENCE (Kiểm kê khớp sổ)', e);
    }

    console.log('\n================================================================');
    console.log(`KẾT QUẢ TEST PH4 FR-11: ${passed} PASS / ${failed} FAIL (TỔNG CỘNG 10 TEST CASES)`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Lỗi nghiêm trọng trong test runner:', err);
    process.exit(1);
  }
}

runTests();
