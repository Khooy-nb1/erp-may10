import './style.css'

// PHÂN HỆ SẢN XUẤT MAY 10
// Bản demo frontend: lưu dữ liệu trong localStorage của trình duyệt.
// Khi nhóm có backend, thay các hàm đọc/ghi localStorage bằng API của nhóm.

const STORAGE_KEY = 'may10-production-module-v1'

const seedData = {
  products: [
    { id: 1, code: 'SP001', name: 'Áo sơ mi nam trắng', unit: 'cái' },
    { id: 2, code: 'SP002', name: 'Quần âu nữ đen', unit: 'cái' },
    { id: 3, code: 'SP003', name: 'Áo polo nữ xanh navy', unit: 'cái' },
    { id: 4, code: 'SP004', name: 'Áo vest nam xanh navy', unit: 'bộ' },
    { id: 5, code: 'SP005', name: 'Quần khaki nam be', unit: 'cái' },
    { id: 6, code: 'SP006', name: 'Áo blazer nữ be', unit: 'bộ' },
    { id: 7, code: 'SP007', name: 'Chân váy bút chì đen', unit: 'cái' },
  ],
  materials: [
    { id: 1, code: 'VT001', name: 'Vải kate trắng', unit: 'mét', stock: 820, minimum: 300 },
    { id: 2, code: 'VT002', name: 'Vải tuytsi đen', unit: 'mét', stock: 360, minimum: 200 },
    { id: 3, code: 'VT003', name: 'Vải cotton xanh navy', unit: 'mét', stock: 1450, minimum: 400 },
    { id: 4, code: 'VT004', name: 'Chỉ may trắng', unit: 'cuộn', stock: 42, minimum: 30 },
    { id: 5, code: 'VT005', name: 'Cúc áo sơ mi', unit: 'cái', stock: 3800, minimum: 1000 },
    { id: 6, code: 'VT006', name: 'Khóa quần âu', unit: 'cái', stock: 640, minimum: 300 },
    { id: 7, code: 'VT007', name: 'Vải tuytsi xanh navy', unit: 'mét', stock: 1600, minimum: 350 },
    { id: 8, code: 'VT008', name: 'Vải kaki be', unit: 'mét', stock: 1600, minimum: 300 },
    { id: 9, code: 'VT009', name: 'Vải lót polyester', unit: 'mét', stock: 1200, minimum: 250 },
    { id: 10, code: 'VT010', name: 'Nút vest kim loại', unit: 'cái', stock: 1500, minimum: 400 },
    { id: 11, code: 'VT011', name: 'Khóa kéo váy', unit: 'cái', stock: 700, minimum: 200 },
    { id: 12, code: 'VT012', name: 'Chỉ may xanh navy', unit: 'cuộn', stock: 58, minimum: 25 },
    { id: 13, code: 'VT013', name: 'Khóa quần khaki', unit: 'cái', stock: 760, minimum: 250 },
    { id: 14, code: 'VT014', name: 'Vải lót be cao cấp', unit: 'mét', stock: 980, minimum: 200 },
    { id: 15, code: 'VT015', name: 'Nút blazer ngọc trai', unit: 'cái', stock: 1300, minimum: 350 },
    { id: 16, code: 'VT016', name: 'Vải tuytsi đen co giãn', unit: 'mét', stock: 900, minimum: 250 },
  ],
  // BOM: định mức vật tư cho một đơn vị sản phẩm.
  bom: [
    { id: 1, productId: 1, materialId: 1, norm: 1.65, waste: 2, status: 'hieu_luc' },
    { id: 2, productId: 1, materialId: 4, norm: 0.03, waste: 2, status: 'hieu_luc' },
    { id: 3, productId: 1, materialId: 5, norm: 7, waste: 1, status: 'hieu_luc' },
    { id: 4, productId: 2, materialId: 2, norm: 1.45, waste: 3, status: 'hieu_luc' },
    { id: 5, productId: 2, materialId: 6, norm: 1, waste: 1, status: 'hieu_luc' },
    { id: 6, productId: 3, materialId: 3, norm: 1.2, waste: 2, status: 'hieu_luc' },
    { id: 7, productId: 3, materialId: 12, norm: 0.02, waste: 2, status: 'hieu_luc' },
    { id: 8, productId: 4, materialId: 7, norm: 2.2, waste: 3, status: 'hieu_luc' },
    { id: 9, productId: 4, materialId: 9, norm: 1.4, waste: 2, status: 'hieu_luc' },
    { id: 10, productId: 4, materialId: 10, norm: 4, waste: 1, status: 'hieu_luc' },
    { id: 11, productId: 5, materialId: 8, norm: 1.5, waste: 3, status: 'hieu_luc' },
    { id: 12, productId: 5, materialId: 13, norm: 1, waste: 1, status: 'hieu_luc' },
    { id: 13, productId: 6, materialId: 8, norm: 2.1, waste: 3, status: 'hieu_luc' },
    { id: 14, productId: 6, materialId: 14, norm: 1.3, waste: 2, status: 'hieu_luc' },
    { id: 15, productId: 6, materialId: 15, norm: 3, waste: 1, status: 'hieu_luc' },
    { id: 16, productId: 7, materialId: 16, norm: 1.05, waste: 2, status: 'hieu_luc' },
    { id: 17, productId: 7, materialId: 11, norm: 1, waste: 1, status: 'hieu_luc' },
  ],
  plans: [
    { id: 1, code: 'KHSX-0926-01', productId: 1, order: 'DH-2026-0184', quantity: 1200, start: '2026-09-08', end: '2026-09-18', status: 'dang_thuc_hien' },
    { id: 2, code: 'KHSX-0926-02', productId: 2, order: 'DH-2026-0189', quantity: 800, start: '2026-09-12', end: '2026-09-22', status: 'cho_duyet' },
    { id: 3, code: 'KHSX-0926-03', productId: 3, order: 'DH-2026-0192', quantity: 1500, start: '2026-09-17', end: '2026-09-28', status: 'da_duyet' },
  ],
  productionOrders: [
    { id: 1, code: 'LSX-0926-01', planId: 1, quantity: 1200, completed: 820, manager: 'Nguyễn Minh Anh', start: '2026-09-08', end: '2026-09-18', status: 'dang_san_xuat' },
  ],
  productionResults: [
    { id: 1, orderId: 1, date: '2026-09-10', completed: 820, failed: 12, hours: 160, note: 'Tiến độ ổn định.' },
  ],
  purchaseRequests: [],
}

const clone = (value) => JSON.parse(JSON.stringify(value))
let database = JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(seedData)
let currentView = 'overview'
let filters = { plan: 'all', order: 'all', search: '' }

const statusInfo = {
  cho_duyet: ['Chờ duyệt', 'amber'],
  da_duyet: ['Đã duyệt', 'blue'],
  dang_thuc_hien: ['Đang thực hiện', 'blue'],
  chua_bat_dau: ['Chưa bắt đầu', 'gray'],
  dang_san_xuat: ['Đang sản xuất', 'blue'],
  tam_dung: ['Tạm dừng', 'purple'],
  huy: ['Đã hủy', 'red'],
  hieu_luc: ['Hiệu lực', 'green'],
  tam_ngung: ['Tạm ngưng', 'gray'],
  hoan_thanh: ['Hoàn thành', 'green'],
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(database)) }
function getProduct(id) { return database.products.find((item) => item.id === Number(id)) }
function getMaterial(id) { return database.materials.find((item) => item.id === Number(id)) }
function getPlan(id) { return database.plans.find((item) => item.id === Number(id)) }
function getOrder(id) { return database.productionOrders.find((item) => item.id === Number(id)) }
function number(value, digits = 0) { return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) }
function date(value) { return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) }
function badge(status) { const [label, kind] = statusInfo[status] || [status, 'gray']; return `<span class="badge ${kind}">${label}</span>` }
function nextCode(prefix, items) { return `${prefix}-${String(items.length + 1).padStart(3, '0')}` }

// Bổ sung dữ liệu mẫu cho người đã dùng bản giao diện cũ, không làm mất thao tác trước đó.
function upgradeDatabase() {
  database.products ||= []
  database.materials ||= []
  database.bom ||= []
  database.plans ||= []
  database.productionOrders ||= []
  database.productionResults ||= []
  database.purchaseRequests ||= []
  seedData.products.forEach((item) => { if (!database.products.some((current) => current.code === item.code)) database.products.push(clone(item)) })
  seedData.materials.forEach((item) => { if (!database.materials.some((current) => current.code === item.code)) database.materials.push(clone(item)) })
  seedData.bom.forEach((item) => {
    if (!database.bom.some((current) => current.id === item.id || (current.productId === item.productId && current.materialId === item.materialId))) database.bom.push(clone(item))
  })
  database.bom.forEach((item) => { item.status ||= 'hieu_luc' })
}

// Các vật tư mẫu được tách theo từng dòng định mức để người học dễ theo dõi mã vật tư, không bị lặp trong bảng.
function normalizeSampleBomMaterials() {
  const substitutions = [
    [3, 4, 12], // Áo polo dùng chỉ navy, thay vì chỉ trắng của áo sơ mi.
    [5, 6, 13], // Quần khaki dùng khóa riêng.
    [6, 9, 14], // Blazer dùng vải lót riêng.
    [6, 10, 15], // Blazer dùng nút riêng.
    [7, 2, 16], // Chân váy dùng vải tuytsi riêng.
  ]
  const activePlans = database.plans.filter((plan) => ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status))
  let changed = false
  substitutions.forEach(([productId, fromMaterialId, toMaterialId]) => {
    const item = database.bom.find((row) => row.productId === productId && row.materialId === fromMaterialId)
    if (item) { item.materialId = toMaterialId; changed = true }
  })
  if (changed) {
    activePlans.forEach(releasePlanMaterials)
    activePlans.forEach(reservePlanMaterials)
  }
}

function requirementsForPlan(plan) {
  return database.bom.filter((item) => item.productId === plan.productId && (item.status || 'hieu_luc') === 'hieu_luc').map((item) => {
    const material = getMaterial(item.materialId)
    const needed = plan.quantity * item.norm * (1 + item.waste / 100)
    return { material, norm: item.norm, waste: item.waste, needed, missing: Math.max(0, needed - material.stock) }
  })
}

// Khi duyệt, hệ thống giữ chỗ/tự trừ phần vật tư hiện có. Phần thiếu được đưa sang MRP.
function reservePlanMaterials(plan) {
  if (plan.inventoryDeducted) return []
  const shortages = []
  plan.inventoryDeductions = requirementsForPlan(plan).map((row) => {
    const reserved = Math.min(row.material.stock, row.needed)
    const missing = Math.max(0, row.needed - reserved)
    row.material.stock = Math.max(0, row.material.stock - reserved)
    if (missing > 0) shortages.push(row.material)
    return { materialId: row.material.id, quantity: reserved, missing }
  })
  plan.inventoryDeducted = true
  return shortages
}

function releasePlanMaterials(plan) {
  if (!plan.inventoryDeducted) return
    ; (plan.inventoryDeductions || []).forEach((deduction) => {
      const material = getMaterial(deduction.materialId)
      if (material) material.stock += Number(deduction.quantity || 0)
    })
  plan.inventoryDeductions = []
  plan.inventoryDeducted = false
}

function upgradeInventoryReservations() {
  database.plans.filter((plan) => ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status) && !plan.inventoryDeducted).forEach(reservePlanMaterials)
}

function aggregateRequirements() {
  const totals = new Map()
  database.plans.filter((plan) => ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status)).forEach((plan) => {
    const deducted = new Map((plan.inventoryDeductions || []).map((item) => [item.materialId, Number(item.quantity || 0)]))
    requirementsForPlan(plan).forEach((row) => {
      // Chỉ tính phần còn thiếu sau khi kho đã tự trừ/giữ chỗ.
      const outstanding = Math.max(0, row.needed - (deducted.get(row.material.id) || 0))
      totals.set(row.material.id, (totals.get(row.material.id) || 0) + outstanding)
    })
  })
  return [...totals.entries()].map(([materialId, needed]) => {
    const material = getMaterial(materialId)
    const request = database.purchaseRequests.find((item) => item.materialId === materialId)
    return { material, needed, missing: Math.max(0, needed - material.stock), request }
  })
}

upgradeDatabase()
normalizeSampleBomMaterials()
upgradeInventoryReservations()
save()

function navButton(view, label, icon) {
  return `<button class="sidebar-item ${currentView === view ? 'active' : ''}" data-view="${view}"><i>${icon}</i>${label}</button>`
}

function shell(content) {
  return `
    <header class="topbar">
      <div class="brand"><div class="brand-logo">M10</div><div><strong>TỔNG CÔNG TY MAY 10</strong><span>HỆ THỐNG QUẢN TRỊ ERP</span></div></div>
      <nav class="main-nav"><button>Trang chủ</button><button>Kinh doanh</button><button class="active">Sản xuất</button><button>Mua hàng</button><button>Kho &amp; Vật tư</button><button>Tài chính</button></nav>
      <label class="search-box"><span>⌕</span><input id="global-search" value="${filters.search}" placeholder="Tìm kiếm nhanh..." /></label>
      <div class="user-info"><div class="avatar">Q</div><div><strong>Quản trị viên</strong><span>Admin</span></div></div>
    </header>
    <div class="app-layout">
      <aside class="sidebar">
        <p class="sidebar-title">PHÂN HỆ SẢN XUẤT</p>
        ${navButton('overview', 'Tổng quan', '⌂')}
        ${navButton('plans', 'Kế hoạch sản xuất', '▤')}
        ${navButton('bom', 'Định mức nguyên liệu', '◫')}
        ${navButton('orders', 'Lệnh sản xuất', '▣')}
        ${navButton('mrp', 'Nhu cầu nguyên phụ liệu', '◇')}
        ${navButton('progress', 'Tiến độ và kết quả', '◔')}
      </aside>
      <main class="main-content">${content}</main>
    </div>
    <div id="modal-root"></div><div id="toast" aria-live="polite"></div>
  `
}

function header(title, description, action = '') {
  return `<p class="breadcrumb">Trang chủ / Sản xuất / ${title}</p><section class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</section>`
}

function planTable(items) {
  return `<div class="table-wrapper"><table class="plan-table"><thead><tr><th>Mã kế hoạch</th><th>Sản phẩm</th><th>Đơn bán hàng</th><th class="num">Số lượng</th><th>Thời hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${items.length ? items.map((plan) => {
    const canEdit = !['hoan_thanh', 'huy'].includes(plan.status)
    const canPause = ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status)
    return `<tr><td class="code">${plan.code}</td><td class="strong">${getProduct(plan.productId).name}</td><td>${plan.order}</td><td class="num">${number(plan.quantity)} ${getProduct(plan.productId).unit}</td><td>${date(plan.end)}</td><td>${badge(plan.status)}</td><td class="row-actions"><button class="action-btn view" data-action="plan-detail" data-id="${plan.id}">◉ Chi tiết</button>${canEdit ? `<button class="action-btn edit" data-action="edit-plan" data-id="${plan.id}">✎ Sửa</button>` : ''}${plan.status === 'cho_duyet' ? `<button class="action-btn approve" data-action="approve-plan" data-id="${plan.id}">✓ Duyệt</button>` : ''}${canPause ? `<button class="action-btn pause" data-action="toggle-pause-plan" data-id="${plan.id}">${plan.status === 'tam_dung' ? '▶ Tiếp tục' : 'Ⅱ Tạm dừng'}</button>` : ''}</td></tr>`
  }).join('') : `<tr><td class="empty" colspan="7">Không có kế hoạch phù hợp.</td></tr>`}</tbody></table></div>`
}

function overview() {
  const pending = database.plans.filter((item) => item.status === 'cho_duyet').length
  const active = database.productionOrders.filter((item) => item.status === 'dang_san_xuat').length
  const percent = database.productionOrders.length ? Math.round(database.productionOrders.reduce((sum, item) => sum + item.completed / item.quantity, 0) / database.productionOrders.length * 100) : 0
  const shortage = aggregateRequirements().filter((item) => item.missing > 0).length
  return shell(`
    ${header('Quản lý sản xuất', 'Theo dõi kế hoạch, lệnh sản xuất và nhu cầu nguyên phụ liệu.', '<button class="primary-button" data-action="new-plan">+ Lập kế hoạch sản xuất</button>')}
    <section class="stats-grid"><article class="stat-card"><p>Kế hoạch chờ duyệt</p><strong>${String(pending).padStart(2, '0')}</strong><span class="warning">Cần quản lý phê duyệt</span></article><article class="stat-card"><p>Lệnh đang sản xuất</p><strong>${String(active).padStart(2, '0')}</strong><span class="success">Đang triển khai tại phân xưởng</span></article><article class="stat-card"><p>Tỷ lệ hoàn thành</p><strong>${percent}%</strong><span>Trên các lệnh đang theo dõi</span></article><article class="stat-card"><p>Vật tư cần bổ sung</p><strong>${String(shortage).padStart(2, '0')}</strong><span class="warning">Cần tạo yêu cầu mua hàng</span></article></section>
    <section class="table-card"><div class="table-head"><div><h2>Kế hoạch sản xuất gần đây</h2><p>Ưu tiên các kế hoạch gần hạn giao.</p></div><button class="outline-button" data-view="plans">Xem tất cả</button></div>${planTable(database.plans.slice(0, 5))}</section>
    <section class="quick-grid"><article><div class="quick-icon blue-bg">!</div><div><h3>Việc cần xử lý</h3><p>${pending ? `${pending} kế hoạch đang chờ phê duyệt.` : 'Không có kế hoạch chờ phê duyệt.'}</p></div><button data-view="plans">Xem kế hoạch</button></article><article><div class="quick-icon amber-bg">△</div><div><h3>Cảnh báo vật tư</h3><p>${shortage ? `${shortage} loại vật tư chưa đủ cho kế hoạch.` : 'Tồn kho hiện đáp ứng nhu cầu.'}</p></div><button data-view="mrp">Kiểm tra MRP</button></article></section>
  `)
}

function plans() {
  const query = filters.search.trim().toLowerCase()
  const items = database.plans.filter((plan) => (filters.plan === 'all' || plan.status === filters.plan) && (!query || `${plan.code} ${plan.order} ${getProduct(plan.productId).name}`.toLowerCase().includes(query)))
  return shell(`
    ${header('Kế hoạch sản xuất', 'Lập, phê duyệt và theo dõi kế hoạch theo đơn bán hàng.', '<button class="primary-button" data-action="new-plan">+ Lập kế hoạch sản xuất</button>')}
    <section class="table-card"><div class="table-head"><div><h2>Danh sách kế hoạch</h2><p>${items.length} kế hoạch đang hiển thị</p></div><select id="plan-filter"><option value="all">Tất cả trạng thái</option><option value="cho_duyet">Chờ duyệt</option><option value="da_duyet">Đã duyệt</option><option value="dang_thuc_hien">Đang thực hiện</option><option value="tam_dung">Tạm dừng</option><option value="hoan_thanh">Hoàn thành</option><option value="huy">Đã hủy</option></select></div>${planTable(items)}</section>
  `)
}

function bom() {
  const query = filters.search.trim().toLowerCase()
  const rows = database.bom.filter((item) => !query || `${getProduct(item.productId).name} ${getMaterial(item.materialId).name}`.toLowerCase().includes(query))
  return shell(`
    ${header('Định mức nguyên liệu', 'Thiết lập và cập nhật mức tiêu hao nguyên phụ liệu cho mỗi sản phẩm.', '<button class="primary-button" data-action="new-bom">+ Thêm định mức</button>')}
    <section class="table-card"><div class="table-head"><div><h2>Danh mục định mức</h2><p>Dùng làm cơ sở tính nhu cầu nguyên phụ liệu và tự trừ tồn kho khi duyệt kế hoạch.</p></div></div><div class="table-wrapper"><table><thead><tr><th>Sản phẩm</th><th>Mã vật tư</th><th>Nguyên phụ liệu</th><th class="num">Định mức</th><th class="num">Hao hụt</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.map((item) => `<tr><td class="strong">${getProduct(item.productId).name}</td><td class="code">${getMaterial(item.materialId).code}</td><td>${getMaterial(item.materialId).name}</td><td class="num">${number(item.norm, 3)} ${getMaterial(item.materialId).unit}/SP</td><td class="num">${item.waste}%</td><td>${badge(item.status || 'hieu_luc')}</td><td class="row-actions"><button class="action-btn edit" data-action="edit-bom" data-id="${item.id}">✎ Cập nhật</button></td></tr>`).join('') || '<tr><td class="empty" colspan="7">Không tìm thấy định mức.</td></tr>'}</tbody></table></div></section>
  `)
}

function orders() {
  const query = filters.search.trim().toLowerCase()
  const items = database.productionOrders.filter((order) => {
    const plan = getPlan(order.planId)
    return (filters.order === 'all' || order.status === filters.order) && (!query || `${order.code} ${plan.code} ${getProduct(plan.productId).name}`.toLowerCase().includes(query))
  })
  const readyPlans = database.plans.filter((plan) => plan.status === 'da_duyet' && !database.productionOrders.some((order) => order.planId === plan.id))
  return shell(`
    ${header('Lệnh sản xuất', 'Tạo lệnh từ kế hoạch đã duyệt và theo dõi sản lượng thực hiện.', `<button class="primary-button" data-action="new-order" ${readyPlans.length ? '' : 'disabled'}>+ Lập lệnh sản xuất</button>`)}
    <section class="table-card"><div class="table-head"><div><h2>Danh sách lệnh sản xuất</h2><p>Lệnh chỉ được tạo từ kế hoạch đã duyệt.</p></div><select id="order-filter"><option value="all">Tất cả trạng thái</option><option value="chua_bat_dau">Chưa bắt đầu</option><option value="dang_san_xuat">Đang sản xuất</option><option value="tam_dung">Tạm dừng</option><option value="hoan_thanh">Hoàn thành</option><option value="huy">Đã hủy</option></select></div><div class="table-wrapper"><table><thead><tr><th>Mã lệnh</th><th>Kế hoạch</th><th>Sản phẩm</th><th class="num">Hoàn thành</th><th>Tiến độ</th><th>Trạng thái</th><th></th></tr></thead><tbody>${items.length ? items.map((order) => { const plan = getPlan(order.planId); const pct = Math.round(order.completed / order.quantity * 100); return `<tr><td class="code">${order.code}</td><td>${plan.code}</td><td class="strong">${getProduct(plan.productId).name}</td><td class="num">${number(order.completed)} / ${number(order.quantity)}</td><td><div class="mini-progress"><span style="width:${pct}%"></span></div><small>${pct}%</small></td><td>${badge(order.status)}</td><td class="row-actions">${order.status === 'chua_bat_dau' ? `<button class="action-btn approve" data-action="start-order" data-id="${order.id}">▶ Bắt đầu</button>` : ''}${order.status === 'dang_san_xuat' ? `<button class="action-btn update" data-action="add-result" data-id="${order.id}">+ Cập nhật</button>` : ''}</td></tr>` }).join('') : '<tr><td class="empty" colspan="7">Chưa có lệnh sản xuất.</td></tr>'}</tbody></table></div></section>
  `)
}

function mrp() {
  const query = filters.search.trim().toLowerCase()
  const rows = aggregateRequirements().filter((row) => !query || `${row.material.code} ${row.material.name}`.toLowerCase().includes(query))
  const shortages = rows.filter((row) => row.missing > 0)
  return shell(`
    ${header('Nhu cầu nguyên phụ liệu', 'Tự động tính nhu cầu từ kế hoạch sản xuất và định mức nguyên liệu.')}
    <section class="mrp-cards"><article><strong>${rows.length}</strong><span>Loại vật tư cần dùng</span></article><article><strong>${shortages.length}</strong><span>Loại vật tư thiếu</span></article><article><strong>${rows.filter((row) => row.request).length}</strong><span>Yêu cầu mua đã tạo</span></article></section>
    <section class="table-card"><div class="table-head"><div><h2>Kết quả hoạch định vật tư</h2><p>Cần mua = Nhu cầu - Tồn kho khả dụng.</p></div></div><div class="table-wrapper"><table><thead><tr><th>Mã vật tư</th><th>Nguyên phụ liệu</th><th class="num">Nhu cầu</th><th class="num">Tồn kho</th><th class="num">Cần mua</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td class="code">${row.material.code}</td><td class="strong">${row.material.name}</td><td class="num">${number(row.needed, 3)} ${row.material.unit}</td><td class="num">${number(row.material.stock, 3)} ${row.material.unit}</td><td class="num ${row.missing ? 'danger' : ''}">${number(row.missing, 3)} ${row.material.unit}</td><td>${row.missing ? badge('cho_duyet') : '<span class="badge green">Đủ vật tư</span>'}</td><td>${row.missing ? (row.request ? `<span class="muted">${row.request.code}</span>` : `<button class="text-button" data-action="create-request" data-id="${row.material.id}">Tạo yêu cầu mua</button>`) : '—'}</td></tr>`).join('') : '<tr><td class="empty" colspan="7">Chưa có kế hoạch đã được duyệt để tính nhu cầu.</td></tr>'}</tbody></table></div></section>
  `)
}

function orderDefects(orderId) { return database.productionResults.filter((result) => result.orderId === orderId).reduce((sum, result) => sum + Number(result.failed || 0), 0) }
function orderHours(orderId) { return database.productionResults.filter((result) => result.orderId === orderId).reduce((sum, result) => sum + Number(result.hours || 0), 0) }
function stageRows(order) {
  const pct = Math.round(order.completed / order.quantity * 100)
  return [
    ['Cắt', Math.min(100, pct + 18), 'Tổ cắt 01', 'Đã cấp vải'],
    ['May', pct, 'Chuyền may A2', 'Đang thực hiện'],
    ['Hoàn thiện', Math.max(0, pct - 16), 'Tổ hoàn thiện', 'Chờ chuyển công đoạn'],
    ['KCS', Math.max(0, pct - 34), 'Bộ phận KCS', 'Kiểm tra chất lượng'],
  ]
}

function progress() {
  const orders = database.productionOrders.filter((order) => order.status !== 'huy')
  const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0)
  const totalCompleted = orders.reduce((sum, order) => sum + order.completed, 0)
  const totalDefects = database.productionResults.reduce((sum, result) => sum + Number(result.failed || 0), 0)
  const totalHours = database.productionResults.reduce((sum, result) => sum + Number(result.hours || 0), 0)
  const totalPercent = totalQuantity ? Math.round(totalCompleted / totalQuantity * 100) : 0
  const activeOrder = orders.find((order) => order.status === 'dang_san_xuat') || orders.find((order) => order.status === 'tam_dung') || orders[0]
  const newestResults = [...database.productionResults].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return shell(`
    ${header('Tiến độ và kết quả', 'Màn hình điều hành tập trung: tiến độ lệnh, công đoạn, sản lượng, chất lượng và giờ công.')}
    <section class="command-hero">
      <div class="command-lead">
        <div class="command-title"><span class="eyebrow">ĐIỀU HÀNH SẢN XUẤT</span><h2>Toàn cảnh tiến độ phân xưởng</h2><p>Dữ liệu được cập nhật từ các lệnh sản xuất và phiếu kết quả thực tế.</p></div>
        <div class="command-progress"><div class="command-progress-head"><span>Tiến độ tổng hợp</span><strong>${totalPercent}%</strong></div><div class="command-track"><span style="width:${totalPercent}%"></span></div><div class="command-progress-foot"><span>${number(totalCompleted)} đã hoàn thành</span><span>Mục tiêu ${number(totalQuantity)} SP</span></div></div>
        <div class="command-kpis"><article><span>Lệnh đang vận hành</span><b>${String(orders.filter((order) => order.status === 'dang_san_xuat').length).padStart(2, '0')}</b><small>Chuyền đang hoạt động</small></article><article><span>Sản lượng đạt</span><b>${number(totalCompleted)}</b><small>Trên ${number(totalQuantity)} sản phẩm</small></article><article><span>Tỷ lệ lỗi</span><b>${totalCompleted + totalDefects ? number(totalDefects / (totalCompleted + totalDefects) * 100, 1) : 0}%</b><small>${number(totalDefects)} sản phẩm lỗi</small></article><article><span>Giờ công thực tế</span><b>${number(totalHours)}</b><small>Giờ đã ghi nhận</small></article></div>
      </div>
      <aside class="command-focus">${activeOrder ? (() => { const plan = getPlan(activeOrder.planId); const pct = Math.round(activeOrder.completed / activeOrder.quantity * 100); return `<div class="focus-top"><span>ƯU TIÊN THEO DÕI</span>${badge(activeOrder.status)}</div><p class="code">${activeOrder.code}</p><h3>${getProduct(plan.productId).name}</h3><p class="focus-meta">${plan.code} · Hạn hoàn thành ${date(activeOrder.end)}</p><div class="focus-number"><strong>${pct}%</strong><span>${number(activeOrder.completed)} / ${number(activeOrder.quantity)} ${getProduct(plan.productId).unit}</span></div><div class="focus-bar"><span style="width:${pct}%"></span></div><div class="focus-footer"><span>Phụ trách <b>${activeOrder.manager}</b></span>${activeOrder.status === 'dang_san_xuat' ? `<button class="focus-action" data-action="add-result" data-id="${activeOrder.id}">Cập nhật kết quả →</button>` : ''}</div>` })() : '<div class="focus-empty"><b>Chưa có lệnh sản xuất</b><span>Hãy duyệt kế hoạch và lập lệnh để bắt đầu theo dõi.</span></div>'}</aside>
    </section>
    <section class="progress-layout">
      <section class="table-card wide-panel"><div class="table-head"><div><h2>Tiến độ theo lệnh sản xuất</h2><p>Theo dõi từng lệnh từ sản lượng kế hoạch đến chất lượng thực tế.</p></div><span class="panel-count">${orders.length} lệnh</span></div><div class="table-wrapper"><table class="progress-table"><thead><tr><th>Lệnh / Sản phẩm</th><th>Phân xưởng phụ trách</th><th class="num">Kế hoạch</th><th class="num">Đạt / Lỗi</th><th>Tiến độ thực hiện</th><th>Hạn hoàn thành</th><th>Trạng thái</th><th></th></tr></thead><tbody>${orders.length ? orders.map((order) => { const plan = getPlan(order.planId); const pct = Math.round(order.completed / order.quantity * 100); const defects = orderDefects(order.id); return `<tr><td><span class="code">${order.code}</span><b class="table-product">${getProduct(plan.productId).name}</b><small>${plan.code}</small></td><td><b>${order.manager}</b><small>Chuyền may A2</small></td><td class="num"><b>${number(order.quantity)}</b><small>${getProduct(plan.productId).unit}</small></td><td class="num"><b class="good">${number(order.completed)}</b><small class="${defects ? 'danger' : ''}">Lỗi ${number(defects)}</small></td><td><div class="progress-cell"><div class="mini-progress"><span style="width:${pct}%"></span></div><b>${pct}%</b></div></td><td><b>${date(order.end)}</b><small>${order.status === 'hoan_thanh' ? 'Đã hoàn tất' : 'Theo kế hoạch'}</small></td><td>${badge(order.status)}</td><td class="row-actions">${order.status === 'dang_san_xuat' ? `<button class="action-btn update" data-action="add-result" data-id="${order.id}">+ Kết quả</button>` : ''}</td></tr>` }).join('') : '<tr><td class="empty" colspan="8">Chưa có lệnh sản xuất để theo dõi.</td></tr>'}</tbody></table></div></section>
      <aside class="result-log"><div class="result-log-head"><div><span class="eyebrow">NHẬT KÝ MỚI NHẤT</span><h2>Kết quả ghi nhận</h2></div><span class="log-icon">◔</span></div>${newestResults.length ? newestResults.map((result) => { const order = getOrder(result.orderId); const plan = getPlan(order.planId); return `<article class="result-item"><div class="result-date"><b>${date(result.date)}</b><span>${order.code}</span></div><div><b>${getProduct(plan.productId).name}</b><p>Đạt <strong>${number(result.completed)}</strong> · Lỗi <span class="danger">${number(result.failed)}</span></p><small>${number(result.hours, 1)} giờ công${result.note ? ` · ${result.note}` : ''}</small></div></article>` }).join('') : '<p class="empty-log">Chưa có kết quả sản xuất được ghi nhận.</p>'}</aside>
    </section>
    <section class="stage-panel"><div class="stage-panel-head"><div><span class="eyebrow">KIỂM SOÁT CÔNG ĐOẠN</span><h2>${activeOrder ? `Luồng công đoạn của ${activeOrder.code}` : 'Luồng công đoạn sản xuất'}</h2><p>${activeOrder ? `${getProduct(getPlan(activeOrder.planId).productId).name} · chỉ số mô phỏng theo tiến độ lệnh hiện tại.` : 'Sẽ có dữ liệu khi phát sinh lệnh sản xuất.'}</p></div>${activeOrder ? `<div class="stage-summary"><b>${number(activeOrder.completed)}</b><span>sản phẩm hoàn thành</span></div>` : ''}</div><div class="stage-grid">${activeOrder ? stageRows(activeOrder).map(([name, pct, team, state], index) => `<article class="stage-card ${pct >= 100 ? 'done' : ''}"><div class="stage-index">0${index + 1}</div><div class="stage-card-head"><h3>${name}</h3><span>${pct}%</span></div><p>${team}</p><div class="stage-bar"><span style="width:${pct}%"></span></div><small>${state}</small></article>`).join('') : '<p class="empty-card">Chưa có công đoạn nào để hiển thị.</p>'}</div></section>
  `)
}

function render() {
  const views = { overview, plans, bom, orders, mrp, progress }
  document.querySelector('#app').innerHTML = views[currentView]()
  bindEvents()
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { currentView = button.dataset.view; render() }))
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => performAction(button.dataset.action, Number(button.dataset.id))))
  document.querySelector('#plan-filter')?.addEventListener('change', (event) => { filters.plan = event.target.value; render() })
  document.querySelector('#order-filter')?.addEventListener('change', (event) => { filters.order = event.target.value; render() })
  const planFilter = document.querySelector('#plan-filter'); if (planFilter) planFilter.value = filters.plan
  const orderFilter = document.querySelector('#order-filter'); if (orderFilter) orderFilter.value = filters.order
  document.querySelector('#global-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { filters.search = event.target.value; render() } })
}

function performAction(action, id) {
  if (action === 'new-plan') return planModal()
  if (action === 'plan-detail') return planDetail(id)
  if (action === 'edit-plan') return planModal(id)
  if (action === 'approve-plan') {
    const plan = getPlan(id)
    const hasActiveBom = database.bom.some((item) => item.productId === plan.productId && (item.status || 'hieu_luc') === 'hieu_luc')
    if (!hasActiveBom) return alert(`Chưa thể duyệt ${plan.code} vì sản phẩm ${getProduct(plan.productId).code} chưa có định mức nguyên liệu hiệu lực. Hãy vào mục “Định mức nguyên liệu” để thêm định mức trước.`)
    if (!confirm(`Duyệt ${plan.code}? Hệ thống sẽ tính định mức và tự trừ vật tư hiện có trong kho.`)) return
    const shortages = reservePlanMaterials(plan)
    plan.status = 'da_duyet'
    save(); render()
    return toast(shortages.length ? `Đã duyệt ${plan.code}; kho đã tự trừ, còn thiếu ${shortages.length} loại vật tư.` : `Đã duyệt ${plan.code} và tự trừ vật tư theo định mức.`)
  }
  if (action === 'toggle-pause-plan') {
    const plan = getPlan(id)
    const order = database.productionOrders.find((item) => item.planId === plan.id)
    const resume = plan.status === 'tam_dung'
    const message = resume
      ? `Tiếp tục ${plan.code}? Lệnh sản xuất liên quan sẽ được chuyển về trạng thái đang thực hiện.`
      : `Tạm dừng ${plan.code}? Vật tư đã giữ chỗ vẫn được bảo lưu và lệnh sản xuất liên quan sẽ tạm ngưng.`
    if (!confirm(message)) return
    plan.status = resume ? (order ? 'dang_thuc_hien' : 'da_duyet') : 'tam_dung'
    if (order) order.status = resume ? (order.completed >= order.quantity ? 'hoan_thanh' : 'dang_san_xuat') : 'tam_dung'
    save(); render()
    return toast(resume ? `Đã tiếp tục kế hoạch ${plan.code}.` : `Đã tạm dừng kế hoạch ${plan.code}; vật tư đã giữ chỗ vẫn được bảo lưu.`)
  }
  if (action === 'cancel-plan') {
    const plan = getPlan(id)
    const order = database.productionOrders.find((item) => item.planId === plan.id)
    if (order && (order.completed > 0 || database.productionResults.some((result) => result.orderId === order.id))) return alert('Không thể hủy kế hoạch đã phát sinh kết quả sản xuất. Hãy hoàn tất hoặc xử lý lệnh sản xuất trước.')
    if (!confirm(`Hủy ${plan.code}? Vật tư đã tự trừ cho kế hoạch này sẽ được hoàn lại kho.`)) return
    releasePlanMaterials(plan)
    plan.status = 'huy'
    if (order) order.status = 'huy'
    save(); render()
    return toast(`Đã hủy ${plan.code} và hoàn lại vật tư đã giữ chỗ.`)
  }
  if (action === 'new-bom') return bomModal()
  if (action === 'edit-bom') return bomModal(id)
  if (action === 'new-order') return orderModal()
  if (action === 'start-order') { const order = getOrder(id); order.status = 'dang_san_xuat'; save(); render(); return toast(`Đã bắt đầu ${order.code}.`) }
  if (action === 'add-result') return resultModal(id)
  if (action === 'create-request') { const item = aggregateRequirements().find((row) => row.material.id === id); const request = { id: Date.now(), code: nextCode('YCMH', database.purchaseRequests), materialId: id, quantity: item.missing, status: 'cho_duyet' }; database.purchaseRequests.push(request); save(); render(); return toast(`Đã tạo yêu cầu mua ${request.code}.`) }
  if (action === 'reset' && confirm('Khôi phục toàn bộ dữ liệu mẫu? Các thao tác demo sẽ bị xóa.')) { database = clone(seedData); upgradeDatabase(); upgradeInventoryReservations(); save(); render(); toast('Đã khôi phục dữ liệu mẫu.') }
}

function openModal(content) {
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop">${content}</div>`
  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal))
  document.querySelector('#modal-root').querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => performAction(button.dataset.action, Number(button.dataset.id))))
}
function closeModal() { document.querySelector('#modal-root').innerHTML = '' }
function options(items, text) { return items.map((item) => `<option value="${item.id}">${text(item)}</option>`).join('') }

function planModal(id = null) {
  const plan = id ? getPlan(id) : null
  const productOptions = database.products.map((item) => `<option value="${item.id}" ${item.id === plan?.productId ? 'selected' : ''}>${item.code} - ${item.name}</option>`).join('')
  const title = plan ? `Sửa kế hoạch ${plan.code}` : 'Lập kế hoạch sản xuất'
  const description = plan ? 'Kế hoạch đã duyệt sẽ tự tính lại vật tư sau khi bạn lưu thay đổi.' : 'Kế hoạch mới được lưu với trạng thái chờ duyệt.'
  openModal(`<form class="modal modal-wide" id="plan-form"><div class="modal-head"><div><h2>${title}</h2><p>${description}</p></div><button type="button" data-close-modal>×</button></div><div class="modal-body"><div class="form-grid"><label>Mã kế hoạch<input name="code" value="${plan?.code || nextCode('KHSX-0926', database.plans)}" required /></label><label>Đơn bán hàng<input name="order" value="${plan?.order || ''}" placeholder="VD: DH-2026-0200" required /></label><label class="full-field">Sản phẩm<select name="productId" id="plan-product"><option value="new">＋ Thêm sản phẩm mới cho đơn hàng này</option>${productOptions}</select><small class="field-hint">Nếu đơn hàng có mã sản phẩm mới, chọn dòng đầu tiên để tự tạo mã và tên sản phẩm.</small></label><div id="new-product-fields" class="new-product-fields" hidden><label>Mã sản phẩm mới<input name="newProductCode" placeholder="VD: SP008" /></label><label>Tên sản phẩm mới<input name="newProductName" placeholder="VD: Áo khoác nữ ghi" /></label><label>Đơn vị tính<select name="newProductUnit"><option value="cái">Cái</option><option value="bộ">Bộ</option><option value="chiếc">Chiếc</option></select></label></div><label>Số lượng<input name="quantity" type="number" min="1" value="${plan?.quantity || 500}" required /></label><label>Ngày bắt đầu<input name="start" type="date" value="${plan?.start || '2026-09-20'}" required /></label><label>Ngày kết thúc<input name="end" type="date" value="${plan?.end || '2026-09-30'}" required /></label></div></div><div class="modal-foot"><button type="button" class="outline-button" data-close-modal>Hủy</button><button class="primary-button" type="submit">${plan ? 'Lưu thay đổi' : 'Lưu kế hoạch'}</button></div></form>`)
  const productSelect = document.querySelector('#plan-product')
  const customProductFields = document.querySelector('#new-product-fields')
  const toggleNewProduct = () => { customProductFields.hidden = productSelect.value !== 'new' }
  productSelect.addEventListener('change', toggleNewProduct)
  toggleNewProduct()
  document.querySelector('#plan-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const code = form.get('code').trim().toUpperCase()
    if (form.get('end') < form.get('start')) return alert('Ngày kết thúc phải sau ngày bắt đầu.')
    if (database.plans.some((item) => item.code === code && item.id !== plan?.id)) return alert('Mã kế hoạch đã tồn tại.')
    let productId = form.get('productId')
    if (productId === 'new') {
      const productCode = form.get('newProductCode').trim().toUpperCase()
      const productName = form.get('newProductName').trim()
      if (!productCode || !productName) return alert('Vui lòng nhập mã và tên sản phẩm mới.')
      if (database.products.some((item) => item.code === productCode)) return alert('Mã sản phẩm đã tồn tại. Hãy dùng mã khác.')
      productId = Math.max(0, ...database.products.map((item) => item.id)) + 1
      database.products.push({ id: productId, code: productCode, name: productName, unit: form.get('newProductUnit') })
    }
    const values = { code, order: form.get('order').trim(), productId: Number(productId), quantity: Number(form.get('quantity')), start: form.get('start'), end: form.get('end') }
    const linkedOrder = plan && database.productionOrders.find((item) => item.planId === plan.id)
    if (linkedOrder && values.quantity < linkedOrder.completed) return alert(`Số lượng kế hoạch không thể nhỏ hơn sản lượng đã hoàn thành (${number(linkedOrder.completed)}).`)
    if (plan) {
      const keepReservation = plan.inventoryDeducted
      if (keepReservation) releasePlanMaterials(plan)
      Object.assign(plan, values)
      if (linkedOrder) linkedOrder.quantity = values.quantity
      if (keepReservation || ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status)) reservePlanMaterials(plan)
    } else database.plans.push({ id: Date.now(), ...values, status: 'cho_duyet' })
    save(); closeModal(); currentView = 'plans'; filters.plan = 'all'; render()
    toast(plan ? 'Đã cập nhật kế hoạch và tính lại vật tư liên quan.' : 'Đã tạo kế hoạch mới. Hãy duyệt để hệ thống tự trừ vật tư.')
  })
}

function bomModal(id = null) {
  const bomItem = id ? database.bom.find((item) => item.id === id) : null
  const productOptions = database.products.map((item) => `<option value="${item.id}" ${item.id === bomItem?.productId ? 'selected' : ''}>${item.code} - ${item.name}</option>`).join('')
  const materialOptions = database.materials.map((item) => `<option value="${item.id}" ${item.id === bomItem?.materialId ? 'selected' : ''}>${item.code} - ${item.name}</option>`).join('')
  openModal(`<form class="modal modal-wide" id="bom-form"><div class="modal-head"><div><h2>${bomItem ? 'Cập nhật định mức nguyên liệu' : 'Thêm định mức nguyên liệu'}</h2><p>Bạn có thể chọn vật tư sẵn có hoặc nhập một nguyên phụ liệu mới trực tiếp tại đây.</p></div><button type="button" data-close-modal>×</button></div><div class="modal-body"><div class="form-grid"><label>Sản phẩm<select name="productId">${productOptions}</select></label><label>Trạng thái định mức<select name="status"><option value="hieu_luc" ${(bomItem?.status || 'hieu_luc') === 'hieu_luc' ? 'selected' : ''}>Hiệu lực</option><option value="tam_ngung" ${bomItem?.status === 'tam_ngung' ? 'selected' : ''}>Tạm ngưng</option></select></label><label class="full-field">Nguyên phụ liệu<select name="materialId" id="bom-material"><option value="new">＋ Nhập nguyên phụ liệu mới</option>${materialOptions}</select><small class="field-hint">Chọn “Nhập nguyên phụ liệu mới” nếu mã vật tư chưa có trong danh mục.</small></label><div id="new-material-fields" class="new-material-fields" hidden><label>Mã vật tư mới<input name="newMaterialCode" placeholder="VD: VT017" /></label><label>Tên nguyên phụ liệu<input name="newMaterialName" placeholder="VD: Dây viền cổ áo xanh" /></label><label>Đơn vị tính<select name="newMaterialUnit"><option value="mét">Mét</option><option value="cuộn">Cuộn</option><option value="cái">Cái</option><option value="kg">Kg</option></select></label><label>Tồn kho ban đầu<input name="newMaterialStock" type="number" min="0" step="0.001" value="0" /></label></div><label>Định mức / sản phẩm<input name="norm" type="number" step="0.001" min="0.001" value="${bomItem?.norm || ''}" required /></label><label>Tỷ lệ hao hụt (%)<input name="waste" type="number" step="0.1" min="0" value="${bomItem?.waste ?? 2}" required /></label></div></div><div class="modal-foot"><button type="button" class="outline-button" data-close-modal>Hủy</button><button class="primary-button" type="submit">${bomItem ? 'Lưu cập nhật' : 'Lưu định mức'}</button></div></form>`)
  const materialSelect = document.querySelector('#bom-material')
  const newMaterialFields = document.querySelector('#new-material-fields')
  const toggleNewMaterial = () => { newMaterialFields.hidden = materialSelect.value !== 'new' }
  materialSelect.addEventListener('change', toggleNewMaterial)
  toggleNewMaterial()
  document.querySelector('#bom-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    let materialId = form.get('materialId')
    if (materialId === 'new') {
      const materialCode = form.get('newMaterialCode').trim().toUpperCase()
      const materialName = form.get('newMaterialName').trim()
      if (!materialCode || !materialName) return alert('Vui lòng nhập mã và tên nguyên phụ liệu mới.')
      if (database.materials.some((item) => item.code === materialCode)) return alert('Mã vật tư đã tồn tại. Hãy nhập một mã khác.')
      materialId = Math.max(0, ...database.materials.map((item) => item.id)) + 1
      database.materials.push({ id: materialId, code: materialCode, name: materialName, unit: form.get('newMaterialUnit'), stock: Number(form.get('newMaterialStock')), minimum: 0 })
    }
    const values = { productId: Number(form.get('productId')), materialId: Number(materialId), norm: Number(form.get('norm')), waste: Number(form.get('waste')), status: form.get('status') }
    if (database.bom.some((item) => item.productId === values.productId && item.materialId === values.materialId && item.id !== bomItem?.id)) return alert('Sản phẩm này đã có định mức cho vật tư đã chọn.')
    const affectedProducts = new Set([values.productId, bomItem?.productId].filter(Boolean))
    const affectedPlans = database.plans.filter((plan) => affectedProducts.has(plan.productId) && ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status))
    affectedPlans.forEach(releasePlanMaterials)
    if (bomItem) Object.assign(bomItem, values)
    else database.bom.push({ id: Date.now(), ...values })
    affectedPlans.forEach(reservePlanMaterials)
    save(); closeModal(); render()
    toast(bomItem ? 'Đã cập nhật định mức và tính lại vật tư của kế hoạch liên quan.' : 'Đã thêm định mức nguyên phụ liệu.')
  })
}

function orderModal() {
  const plans = database.plans.filter((plan) => plan.status === 'da_duyet' && !database.productionOrders.some((order) => order.planId === plan.id))
  if (!plans.length) return toast('Chưa có kế hoạch đã duyệt để lập lệnh sản xuất.')
  openModal(`<form class="modal" id="order-form"><div class="modal-head"><div><h2>Lập lệnh sản xuất</h2><p>Chọn một kế hoạch đã được phê duyệt.</p></div><button type="button" data-close-modal>×</button></div><div class="modal-body"><div class="form-grid"><label>Kế hoạch<select name="planId">${options(plans, (item) => `${item.code} - ${getProduct(item.productId).name}`)}</select></label><label>Mã lệnh<input name="code" value="${nextCode('LSX-0926', database.productionOrders)}" required /></label><label>Người phụ trách<input name="manager" value="Nguyễn Minh Anh" required /></label><label>Ngày bắt đầu<input name="start" type="date" value="2026-09-20" required /></label><label>Ngày kết thúc yêu cầu<input name="end" type="date" value="2026-09-30" required /></label></div></div><div class="modal-foot"><button type="button" class="outline-button" data-close-modal>Hủy</button><button class="primary-button" type="submit">Lưu lệnh sản xuất</button></div></form>`)
  document.querySelector('#order-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const plan = getPlan(form.get('planId')); plan.status = 'dang_thuc_hien'; database.productionOrders.push({ id: Date.now(), code: form.get('code').trim(), planId: plan.id, quantity: plan.quantity, completed: 0, manager: form.get('manager').trim(), start: form.get('start'), end: form.get('end'), status: 'chua_bat_dau' }); save(); closeModal(); currentView = 'orders'; render(); toast('Đã lập lệnh sản xuất.') })
}

function resultModal(id) {
  const order = getOrder(id)
  openModal(`<form class="modal" id="result-form"><div class="modal-head"><div><h2>Cập nhật ${order.code}</h2><p>Còn có thể hoàn thành ${number(order.quantity - order.completed)} sản phẩm.</p></div><button type="button" data-close-modal>×</button></div><div class="modal-body"><div class="form-grid"><label>Ngày báo cáo<input name="date" type="date" value="2026-09-10" required /></label><label>Sản lượng hoàn thành<input name="completed" type="number" min="0" max="${order.quantity - order.completed}" value="0" required /></label><label>Sản lượng lỗi<input name="failed" type="number" min="0" value="0" required /></label><label>Giờ công thực tế<input name="hours" type="number" min="0" step="0.5" value="8" required /></label><label class="full-field">Ghi chú<input name="note" placeholder="VD: Hoàn thành công đoạn may thân áo" /></label></div></div><div class="modal-foot"><button type="button" class="outline-button" data-close-modal>Hủy</button><button class="primary-button" type="submit">Cập nhật kết quả</button></div></form>`)
  document.querySelector('#result-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const completed = Number(form.get('completed')); order.completed = Math.min(order.quantity, order.completed + completed); order.status = order.completed === order.quantity ? 'hoan_thanh' : 'dang_san_xuat'; const plan = getPlan(order.planId); if (order.status === 'hoan_thanh') plan.status = 'hoan_thanh'; database.productionResults.push({ id: Date.now(), orderId: order.id, date: form.get('date'), completed, failed: Number(form.get('failed')), hours: Number(form.get('hours')), note: form.get('note').trim() }); save(); closeModal(); render(); toast(order.status === 'hoan_thanh' ? 'Lệnh sản xuất đã hoàn thành.' : 'Đã cập nhật tiến độ sản xuất.') })
}

function planDetail(id) {
  const plan = getPlan(id); const product = getProduct(plan.productId); const rows = requirementsForPlan(plan)
  const allocations = new Map((plan.inventoryDeductions || []).map((item) => [item.materialId, item]))
  const canCancel = !['hoan_thanh', 'huy'].includes(plan.status)
  openModal(`<section class="modal modal-wide"><div class="modal-head"><div><h2>Chi tiết ${plan.code}</h2><p>${badge(plan.status)}</p></div><button type="button" data-close-modal>×</button></div><div class="modal-body"><div class="detail-grid"><div><span>Sản phẩm</span><b>${product.name}</b></div><div><span>Đơn bán hàng</span><b>${plan.order}</b></div><div><span>Số lượng</span><b>${number(plan.quantity)} ${product.unit}</b></div><div><span>Thời hạn</span><b>${date(plan.end)}</b></div></div><h3>Nhu cầu nguyên phụ liệu ${plan.inventoryDeducted ? 'và lượng đã giữ chỗ' : 'ước tính'}</h3><div class="detail-table"><table><thead><tr><th>Mã</th><th>Vật tư</th><th class="num">Nhu cầu</th><th class="num">Đã trừ kho</th><th class="num">Tồn kho hiện tại</th><th>Đáp ứng</th></tr></thead><tbody>${rows.length ? rows.map((item) => { const allocation = allocations.get(item.material.id); const reserved = allocation?.quantity || 0; const missing = allocation ? Number(allocation.missing || 0) : item.missing; return `<tr><td class="code">${item.material.code}</td><td>${item.material.name}</td><td class="num">${number(item.needed, 3)} ${item.material.unit}</td><td class="num ${reserved ? 'good' : ''}">${plan.inventoryDeducted ? `${number(reserved, 3)} ${item.material.unit}` : 'Chưa duyệt'}</td><td class="num">${number(item.material.stock, 3)} ${item.material.unit}</td><td class="${missing ? 'danger' : 'good'}">${missing ? `Thiếu ${number(missing, 3)}` : 'Đủ vật tư'}</td></tr>` }).join('') : '<tr><td class="empty" colspan="6">Sản phẩm chưa có định mức. Hãy cập nhật ở mục Định mức nguyên liệu.</td></tr>'}</tbody></table></div></div><div class="modal-foot">${canCancel ? `<button class="danger-button" type="button" data-action="cancel-plan" data-id="${plan.id}">× Hủy kế hoạch</button>` : ''}<button class="primary-button" type="button" data-close-modal>Đóng</button></div></section>`)
}

function toast(message) { const element = document.querySelector('#toast'); element.textContent = message; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 2800) }

render()
