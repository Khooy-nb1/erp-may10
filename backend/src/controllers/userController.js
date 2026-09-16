/**
 * User Controller - ERP May 10
 * Quản trị Người Dùng Hệ Thống (QUẢN TRỊ → NGƯỜI DÙNG)
 * Phân quyền: CHỈ ADMIN được truy cập
 */

const crypto = require('crypto');
const db = require('../config/database');
const {
  CANONICAL_ROLES,
  validateCreateUser,
  validateUpdateUser,
  validateChangeRole,
  validatePassword,
} = require('../validators/userValidator');

/**
 * Hash mật khẩu an toàn sử dụng PBKDF2 (Native Node.js Crypto)
 * Format: $pbkdf2$10000$<salt>$<hash>
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `$pbkdf2$10000$${salt}$${hash}`;
}

/**
 * Format thông tin user trả về client (loại bỏ mật khẩu)
 */
function formatUserResponse(row) {
  return {
    id: row.id,
    ma_can_bo: `NV-${String(row.id).padStart(4, '0')}`,
    ten_dang_nhap: row.email ? row.email.split('@')[0] : `user_${row.id}`,
    ho_ten: row.ho_ten,
    email: row.email,
    so_dien_thoai: row.so_dien_thoai || null,
    vai_tro: row.vai_tro,
    phong_ban: row.phong_ban || null,
    trang_thai: row.trang_thai || 'hoat_dong',
    ngay_tao: row.ngay_tao,
    ngay_cap_nhat: row.ngay_cap_nhat,
    nguoi_tao: row.nguoi_tao,
    nguoi_cap_nhat: row.nguoi_cap_nhat,
  };
}

/**
 * GET /api/v1/users
 * Lấy danh sách người dùng hệ thống (có hỗ trợ tìm kiếm và lọc)
 */
async function getUsers(req, res, next) {
  try {
    const { search, vai_tro, trang_thai } = req.query;

    let query = `
      SELECT id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat, nguoi_tao, nguoi_cap_nhat
      FROM nguoi_dung
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(ho_ten) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(COALESCE(phong_ban, '')) LIKE $${params.length} OR COALESCE(so_dien_thoai, '') LIKE $${params.length})`;
    }

    if (vai_tro && vai_tro.trim()) {
      params.push(vai_tro.trim());
      query += ` AND vai_tro = $${params.length}`;
    }

    if (trang_thai && trang_thai.trim()) {
      params.push(trang_thai.trim());
      query += ` AND trang_thai = $${params.length}`;
    }

    query += ` ORDER BY id ASC`;

    const result = await db.query(query, params);
    const users = result.rows.map(formatUserResponse);

    res.json({
      success: true,
      total: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/:id
 * Lấy chi tiết một người dùng
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat, nguoi_tao, nguoi_cap_nhat
       FROM nguoi_dung
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: `Không tìm thấy người dùng có ID ${id}.`,
      });
    }

    res.json({
      success: true,
      data: formatUserResponse(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users
 * Thêm người dùng mới (CHỈ ADMIN)
 */
async function createUser(req, res, next) {
  try {
    const adminId = req.user?.id || 1;
    const { ho_ten, email, vai_tro, phong_ban, so_dien_thoai, mat_khau, trang_thai } = req.body;

    // 1. Validate dữ liệu đầu vào
    const validation = validateCreateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: validation.errors.join(' '),
        errors: validation.errors,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Kiểm tra trùng lặp email / tên đăng nhập
    const dupCheck = await db.query(
      `SELECT id FROM nguoi_dung WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_EMAIL',
        message: `Email [${cleanEmail}] đã tồn tại trong hệ thống. Vui lòng chọn email khác.`,
      });
    }

    // 3. Chuẩn bị mật khẩu (mặc định May10@123 nếu không truyền)
    const rawPassword = mat_khau && mat_khau.trim() ? mat_khau.trim() : 'May10@123';
    const hashedPassword = hashPassword(rawPassword);
    const userStatus = trang_thai && trang_thai.trim() ? trang_thai.trim() : 'hoat_dong';

    // 4. Ghi dữ liệu vào database
    const insertResult = await db.query(
      `INSERT INTO nguoi_dung (
         ho_ten, email, mat_khau, so_dien_thoai, vai_tro, phong_ban, trang_thai,
         ngay_tao, ngay_cap_nhat, nguoi_tao, nguoi_cap_nhat
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, $8)
       RETURNING id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat`,
      [
        ho_ten.trim(),
        cleanEmail,
        hashedPassword,
        so_dien_thoai ? so_dien_thoai.trim() : null,
        vai_tro,
        phong_ban ? phong_ban.trim() : null,
        userStatus,
        adminId,
      ]
    );

    const newUser = formatUserResponse(insertResult.rows[0]);

    // 5. Ghi nhận Audit Log (Tuyệt đối không ghi mật khẩu ra log)
    console.log(`[USER_AUDIT]: USER_CREATED | Admin ID: ${adminId} | New User ID: ${newUser.id} | Email: ${newUser.email} | Role: ${newUser.vai_tro}`);

    res.status(201).json({
      success: true,
      message: `Tạo tài khoản người dùng [${newUser.ho_ten}] thành công.`,
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/:id
 * Cập nhật thông tin người dùng
 */
async function updateUser(req, res, next) {
  try {
    const adminId = req.user?.id || 1;
    const { id } = req.params;
    const { ho_ten, email, phong_ban, so_dien_thoai, vai_tro, trang_thai } = req.body;

    // 1. Kiểm tra tồn tại
    const userRes = await db.query(`SELECT * FROM nguoi_dung WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: `Không tìm thấy người dùng có ID ${id}.`,
      });
    }

    const currentRecord = userRes.rows[0];

    // 2. Validate dữ liệu
    const validation = validateUpdateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: validation.errors.join(' '),
        errors: validation.errors,
      });
    }

    // 3. Kiểm tra trùng lặp email nếu có thay đổi
    let newEmail = currentRecord.email;
    if (email && email.trim().toLowerCase() !== currentRecord.email.toLowerCase()) {
      newEmail = email.trim().toLowerCase();
      const dup = await db.query(
        `SELECT id FROM nguoi_dung WHERE LOWER(email) = $1 AND id != $2`,
        [newEmail, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          errorCode: 'DUPLICATE_EMAIL',
          message: `Email [${newEmail}] đã được sử dụng bởi tài khoản khác.`,
        });
      }
    }

    // 4. Self-Protection: Kiểm tra hạ vai trò Admin
    let newRole = currentRecord.vai_tro;
    if (vai_tro && vai_tro !== currentRecord.vai_tro) {
      if (currentRecord.vai_tro === 'admin' && vai_tro !== 'admin') {
        // Kiểm tra xem có còn admin khác đang hoạt động hay không
        const otherAdminRes = await db.query(
          `SELECT COUNT(*) AS total FROM nguoi_dung WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong' AND id != $1`,
          [id]
        );
        const otherAdmins = parseInt(otherAdminRes.rows[0].total, 10);
        if (otherAdmins === 0) {
          return res.status(400).json({
            success: false,
            errorCode: 'CANNOT_DEMOTE_LAST_ADMIN',
            message: 'Không thể tước quyền Quản trị viên của tài khoản quản trị cuối cùng trong hệ thống.',
          });
        }
      }
      newRole = vai_tro;
    }

    // 5. Cập nhật thông tin
    const updateResult = await db.query(
      `UPDATE nguoi_dung
       SET ho_ten = COALESCE($1, ho_ten),
           email = $2,
           phong_ban = COALESCE($3, phong_ban),
           so_dien_thoai = COALESCE($4, so_dien_thoai),
           vai_tro = $5,
           trang_thai = COALESCE($6, trang_thai),
           ngay_cap_nhat = NOW(),
           nguoi_cap_nhat = $7
       WHERE id = $8
       RETURNING id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat`,
      [
        ho_ten ? ho_ten.trim() : null,
        newEmail,
        phong_ban !== undefined ? (phong_ban ? phong_ban.trim() : null) : null,
        so_dien_thoai !== undefined ? (so_dien_thoai ? so_dien_thoai.trim() : null) : null,
        newRole,
        trang_thai || null,
        adminId,
        id,
      ]
    );

    const updatedUser = formatUserResponse(updateResult.rows[0]);

    console.log(`[USER_AUDIT]: USER_UPDATED | Admin ID: ${adminId} | Target User ID: ${id} | Email: ${updatedUser.email}`);

    res.json({
      success: true,
      message: `Cập nhật thông tin người dùng [${updatedUser.ho_ten}] thành công.`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/users/:id/role
 * Thay đổi vai trò người dùng (CHỈ ADMIN)
 */
async function changeRole(req, res, next) {
  try {
    const adminId = req.user?.id || 1;
    const { id } = req.params;
    const { vai_tro } = req.body;

    const validation = validateChangeRole(vai_tro);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ROLE',
        message: validation.message,
      });
    }

    // Kiểm tra người dùng tồn tại
    const userRes = await db.query(`SELECT * FROM nguoi_dung WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: `Không tìm thấy người dùng có ID ${id}.`,
      });
    }

    const currentRecord = userRes.rows[0];

    // Self-Protection: Không hạ quyền admin cuối cùng
    if (currentRecord.vai_tro === 'admin' && vai_tro !== 'admin') {
      const otherAdminRes = await db.query(
        `SELECT COUNT(*) AS total FROM nguoi_dung WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong' AND id != $1`,
        [id]
      );
      const otherAdmins = parseInt(otherAdminRes.rows[0].total, 10);
      if (otherAdmins === 0) {
        return res.status(400).json({
          success: false,
          errorCode: 'CANNOT_DEMOTE_LAST_ADMIN',
          message: 'Không thể thay đổi vai trò của tài khoản quản trị viên cuối cùng trong hệ thống.',
        });
      }
    }

    const result = await db.query(
      `UPDATE nguoi_dung
       SET vai_tro = $1, ngay_cap_nhat = NOW(), nguoi_cap_nhat = $2
       WHERE id = $3
       RETURNING id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat`,
      [vai_tro, adminId, id]
    );

    const updatedUser = formatUserResponse(result.rows[0]);

    console.log(`[USER_AUDIT]: USER_ROLE_CHANGED | Admin ID: ${adminId} | Target User ID: ${id} | Old: ${currentRecord.vai_tro} -> New: ${vai_tro}`);

    res.json({
      success: true,
      message: `Đã thay đổi vai trò của [${updatedUser.ho_ten}] sang [${vai_tro}].`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/users/:id/status
 * Khóa hoặc mở khóa tài khoản người dùng
 */
async function toggleUserStatus(req, res, next) {
  try {
    const adminId = req.user?.id || 1;
    const { id } = req.params;
    const { trang_thai } = req.body;

    if (!trang_thai || !['hoat_dong', 'khoa'].includes(trang_thai)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận "hoat_dong" (Hoạt động) hoặc "khoa" (Khóa tài khoản).',
      });
    }

    // 1. Kiểm tra tồn tại
    const userRes = await db.query(`SELECT * FROM nguoi_dung WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: `Không tìm thấy người dùng có ID ${id}.`,
      });
    }

    const targetUser = userRes.rows[0];

    // 2. Self-Protection: Admin không được tự khóa chính mình
    if (parseInt(id, 10) === parseInt(adminId, 10) && trang_thai === 'khoa') {
      return res.status(400).json({
        success: false,
        errorCode: 'CANNOT_LOCK_SELF',
        message: 'Bạn không thể tự khóa tài khoản của chính mình.',
      });
    }

    // 3. Self-Protection: Không được khóa Admin cuối cùng
    if (targetUser.vai_tro === 'admin' && trang_thai === 'khoa') {
      const otherAdminRes = await db.query(
        `SELECT COUNT(*) AS total FROM nguoi_dung WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong' AND id != $1`,
        [id]
      );
      const otherAdmins = parseInt(otherAdminRes.rows[0].total, 10);
      if (otherAdmins === 0) {
        return res.status(400).json({
          success: false,
          errorCode: 'CANNOT_LOCK_LAST_ADMIN',
          message: 'Không thể khóa tài khoản quản trị viên cuối cùng của hệ thống.',
        });
      }
    }

    // 4. Cập nhật trạng thái
    const updateResult = await db.query(
      `UPDATE nguoi_dung
       SET trang_thai = $1, ngay_cap_nhat = NOW(), nguoi_cap_nhat = $2
       WHERE id = $3
       RETURNING id, ho_ten, email, so_dien_thoai, vai_tro, phong_ban, trang_thai, ngay_tao, ngay_cap_nhat`,
      [trang_thai, adminId, id]
    );

    const updatedUser = formatUserResponse(updateResult.rows[0]);
    const actionLabel = trang_thai === 'hoat_dong' ? 'mở khóa hoạt động' : 'khóa';

    console.log(`[USER_AUDIT]: USER_${trang_thai === 'hoat_dong' ? 'ACTIVATED' : 'DEACTIVATED'} | Admin ID: ${adminId} | Target User ID: ${id}`);

    res.json({
      success: true,
      message: `Đã ${actionLabel} tài khoản [${updatedUser.ho_ten}] thành công.`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users/:id/reset-password
 * Đặt lại mật khẩu tài khoản người dùng (CHỈ ADMIN)
 */
async function resetPassword(req, res, next) {
  try {
    const adminId = req.user?.id || 1;
    const { id } = req.params;
    const { newPassword } = req.body;

    // Kiểm tra người dùng tồn tại
    const userRes = await db.query(`SELECT id, ho_ten, email FROM nguoi_dung WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: `Không tìm thấy người dùng có ID ${id}.`,
      });
    }

    const targetUser = userRes.rows[0];

    // Chuẩn bị mật khẩu mới (mặc định May10@123 nếu không truyền)
    const rawPass = newPassword && newPassword.trim() ? newPassword.trim() : 'May10@123';

    const val = validatePassword(rawPass);
    if (!val.isValid) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_PASSWORD',
        message: val.message,
      });
    }

    const hashedPassword = hashPassword(rawPass);

    await db.query(
      `UPDATE nguoi_dung
       SET mat_khau = $1, ngay_cap_nhat = NOW(), nguoi_cap_nhat = $2
       WHERE id = $3`,
      [hashedPassword, adminId, id]
    );

    // Tuyệt đối không log mật khẩu ra console hay response
    console.log(`[USER_AUDIT]: USER_PASSWORD_RESET | Admin ID: ${adminId} | Target User ID: ${id} (${targetUser.email})`);

    res.json({
      success: true,
      message: `Đặt lại mật khẩu cho tài khoản [${targetUser.ho_ten}] thành công.`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeRole,
  toggleUserStatus,
  resetPassword,
};
