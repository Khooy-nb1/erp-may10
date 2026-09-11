/**
 * ERP May 10 - Canonical Role Adapter & Permission Matrix
 * Synchronized across Backend, Frontend, and Database (nguoi_dung)
 */

// 1. CANONICAL ROLES (Chuáº©n hÃ³a 6 vai trÃ² chÃ­nh thá»©c tiáº¿ng Viá»‡t theo RBAC Contract)
const CANONICAL_ROLES = {
  ADMIN: 'admin',
  KHO: 'kho',
  BAN_HANG: 'ban_hang',
  SAN_XUAT: 'san_xuat',
  MUA_HANG: 'mua_hang',
  KE_TOAN: 'ke_toan',

  // Adapter tÆ°Æ¡ng thÃ­ch ná»™i bá»™ (Internal Security Adapter Compatibility)
  WAREHOUSE: 'kho',
  SALES: 'ban_hang',
  PRODUCTION: 'san_xuat',
  PURCHASING: 'mua_hang',
  ACCOUNTING: 'ke_toan',
};

// 2. DICTIONARY MAPPING (Há»— trá»£ chuáº©n hÃ³a má»i Ä‘á»‹nh dáº¡ng vá» 6 vai trÃ² tiáº¿ng Viá»‡t)
const ROLE_MAPPING = {
  // Admin
  'admin': 'admin',
  'ADMIN': 'admin',

  // PhÃ¢n há»‡ PH4: Kho & Quáº£n lÃ½ váº­t tÆ°
  'kho': 'kho',
  'KHO': 'kho',
  'warehouse': 'kho',
  'WAREHOUSE': 'kho',
  'warehouse_manager': 'kho',
  'WAREHOUSE_MANAGER': 'kho',
  'quan_ly_kho': 'kho',

  // PhÃ¢n há»‡ PH1: BÃ¡n hÃ ng
  'ban_hang': 'ban_hang',
  'BAN_HANG': 'ban_hang',
  'sales': 'ban_hang',
  'SALES': 'ban_hang',

  // PhÃ¢n há»‡ PH2: Sáº£n xuáº¥t & Nhu cáº§u NPL
  'san_xuat': 'san_xuat',
  'SAN_XUAT': 'san_xuat',
  'production': 'san_xuat',
  'PRODUCTION': 'san_xuat',

  // PhÃ¢n há»‡ PH3: Mua hÃ ng & NCC
  'mua_hang': 'mua_hang',
  'MUA_HANG': 'mua_hang',
  'purchasing': 'mua_hang',
  'PURCHASING': 'mua_hang',

  // PhÃ¢n há»‡ PH5: TÃ i chÃ­nh - Káº¿ toÃ¡n
  'ke_toan': 'ke_toan',
  'KE_TOAN': 'ke_toan',
  'accounting': 'ke_toan',
  'ACCOUNTING': 'ke_toan',
  'ke_toan_truong': 'ke_toan',
  'KE_TOAN_TRUONG': 'ke_toan',
};

/**
 * Chuáº©n hÃ³a báº¥t ká»³ mÃ£ vai trÃ² Ä‘áº§u vÃ o vá» CANONICAL VIETNAMESE ROLE
 * @param {string} rawRole
 * @returns {string}
 */
function normalizeRole(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') return 'kho';
  const cleaned = rawRole.trim().toLowerCase();
  return ROLE_MAPPING[cleaned] || ROLE_MAPPING[rawRole.trim()] || 'kho';
}

// 3. MA TRáº¬N PHÃ‚N QUYá»€N CHUáº¨N (ROLE_PERMISSIONS) CHO Tá»ªNG VAI TRÃ’
const KHO_PERMISSIONS = [
  'dashboard.view',
  // Canonical Vietnamese permissions
  'kho.view',
  'kho.nhap',
  'kho.xuat',
  'kho.chuyen',
  'kho.kiem_ke',
  // Standard module permissions
  'warehouse.view',
  'warehouse.receipt',
  'warehouse.issue',
  'warehouse.transfer',
  'warehouse.stocktake',
];

const SALES_PERMISSIONS = [
  'dashboard.view',
  'sales.view',
  'sales.create',
  'sales.update',
  'sales.approve',
  'kho.view',
  'warehouse.view',
];

const PRODUCTION_PERMISSIONS = [
  'dashboard.view',
  'production.view',
  'production.create',
  'production.update',
  'production.approve',
  'kho.view',
  'warehouse.view',
];

const PURCHASING_PERMISSIONS = [
  'dashboard.view',
  'purchasing.view',
  'purchasing.create',
  'purchasing.update',
  'purchasing.approve',
  'kho.view',
  'warehouse.view',
];

const ACCOUNTING_PERMISSIONS = [
  'dashboard.view',
  'accounting.view',
  'accounting.journal',
  'accounting.receivable',
  'accounting.payable',
  'accounting.cost',
  'kho.view',
  'warehouse.view',
];

const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'sales.view', 'sales.create', 'sales.update', 'sales.delete', 'sales.approve',
  'production.view', 'production.create', 'production.update', 'production.approve',
  'purchasing.view', 'purchasing.create', 'purchasing.update', 'purchasing.approve',
  'kho.view', 'kho.nhap', 'kho.xuat', 'kho.chuyen', 'kho.kiem_ke',
  'warehouse.view', 'warehouse.receipt', 'warehouse.issue', 'warehouse.transfer', 'warehouse.stocktake',
  'accounting.view', 'accounting.journal', 'accounting.receivable', 'accounting.payable', 'accounting.cost',
  'admin.users', 'admin.roles', 'admin.permissions', 'admin.settings',
];

const ROLE_PERMISSIONS = {
  // Canonical 6 Vietnamese roles
  admin: ADMIN_PERMISSIONS,
  kho: KHO_PERMISSIONS,
  ban_hang: SALES_PERMISSIONS,
  san_xuat: PRODUCTION_PERMISSIONS,
  mua_hang: PURCHASING_PERMISSIONS,
  ke_toan: ACCOUNTING_PERMISSIONS,

  // Internal test / adapter compatibility
  ADMIN: ADMIN_PERMISSIONS,
  WAREHOUSE: KHO_PERMISSIONS,
  SALES: SALES_PERMISSIONS,
  PRODUCTION: PRODUCTION_PERMISSIONS,
  PURCHASING: PURCHASING_PERMISSIONS,
  ACCOUNTING: ACCOUNTING_PERMISSIONS,
  warehouse: KHO_PERMISSIONS,
  sales: SALES_PERMISSIONS,
  production: PRODUCTION_PERMISSIONS,
  purchasing: PURCHASING_PERMISSIONS,
  accounting: ACCOUNTING_PERMISSIONS,
};

const ROLE_PERMISSIONS_LOWERCASE = ROLE_PERMISSIONS;

module.exports = {
  CANONICAL_ROLES,
  ROLE_MAPPING,
  normalizeRole,
  ROLE_PERMISSIONS,
  ROLE_PERMISSIONS_LOWERCASE,
};
