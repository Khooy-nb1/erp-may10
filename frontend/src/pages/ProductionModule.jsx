import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardList,
  Factory,
  FilePenLine,
  FilePlus2,
  ListChecks,
  PackagePlus,
  Pause,
  Play,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
  X,
} from 'lucide-react';
import ModuleHeader from '../components/layout/ModuleHeader';
import Toast from '../components/Toast';
import { useAuth } from '../components/rbac/AuthContext';

// PH2 — Sản xuất & Kế hoạch NPL
// Dữ liệu demo chỉ phục vụ giao diện. Khi backend PH2 hoàn thiện, thay lớp localStorage này bằng service/API dùng chung.
const STORAGE_KEY = 'erp_may10_production_module_v2';

const clone = (value) => JSON.parse(JSON.stringify(value));
const formatNumber = (value, digits = 0) => new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
}).format(Number(value || 0));
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—';
const uid = () => Date.now() + Math.floor(Math.random() * 1000);

const STATUS = {
  cho_duyet: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  da_duyet: { label: 'Đã duyệt', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  dang_thuc_hien: { label: 'Đang thực hiện', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  chua_bat_dau: { label: 'Chưa bắt đầu', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  dang_san_xuat: { label: 'Đang sản xuất', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  tam_dung: { label: 'Tạm dừng', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  hoan_thanh: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  huy: { label: 'Đã hủy', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  hieu_luc: { label: 'Hiệu lực', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tam_ngung: { label: 'Tạm ngưng', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

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
    { id: 1, code: 'VT001', name: 'Vải kate trắng', unit: 'mét', stock: 2600, minimum: 300 },
    { id: 2, code: 'VT002', name: 'Vải tuytsi đen', unit: 'mét', stock: 1100, minimum: 200 },
    { id: 3, code: 'VT003', name: 'Vải cotton xanh navy', unit: 'mét', stock: 1450, minimum: 400 },
    { id: 4, code: 'VT004', name: 'Chỉ may trắng', unit: 'cuộn', stock: 72, minimum: 30 },
    { id: 5, code: 'VT005', name: 'Cúc áo sơ mi', unit: 'cái', stock: 9000, minimum: 1000 },
    { id: 6, code: 'VT006', name: 'Khóa quần âu', unit: 'cái', stock: 1600, minimum: 300 },
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
};

const getProduct = (db, id) => db.products.find((item) => item.id === Number(id));
const getMaterial = (db, id) => db.materials.find((item) => item.id === Number(id));
const getPlan = (db, id) => db.plans.find((item) => item.id === Number(id));
const getOrder = (db, id) => db.productionOrders.find((item) => item.id === Number(id));

function requirementsForPlan(db, plan) {
  return db.bom
    .filter((item) => item.productId === plan.productId && (item.status || 'hieu_luc') === 'hieu_luc')
    .map((item) => {
      const material = getMaterial(db, item.materialId);
      const needed = plan.quantity * item.norm * (1 + item.waste / 100);
      return { ...item, material, needed, missing: Math.max(0, needed - material.stock) };
    });
}

function reservePlanMaterials(db, plan) {
  if (plan.inventoryDeducted) return [];
  const shortages = [];
  plan.inventoryDeductions = requirementsForPlan(db, plan).map((row) => {
    const quantity = Math.min(row.material.stock, row.needed);
    const missing = Math.max(0, row.needed - quantity);
    row.material.stock = Math.max(0, row.material.stock - quantity);
    if (missing > 0) shortages.push(row.material.id);
    return { materialId: row.material.id, quantity, missing };
  });
  plan.inventoryDeducted = true;
  return shortages;
}

function releasePlanMaterials(db, plan) {
  if (!plan.inventoryDeducted) return;
  (plan.inventoryDeductions || []).forEach((deduction) => {
    const material = getMaterial(db, deduction.materialId);
    if (material) material.stock += Number(deduction.quantity || 0);
  });
  plan.inventoryDeductions = [];
  plan.inventoryDeducted = false;
}

function aggregateRequirements(db) {
  const totals = new Map();
  db.plans
    .filter((plan) => ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status))
    .forEach((plan) => {
      const reserved = new Map((plan.inventoryDeductions || []).map((row) => [row.materialId, Number(row.quantity || 0)]));
      requirementsForPlan(db, plan).forEach((row) => {
        const outstanding = Math.max(0, row.needed - (reserved.get(row.material.id) || 0));
        totals.set(row.material.id, (totals.get(row.material.id) || 0) + outstanding);
      });
    });
  return [...totals.entries()].map(([materialId, needed]) => {
    const material = getMaterial(db, materialId);
    return {
      material,
      needed,
      missing: Math.max(0, needed - material.stock),
      request: db.purchaseRequests.find((request) => request.materialId === materialId),
    };
  });
}

function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const db = raw ? JSON.parse(raw) : clone(seedData);
    db.bom.forEach((item) => { item.status ||= 'hieu_luc'; });
    db.plans.filter((plan) => ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status) && !plan.inventoryDeducted)
      .forEach((plan) => reservePlanMaterials(db, plan));
    return db;
  } catch {
    return clone(seedData);
  }
}

function StatusBadge({ status }) {
  const config = STATUS[status] || STATUS.chua_bat_dau;
  return <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>{config.label}</span>;
}

function PrimaryButton({ children, className = '', ...props }) {
  return <button {...props} className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F5FAF] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0D4E90] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

function OutlineButton({ children, className = '', ...props }) {
  return <button {...props} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#DCEAF4] bg-white px-3 py-2 text-xs font-semibold text-[#0F4C81] transition hover:border-[#96C8EB] hover:bg-[#EAF5FC] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

function Panel({ children, className = '' }) {
  return <section className={`overflow-hidden rounded-2xl border border-[#E2EDF5] bg-white shadow-sm ${className}`}>{children}</section>;
}

function Modal({ children, onClose, wide = false }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
      {children}
      <button type="button" onClick={onClose} className="sr-only">Đóng</button>
    </div>
  </div>;
}

function ModalHeader({ title, description, onClose }) {
  return <div className="flex items-start justify-between gap-5 border-b border-[#E2EDF5] bg-[#F9FCFE] px-5 py-4">
    <div><h2 className="text-base font-bold text-[#172033]">{title}</h2><p className="mt-1 text-xs leading-relaxed text-[#5F6F82]">{description}</p></div>
    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
  </div>;
}

function Field({ label, children, hint, className = '' }) {
  return <label className={`flex flex-col gap-1.5 text-xs font-semibold text-[#3D5D72] ${className}`}>
    <span>{label}</span>{children}{hint && <span className="text-[10px] font-normal leading-relaxed text-[#8096A5]">{hint}</span>}
  </label>;
}

const inputClass = 'w-full rounded-lg border border-[#DCEAF4] bg-white px-3 py-2 text-xs font-normal text-[#172033] outline-none transition focus:border-[#5AA7D9] focus:ring-2 focus:ring-[#EAF5FC]';

function PlanModal({ database, plan, onClose, onSave }) {
  const [form, setForm] = useState({
    code: plan?.code || `KHSX-0926-${String(database.plans.length + 1).padStart(2, '0')}`,
    order: plan?.order || '', productId: String(plan?.productId || database.products[0]?.id || ''),
    quantity: plan?.quantity || 500, start: plan?.start || '2026-09-20', end: plan?.end || '2026-09-30',
    newProductCode: '', newProductName: '', newProductUnit: 'cái',
  });
  const isNew = form.productId === 'new';
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => { event.preventDefault(); onSave(form); };
  return <Modal onClose={onClose} wide><form onSubmit={submit}>
    <ModalHeader title={plan ? `Cập nhật ${plan.code}` : 'Lập kế hoạch sản xuất'} description={plan ? 'Kế hoạch đã duyệt sẽ được tính lại lượng vật tư giữ chỗ sau khi lưu.' : 'Kế hoạch mới sẽ chờ quản lý phê duyệt trước khi phát hành lệnh sản xuất.'} onClose={onClose} />
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <Field label="Mã kế hoạch"><input required value={form.code} onChange={(event) => change('code', event.target.value)} className={inputClass} /></Field>
      <Field label="Đơn bán hàng"><input required placeholder="VD: DH-2026-0200" value={form.order} onChange={(event) => change('order', event.target.value)} className={inputClass} /></Field>
      <Field label="Sản phẩm" className="md:col-span-2" hint="Chọn “Thêm sản phẩm mới” nếu mã sản phẩm của đơn hàng chưa có trong danh mục.">
        <select value={form.productId} onChange={(event) => change('productId', event.target.value)} className={inputClass}><option value="new">＋ Thêm sản phẩm mới cho đơn hàng này</option>{database.products.map((product) => <option key={product.id} value={product.id}>{product.code} — {product.name}</option>)}</select>
      </Field>
      {isNew && <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-[#96C8EB] bg-[#F4FAFE] p-4 md:col-span-2 md:grid-cols-[1fr_1.5fr_.7fr]">
        <Field label="Mã sản phẩm mới"><input required value={form.newProductCode} placeholder="VD: SP008" onChange={(event) => change('newProductCode', event.target.value)} className={inputClass} /></Field>
        <Field label="Tên sản phẩm mới"><input required value={form.newProductName} placeholder="VD: Áo khoác nữ ghi" onChange={(event) => change('newProductName', event.target.value)} className={inputClass} /></Field>
        <Field label="Đơn vị tính"><select value={form.newProductUnit} onChange={(event) => change('newProductUnit', event.target.value)} className={inputClass}><option>cái</option><option>bộ</option><option>chiếc</option></select></Field>
      </div>}
      <Field label="Số lượng"><input required min="1" type="number" value={form.quantity} onChange={(event) => change('quantity', event.target.value)} className={inputClass} /></Field>
      <div className="hidden md:block" />
      <Field label="Ngày bắt đầu"><input required type="date" value={form.start} onChange={(event) => change('start', event.target.value)} className={inputClass} /></Field>
      <Field label="Ngày kết thúc"><input required type="date" value={form.end} onChange={(event) => change('end', event.target.value)} className={inputClass} /></Field>
    </div>
    <div className="flex justify-end gap-2 border-t border-[#E2EDF5] bg-[#F9FCFE] px-5 py-4"><OutlineButton type="button" onClick={onClose}>Hủy</OutlineButton><PrimaryButton type="submit"><Check className="h-3.5 w-3.5" />{plan ? 'Lưu thay đổi' : 'Lưu kế hoạch'}</PrimaryButton></div>
  </form></Modal>;
}

function BomModal({ database, bomItem, onClose, onSave }) {
  const [form, setForm] = useState({
    productId: String(bomItem?.productId || database.products[0]?.id || ''), materialId: String(bomItem?.materialId || database.materials[0]?.id || ''),
    norm: bomItem?.norm || '', waste: bomItem?.waste ?? 2, status: bomItem?.status || 'hieu_luc',
    newMaterialCode: '', newMaterialName: '', newMaterialUnit: 'mét', newMaterialStock: 0,
  });
  const isNewMaterial = form.materialId === 'new';
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <ModalHeader title={bomItem ? 'Cập nhật định mức nguyên liệu' : 'Thêm định mức nguyên liệu'} description="Có thể chọn vật tư sẵn có hoặc tạo nguyên phụ liệu mới trực tiếp tại biểu mẫu này." onClose={onClose} />
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <Field label="Sản phẩm"><select value={form.productId} onChange={(event) => change('productId', event.target.value)} className={inputClass}>{database.products.map((product) => <option key={product.id} value={product.id}>{product.code} — {product.name}</option>)}</select></Field>
      <Field label="Trạng thái định mức"><select value={form.status} onChange={(event) => change('status', event.target.value)} className={inputClass}><option value="hieu_luc">Hiệu lực</option><option value="tam_ngung">Tạm ngưng</option></select></Field>
      <Field label="Nguyên phụ liệu" className="md:col-span-2" hint="Chỉ định mức Hiệu lực mới được dùng để tính nhu cầu và giữ chỗ vật tư khi duyệt kế hoạch.">
        <select value={form.materialId} onChange={(event) => change('materialId', event.target.value)} className={inputClass}><option value="new">＋ Nhập nguyên phụ liệu mới</option>{database.materials.map((material) => <option key={material.id} value={material.id}>{material.code} — {material.name}</option>)}</select>
      </Field>
      {isNewMaterial && <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-[#96C8EB] bg-[#F4FAFE] p-4 md:col-span-2 md:grid-cols-[.9fr_1.5fr_.7fr_.8fr]">
        <Field label="Mã vật tư"><input required value={form.newMaterialCode} placeholder="VD: VT017" onChange={(event) => change('newMaterialCode', event.target.value)} className={inputClass} /></Field>
        <Field label="Tên nguyên phụ liệu"><input required value={form.newMaterialName} placeholder="VD: Dây viền cổ áo" onChange={(event) => change('newMaterialName', event.target.value)} className={inputClass} /></Field>
        <Field label="Đơn vị"><select value={form.newMaterialUnit} onChange={(event) => change('newMaterialUnit', event.target.value)} className={inputClass}><option>mét</option><option>cuộn</option><option>cái</option><option>kg</option></select></Field>
        <Field label="Tồn kho ban đầu"><input type="number" min="0" step="0.001" value={form.newMaterialStock} onChange={(event) => change('newMaterialStock', event.target.value)} className={inputClass} /></Field>
      </div>}
      <Field label="Định mức / sản phẩm"><input required min="0.001" step="0.001" type="number" value={form.norm} onChange={(event) => change('norm', event.target.value)} className={inputClass} /></Field>
      <Field label="Tỷ lệ hao hụt (%)"><input required min="0" step="0.1" type="number" value={form.waste} onChange={(event) => change('waste', event.target.value)} className={inputClass} /></Field>
    </div>
    <div className="flex justify-end gap-2 border-t border-[#E2EDF5] bg-[#F9FCFE] px-5 py-4"><OutlineButton type="button" onClick={onClose}>Hủy</OutlineButton><PrimaryButton type="submit"><Check className="h-3.5 w-3.5" />{bomItem ? 'Lưu cập nhật' : 'Lưu định mức'}</PrimaryButton></div>
  </form></Modal>;
}

function OrderModal({ database, onClose, onSave }) {
  const readyPlans = database.plans.filter((plan) => plan.status === 'da_duyet' && !database.productionOrders.some((order) => order.planId === plan.id));
  const [form, setForm] = useState({ planId: String(readyPlans[0]?.id || ''), code: `LSX-0926-${String(database.productionOrders.length + 1).padStart(2, '0')}`, manager: 'Nguyễn Minh Anh', start: '2026-09-20', end: '2026-09-30' });
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <ModalHeader title="Lập lệnh sản xuất" description="Lệnh sản xuất chỉ được phát hành từ một kế hoạch đã được duyệt." onClose={onClose} />
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <Field label="Kế hoạch" className="md:col-span-2"><select required value={form.planId} onChange={(event) => change('planId', event.target.value)} className={inputClass}>{readyPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.code} — {getProduct(database, plan.productId)?.name}</option>)}</select></Field>
      <Field label="Mã lệnh"><input required value={form.code} onChange={(event) => change('code', event.target.value)} className={inputClass} /></Field>
      <Field label="Người phụ trách"><input required value={form.manager} onChange={(event) => change('manager', event.target.value)} className={inputClass} /></Field>
      <Field label="Ngày bắt đầu"><input required type="date" value={form.start} onChange={(event) => change('start', event.target.value)} className={inputClass} /></Field>
      <Field label="Ngày kết thúc"><input required type="date" value={form.end} onChange={(event) => change('end', event.target.value)} className={inputClass} /></Field>
    </div>
    <div className="flex justify-end gap-2 border-t border-[#E2EDF5] bg-[#F9FCFE] px-5 py-4"><OutlineButton type="button" onClick={onClose}>Hủy</OutlineButton><PrimaryButton type="submit"><Check className="h-3.5 w-3.5" />Lưu lệnh sản xuất</PrimaryButton></div>
  </form></Modal>;
}

function ResultModal({ order, onClose, onSave }) {
  const [form, setForm] = useState({ date: '2026-09-10', completed: 0, failed: 0, hours: 8, note: '' });
  const remain = Math.max(0, order.quantity - order.completed);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <ModalHeader title={`Cập nhật ${order.code}`} description={`Còn có thể hoàn thành ${formatNumber(remain)} sản phẩm trước khi kết thúc lệnh.`} onClose={onClose} />
    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <Field label="Ngày báo cáo"><input required type="date" value={form.date} onChange={(event) => change('date', event.target.value)} className={inputClass} /></Field>
      <Field label="Sản lượng hoàn thành"><input required min="0" max={remain} type="number" value={form.completed} onChange={(event) => change('completed', event.target.value)} className={inputClass} /></Field>
      <Field label="Sản lượng lỗi"><input required min="0" type="number" value={form.failed} onChange={(event) => change('failed', event.target.value)} className={inputClass} /></Field>
      <Field label="Giờ công thực tế"><input required min="0" step="0.5" type="number" value={form.hours} onChange={(event) => change('hours', event.target.value)} className={inputClass} /></Field>
      <Field label="Ghi chú" className="md:col-span-2"><input value={form.note} placeholder="VD: Hoàn thành công đoạn may thân áo" onChange={(event) => change('note', event.target.value)} className={inputClass} /></Field>
    </div>
    <div className="flex justify-end gap-2 border-t border-[#E2EDF5] bg-[#F9FCFE] px-5 py-4"><OutlineButton type="button" onClick={onClose}>Hủy</OutlineButton><PrimaryButton type="submit"><TrendingUp className="h-3.5 w-3.5" />Cập nhật kết quả</PrimaryButton></div>
  </form></Modal>;
}

function ProductionModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [database, setDatabase] = useState(loadDatabase);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [planStatus, setPlanStatus] = useState('all');
  const { hasPermission, role } = useAuth();
  const tab = ['overview', 'plans', 'bom', 'orders', 'mrp', 'progress'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const canCreate = role === 'admin' || hasPermission('production.create');
  const canUpdate = role === 'admin' || hasPermission('production.update');
  const canApprove = role === 'admin' || hasPermission('production.approve');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(database)); }, [database]);
  useEffect(() => { if (!searchParams.get('tab')) setSearchParams({ tab: 'overview' }, { replace: true }); }, [searchParams, setSearchParams]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);

  const showToast = (type, message, errorCode) => setToast({ type, message, errorCode });
  const mutate = (callback) => setDatabase((current) => { const next = clone(current); callback(next); return next; });
  const setTab = (nextTab) => setSearchParams({ tab: nextTab });
  const productOf = (id) => getProduct(database, id);

  const mrpRows = useMemo(() => aggregateRequirements(database), [database]);
  const metrics = useMemo(() => {
    const activeOrders = database.productionOrders.filter((order) => order.status === 'dang_san_xuat').length;
    const totalQuantity = database.productionOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalCompleted = database.productionOrders.reduce((sum, order) => sum + order.completed, 0);
    return {
      pending: database.plans.filter((plan) => plan.status === 'cho_duyet').length,
      activeOrders,
      completion: totalQuantity ? Math.round(totalCompleted / totalQuantity * 100) : 0,
      shortage: mrpRows.filter((row) => row.missing > 0).length,
    };
  }, [database, mrpRows]);

  const requirePermission = (allowed, message) => {
    if (allowed) return true;
    showToast('error', message || 'Tài khoản hiện tại không có quyền thực hiện thao tác này.');
    return false;
  };

  const savePlan = (form, existingPlan) => {
    const code = form.code.trim().toUpperCase();
    if (!code || !form.order.trim()) return showToast('error', 'Vui lòng nhập đầy đủ mã kế hoạch và đơn bán hàng.');
    if (form.end < form.start) return showToast('error', 'Ngày kết thúc phải sau ngày bắt đầu.');
    if (Number(form.quantity) < 1) return showToast('error', 'Số lượng phải lớn hơn 0.');
    let failed = false;
    mutate((db) => {
      if (db.plans.some((plan) => plan.code === code && plan.id !== existingPlan?.id)) { failed = true; return; }
      let productId = Number(form.productId);
      if (form.productId === 'new') {
        const productCode = form.newProductCode.trim().toUpperCase();
        const productName = form.newProductName.trim();
        if (!productCode || !productName || db.products.some((product) => product.code === productCode)) { failed = true; return; }
        productId = Math.max(0, ...db.products.map((product) => product.id)) + 1;
        db.products.push({ id: productId, code: productCode, name: productName, unit: form.newProductUnit });
      }
      const values = { code, order: form.order.trim(), productId, quantity: Number(form.quantity), start: form.start, end: form.end };
      if (existingPlan) {
        const plan = getPlan(db, existingPlan.id);
        const order = db.productionOrders.find((item) => item.planId === plan.id);
        if (order && values.quantity < order.completed) { failed = true; return; }
        const reReserve = plan.inventoryDeducted;
        if (reReserve) releasePlanMaterials(db, plan);
        Object.assign(plan, values);
        if (order) order.quantity = values.quantity;
        if (reReserve || ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status)) reservePlanMaterials(db, plan);
      } else db.plans.push({ id: uid(), ...values, status: 'cho_duyet' });
    });
    if (failed) return showToast('error', existingPlan ? 'Không thể lưu: mã kế hoạch trùng, mã sản phẩm trùng hoặc số lượng nhỏ hơn sản lượng đã hoàn thành.' : 'Không thể tạo: mã kế hoạch hoặc mã sản phẩm đã tồn tại.');
    setModal(null); setTab('plans'); showToast('success', existingPlan ? 'Đã cập nhật kế hoạch và tính lại vật tư liên quan.' : 'Đã tạo kế hoạch mới, đang chờ phê duyệt.');
  };

  const approvePlan = (id) => {
    if (!requirePermission(canApprove, 'Bạn cần quyền Phê duyệt lệnh sản xuất để duyệt kế hoạch.')) return;
    const plan = getPlan(database, id);
    const product = productOf(plan.productId);
    if (!database.bom.some((item) => item.productId === plan.productId && (item.status || 'hieu_luc') === 'hieu_luc')) return showToast('error', `Chưa thể duyệt vì ${product.code} chưa có định mức nguyên liệu Hiệu lực.`);
    if (!window.confirm(`Duyệt ${plan.code}? Hệ thống sẽ tính định mức và tự trừ vật tư hiện có trong kho.`)) return;
    let shortages = [];
    mutate((db) => { const current = getPlan(db, id); shortages = reservePlanMaterials(db, current); current.status = 'da_duyet'; });
    showToast(shortages.length ? 'conflict' : 'success', shortages.length ? `Đã duyệt ${plan.code}; còn thiếu ${shortages.length} loại vật tư cần bổ sung.` : `Đã duyệt ${plan.code} và tự trừ vật tư theo định mức.`, shortages.length ? 'INSUFFICIENT_STOCK' : undefined);
  };

  const togglePausePlan = (id) => {
    if (!requirePermission(canUpdate)) return;
    const plan = getPlan(database, id); const resume = plan.status === 'tam_dung';
    const message = resume ? `Tiếp tục ${plan.code}? Lệnh sản xuất liên quan sẽ hoạt động trở lại.` : `Tạm dừng ${plan.code}? Vật tư đã giữ chỗ vẫn được bảo lưu.`;
    if (!window.confirm(message)) return;
    mutate((db) => {
      const current = getPlan(db, id); const order = db.productionOrders.find((item) => item.planId === id);
      current.status = resume ? (order ? 'dang_thuc_hien' : 'da_duyet') : 'tam_dung';
      if (order) order.status = resume ? (order.completed >= order.quantity ? 'hoan_thanh' : 'dang_san_xuat') : 'tam_dung';
    });
    showToast('success', resume ? `Đã tiếp tục ${plan.code}.` : `Đã tạm dừng ${plan.code}.`);
  };

  const cancelPlan = (id) => {
    if (!requirePermission(canApprove, 'Bạn cần quyền phê duyệt để hủy kế hoạch.')) return;
    const plan = getPlan(database, id); const order = database.productionOrders.find((item) => item.planId === id);
    if (order && (order.completed > 0 || database.productionResults.some((result) => result.orderId === order.id))) return showToast('error', 'Không thể hủy kế hoạch đã phát sinh kết quả sản xuất.');
    if (!window.confirm(`Hủy ${plan.code}? Phần vật tư đã giữ chỗ sẽ được hoàn lại kho.`)) return;
    mutate((db) => { const current = getPlan(db, id); releasePlanMaterials(db, current); current.status = 'huy'; const relatedOrder = db.productionOrders.find((item) => item.planId === id); if (relatedOrder) relatedOrder.status = 'huy'; });
    setModal(null); showToast('success', `Đã hủy ${plan.code} và hoàn lại vật tư đã giữ chỗ.`);
  };

  const saveBom = (form, existingItem) => {
    let error = '';
    mutate((db) => {
      let materialId = Number(form.materialId);
      if (form.materialId === 'new') {
        const code = form.newMaterialCode.trim().toUpperCase(); const name = form.newMaterialName.trim();
        if (!code || !name || db.materials.some((material) => material.code === code)) { error = 'Mã vật tư mới đang trống hoặc đã tồn tại.'; return; }
        materialId = Math.max(0, ...db.materials.map((material) => material.id)) + 1;
        db.materials.push({ id: materialId, code, name, unit: form.newMaterialUnit, stock: Number(form.newMaterialStock || 0), minimum: 0 });
      }
      const values = { productId: Number(form.productId), materialId, norm: Number(form.norm), waste: Number(form.waste), status: form.status };
      if (!values.norm || values.norm <= 0) { error = 'Định mức phải lớn hơn 0.'; return; }
      if (db.bom.some((item) => item.productId === values.productId && item.materialId === materialId && item.id !== existingItem?.id)) { error = 'Sản phẩm đã có định mức cho vật tư này.'; return; }
      const affected = db.plans.filter((plan) => [values.productId, existingItem?.productId].includes(plan.productId) && ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status));
      affected.forEach((plan) => releasePlanMaterials(db, plan));
      if (existingItem) Object.assign(db.bom.find((item) => item.id === existingItem.id), values);
      else db.bom.push({ id: uid(), ...values });
      affected.forEach((plan) => reservePlanMaterials(db, plan));
    });
    if (error) return showToast('error', error);
    setModal(null); showToast('success', existingItem ? 'Đã cập nhật định mức và tính lại vật tư liên quan.' : 'Đã thêm định mức nguyên liệu.');
  };

  const saveOrder = (form) => {
    let error = '';
    mutate((db) => {
      const plan = getPlan(db, form.planId); const code = form.code.trim().toUpperCase();
      if (!plan || !code || db.productionOrders.some((item) => item.code === code)) { error = 'Mã lệnh trống hoặc đã tồn tại.'; return; }
      if (form.end < form.start) { error = 'Ngày kết thúc phải sau ngày bắt đầu.'; return; }
      plan.status = 'dang_thuc_hien';
      db.productionOrders.push({ id: uid(), code, planId: plan.id, quantity: plan.quantity, completed: 0, manager: form.manager.trim(), start: form.start, end: form.end, status: 'chua_bat_dau' });
    });
    if (error) return showToast('error', error);
    setModal(null); setTab('orders'); showToast('success', 'Đã lập lệnh sản xuất từ kế hoạch được duyệt.');
  };

  const startOrder = (id) => {
    if (!requirePermission(canUpdate)) return;
    mutate((db) => { getOrder(db, id).status = 'dang_san_xuat'; });
    showToast('success', `Đã bắt đầu ${getOrder(database, id).code}.`);
  };

  const saveResult = (form, orderId) => {
    let error = '';
    mutate((db) => {
      const order = getOrder(db, orderId); const completed = Number(form.completed); const failed = Number(form.failed);
      if (completed < 0 || failed < 0 || completed > order.quantity - order.completed) { error = 'Sản lượng hoàn thành không hợp lệ.'; return; }
      order.completed = Math.min(order.quantity, order.completed + completed);
      order.status = order.completed === order.quantity ? 'hoan_thanh' : 'dang_san_xuat';
      if (order.status === 'hoan_thanh') getPlan(db, order.planId).status = 'hoan_thanh';
      db.productionResults.push({ id: uid(), orderId, date: form.date, completed, failed, hours: Number(form.hours), note: form.note.trim() });
    });
    if (error) return showToast('error', error);
    setModal(null); showToast('success', 'Đã cập nhật kết quả và tiến độ sản xuất.');
  };

  const createRequest = (materialId) => {
    let requestCode = '';
    mutate((db) => {
      const row = aggregateRequirements(db).find((item) => item.material.id === materialId);
      requestCode = `YCMH-${String(db.purchaseRequests.length + 1).padStart(3, '0')}`;
      db.purchaseRequests.push({ id: uid(), code: requestCode, materialId, quantity: row.missing, status: 'cho_duyet' });
    });
    showToast('success', `Đã tạo yêu cầu mua ${requestCode}.`);
  };

  const tabs = [
    ['overview', 'Tổng quan', BarChart3], ['plans', 'Kế hoạch sản xuất', ClipboardList], ['bom', 'Định mức nguyên liệu', ListChecks],
    ['orders', 'Lệnh sản xuất', Factory], ['mrp', 'Nhu cầu NPL', ShoppingCart], ['progress', 'Tiến độ & kết quả', TrendingUp],
  ];

  const filteredPlans = database.plans.filter((plan) => {
    const product = productOf(plan.productId);
    const value = `${plan.code} ${plan.order} ${product?.code || ''} ${product?.name || ''}`.toLowerCase();
    return (planStatus === 'all' || plan.status === planStatus) && (!query || value.includes(query.toLowerCase()));
  });

  const actionButton = (kind, children, props = {}) => <button {...props} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold transition hover:-translate-y-px ${kind}`}>{children}</button>;

  const PlanTable = ({ plans, compact = false }) => <div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-xs"><thead className="border-y border-[#E2EDF5] bg-[#F7FAFC] text-[10px] font-bold uppercase tracking-wide text-[#5F6F82]"><tr><th className="px-4 py-3">Mã kế hoạch</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3">Thời hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody className="divide-y divide-[#EDF3F7]">{plans.length ? plans.map((plan) => { const product = productOf(plan.productId); const canEdit = !['hoan_thanh', 'huy'].includes(plan.status); const canPause = ['da_duyet', 'dang_thuc_hien', 'tam_dung'].includes(plan.status); return <tr key={plan.id} className="transition hover:bg-[#F9FCFE]"><td className="px-4 py-3 font-bold text-[#0F5FAF]">{plan.code}</td><td className="px-4 py-3"><p className="font-semibold text-[#172033]">{product?.name}</p><p className="mt-0.5 text-[10px] text-[#8DA0B3]">{product?.code}</p></td><td className="px-4 py-3 text-[#5F6F82]">{plan.order}</td><td className="px-4 py-3 text-right font-semibold text-[#172033]">{formatNumber(plan.quantity)} {product?.unit}</td><td className="px-4 py-3 text-[#5F6F82]">{formatDate(plan.end)}</td><td className="px-4 py-3"><StatusBadge status={plan.status} /></td><td className="px-4 py-3 whitespace-nowrap"><div className="flex flex-wrap gap-1">{actionButton('border-[#D6EDFF] bg-[#F1FAFE] text-[#0F5FAF] hover:bg-[#E1F4FC]', <>◉ Chi tiết</>, { onClick: () => setModal({ type: 'detail-plan', planId: plan.id }) })}{canEdit && actionButton('border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100', <><FilePenLine className="h-3 w-3" />Sửa</>, { onClick: () => requirePermission(canUpdate) && setModal({ type: 'edit-plan', planId: plan.id }) })}{plan.status === 'cho_duyet' && actionButton('border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100', <><Check className="h-3 w-3" />Duyệt</>, { onClick: () => approvePlan(plan.id) })}{canPause && actionButton('border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100', plan.status === 'tam_dung' ? <><Play className="h-3 w-3" />Tiếp tục</> : <><Pause className="h-3 w-3" />Tạm dừng</>, { onClick: () => togglePausePlan(plan.id) })}</div></td></tr>; }) : <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-[#8DA0B3]">Không có kế hoạch phù hợp.</td></tr>}</tbody></table></div>;

  const renderOverview = () => <div className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
    ['Kế hoạch chờ duyệt', metrics.pending, 'Cần quản lý phê duyệt', 'bg-amber-50 text-amber-600'],
    ['Lệnh đang sản xuất', metrics.activeOrders, 'Đang triển khai tại phân xưởng', 'bg-cyan-50 text-cyan-600'],
    ['Tỷ lệ hoàn thành', `${metrics.completion}%`, 'Trên các lệnh đang theo dõi', 'bg-blue-50 text-blue-600'],
    ['Vật tư cần bổ sung', metrics.shortage, 'Cần tạo yêu cầu mua', 'bg-rose-50 text-rose-600'],
  ].map(([label, value, note, color]) => <div key={label} className="relative overflow-hidden rounded-2xl border border-[#E2EDF5] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#BCE0F7]"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${color}`}><Factory className="h-4 w-4" /></div><p className="text-xs font-medium text-[#5F6F82]">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-[#172033]">{String(value).padStart(typeof value === 'number' ? 2 : 0, '0')}</p><p className="mt-2 text-[11px] text-[#8DA0B3]">{note}</p></div>)}</div>
    <Panel><div className="flex flex-col justify-between gap-3 border-b border-[#E2EDF5] bg-gradient-to-r from-white to-[#F4FAFE] p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold text-[#172033]">Kế hoạch sản xuất gần đây</h2><p className="mt-1 text-xs text-[#6B7785]">Ưu tiên các kế hoạch gần hạn giao.</p></div><OutlineButton onClick={() => setTab('plans')}>Xem tất cả <ChevronRight className="h-3.5 w-3.5" /></OutlineButton></div><PlanTable plans={database.plans.slice(0, 5)} compact /></Panel>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="flex gap-3 rounded-2xl border border-[#DCEAF4] bg-white p-4 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0F5FAF]"><ClipboardList className="h-5 w-5" /></div><div className="min-w-0"><h3 className="text-sm font-bold text-[#172033]">Việc cần xử lý</h3><p className="mt-1 text-xs leading-relaxed text-[#5F6F82]">{metrics.pending ? `${metrics.pending} kế hoạch đang chờ phê duyệt.` : 'Không có kế hoạch chờ phê duyệt.'}</p><button onClick={() => setTab('plans')} className="mt-3 text-xs font-bold text-[#0F5FAF] hover:underline">Mở kế hoạch →</button></div></div><div className="flex gap-3 rounded-2xl border border-[#DCEAF4] bg-white p-4 shadow-sm"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle className="h-5 w-5" /></div><div className="min-w-0"><h3 className="text-sm font-bold text-[#172033]">Cảnh báo vật tư</h3><p className="mt-1 text-xs leading-relaxed text-[#5F6F82]">{metrics.shortage ? `${metrics.shortage} loại vật tư chưa đáp ứng nhu cầu.` : 'Tồn kho hiện đáp ứng nhu cầu.'}</p><button onClick={() => setTab('mrp')} className="mt-3 text-xs font-bold text-[#0F5FAF] hover:underline">Kiểm tra MRP →</button></div></div></div>
  </div>;

  const renderPlans = () => <div className="space-y-4"><Panel><div className="flex flex-col justify-between gap-3 border-b border-[#E2EDF5] bg-gradient-to-r from-white to-[#F4FAFE] p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold text-[#172033]">Danh sách kế hoạch</h2><p className="mt-1 text-xs text-[#6B7785]">{filteredPlans.length} kế hoạch đang hiển thị</p></div><div className="flex flex-wrap gap-2"><label className="flex items-center gap-2 rounded-lg border border-[#DCEAF4] bg-white px-2.5"><Search className="h-3.5 w-3.5 text-[#5A8CAE]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kế hoạch..." className="w-32 py-2 text-xs outline-none" /></label><select value={planStatus} onChange={(event) => setPlanStatus(event.target.value)} className="rounded-lg border border-[#DCEAF4] bg-white px-2.5 py-2 text-xs text-[#3D5D72] outline-none"><option value="all">Tất cả trạng thái</option><option value="cho_duyet">Chờ duyệt</option><option value="da_duyet">Đã duyệt</option><option value="dang_thuc_hien">Đang thực hiện</option><option value="tam_dung">Tạm dừng</option><option value="hoan_thanh">Hoàn thành</option><option value="huy">Đã hủy</option></select></div></div><PlanTable plans={filteredPlans} /></Panel></div>;

  const renderBom = () => { const rows = database.bom.filter((item) => `${productOf(item.productId)?.name} ${getMaterial(database, item.materialId)?.name}`.toLowerCase().includes(query.toLowerCase())); return <div className="space-y-4"><Panel><div className="flex flex-col justify-between gap-3 border-b border-[#E2EDF5] bg-gradient-to-r from-white to-[#F4FAFE] p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold text-[#172033]">Danh mục định mức</h2><p className="mt-1 text-xs text-[#6B7785]">Dùng làm cơ sở tính nhu cầu nguyên phụ liệu của từng sản phẩm.</p></div><label className="flex items-center gap-2 rounded-lg border border-[#DCEAF4] bg-white px-2.5"><Search className="h-3.5 w-3.5 text-[#5A8CAE]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm vật tư..." className="w-36 py-2 text-xs outline-none" /></label></div><div className="overflow-x-auto"><table className="min-w-[930px] w-full text-left text-xs"><thead className="border-y border-[#E2EDF5] bg-[#F7FAFC] text-[10px] font-bold uppercase tracking-wide text-[#5F6F82]"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Mã vật tư</th><th className="px-4 py-3">Nguyên phụ liệu</th><th className="px-4 py-3 text-right">Định mức</th><th className="px-4 py-3 text-right">Hao hụt</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody className="divide-y divide-[#EDF3F7]">{rows.map((item) => { const product = productOf(item.productId); const material = getMaterial(database, item.materialId); return <tr key={item.id} className="hover:bg-[#F9FCFE]"><td className="px-4 py-3 font-semibold text-[#172033]">{product?.name}</td><td className="px-4 py-3 font-bold text-[#0F5FAF]">{material?.code}</td><td className="px-4 py-3 text-[#5F6F82]">{material?.name}</td><td className="px-4 py-3 text-right font-semibold text-[#172033]">{formatNumber(item.norm, 3)} {material?.unit}/SP</td><td className="px-4 py-3 text-right text-[#5F6F82]">{item.waste}%</td><td className="px-4 py-3"><StatusBadge status={item.status || 'hieu_luc'} /></td><td className="px-4 py-3">{actionButton('border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100', <><FilePenLine className="h-3 w-3" />Cập nhật</>, { onClick: () => requirePermission(canUpdate) && setModal({ type: 'edit-bom', bomId: item.id }) })}</td></tr>; })}{!rows.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-[#8DA0B3]">Không tìm thấy định mức phù hợp.</td></tr>}</tbody></table></div></Panel></div>; };

  const renderOrders = () => { const orders = database.productionOrders.filter((order) => `${order.code} ${getPlan(database, order.planId)?.code} ${productOf(getPlan(database, order.planId)?.productId)?.name}`.toLowerCase().includes(query.toLowerCase())); return <div className="space-y-4"><Panel><div className="flex flex-col justify-between gap-3 border-b border-[#E2EDF5] bg-gradient-to-r from-white to-[#F4FAFE] p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold text-[#172033]">Danh sách lệnh sản xuất</h2><p className="mt-1 text-xs text-[#6B7785]">Lệnh chỉ được tạo từ kế hoạch đã duyệt.</p></div><label className="flex items-center gap-2 rounded-lg border border-[#DCEAF4] bg-white px-2.5"><Search className="h-3.5 w-3.5 text-[#5A8CAE]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lệnh..." className="w-36 py-2 text-xs outline-none" /></label></div><div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-xs"><thead className="border-y border-[#E2EDF5] bg-[#F7FAFC] text-[10px] font-bold uppercase tracking-wide text-[#5F6F82]"><tr><th className="px-4 py-3">Mã lệnh</th><th className="px-4 py-3">Kế hoạch / sản phẩm</th><th className="px-4 py-3 text-right">Hoàn thành</th><th className="px-4 py-3">Tiến độ</th><th className="px-4 py-3">Phụ trách</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody className="divide-y divide-[#EDF3F7]">{orders.map((order) => { const plan = getPlan(database, order.planId); const product = productOf(plan?.productId); const pct = Math.round(order.completed / order.quantity * 100); return <tr key={order.id} className="hover:bg-[#F9FCFE]"><td className="px-4 py-3 font-bold text-[#0F5FAF]">{order.code}</td><td className="px-4 py-3"><p className="font-semibold text-[#172033]">{product?.name}</p><p className="mt-0.5 text-[10px] text-[#8DA0B3]">{plan?.code}</p></td><td className="px-4 py-3 text-right font-semibold text-[#172033]">{formatNumber(order.completed)} / {formatNumber(order.quantity)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E2EDF5]"><span className="block h-full rounded-full bg-gradient-to-r from-[#0F5FAF] to-cyan-400" style={{ width: `${pct}%` }} /></div><span className="font-bold text-[#0F5FAF]">{pct}%</span></div></td><td className="px-4 py-3 text-[#5F6F82]">{order.manager}</td><td className="px-4 py-3"><StatusBadge status={order.status} /></td><td className="px-4 py-3 whitespace-nowrap"><div className="flex gap-1">{order.status === 'chua_bat_dau' && actionButton('border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100', <><Play className="h-3 w-3" />Bắt đầu</>, { onClick: () => startOrder(order.id) })}{order.status === 'dang_san_xuat' && actionButton('border-[#D6EDFF] bg-[#F1FAFE] text-[#0F5FAF] hover:bg-[#E1F4FC]', <><TrendingUp className="h-3 w-3" />Cập nhật</>, { onClick: () => requirePermission(canUpdate) && setModal({ type: 'result', orderId: order.id }) })}</div></td></tr>; })}{!orders.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-[#8DA0B3]">Chưa có lệnh sản xuất.</td></tr>}</tbody></table></div></Panel></div>; };

  const renderMrp = () => { const rows = mrpRows.filter((row) => `${row.material.code} ${row.material.name}`.toLowerCase().includes(query.toLowerCase())); const shortage = rows.filter((row) => row.missing > 0); return <div className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[[rows.length, 'Loại vật tư cần dùng', 'text-[#0F5FAF]'], [shortage.length, 'Loại vật tư thiếu', 'text-amber-600'], [rows.filter((row) => row.request).length, 'Yêu cầu mua đã tạo', 'text-emerald-600']].map(([value, label, color]) => <div key={label} className="rounded-2xl border border-[#E2EDF5] bg-white p-4 shadow-sm"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="mt-1 text-xs text-[#5F6F82]">{label}</p></div>)}</div><Panel><div className="flex flex-col justify-between gap-3 border-b border-[#E2EDF5] bg-gradient-to-r from-white to-[#F4FAFE] p-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold text-[#172033]">Kết quả hoạch định vật tư</h2><p className="mt-1 text-xs text-[#6B7785]">Cần mua = nhu cầu còn thiếu sau khi kho đã giữ chỗ − tồn kho hiện tại.</p></div><label className="flex items-center gap-2 rounded-lg border border-[#DCEAF4] bg-white px-2.5"><Search className="h-3.5 w-3.5 text-[#5A8CAE]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm vật tư..." className="w-36 py-2 text-xs outline-none" /></label></div><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-xs"><thead className="border-y border-[#E2EDF5] bg-[#F7FAFC] text-[10px] font-bold uppercase tracking-wide text-[#5F6F82]"><tr><th className="px-4 py-3">Mã vật tư</th><th className="px-4 py-3">Nguyên phụ liệu</th><th className="px-4 py-3 text-right">Nhu cầu</th><th className="px-4 py-3 text-right">Tồn kho</th><th className="px-4 py-3 text-right">Cần mua</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#EDF3F7]">{rows.map((row) => <tr key={row.material.id} className="hover:bg-[#F9FCFE]"><td className="px-4 py-3 font-bold text-[#0F5FAF]">{row.material.code}</td><td className="px-4 py-3 font-semibold text-[#172033]">{row.material.name}</td><td className="px-4 py-3 text-right text-[#5F6F82]">{formatNumber(row.needed, 3)} {row.material.unit}</td><td className="px-4 py-3 text-right text-[#5F6F82]">{formatNumber(row.material.stock, 3)} {row.material.unit}</td><td className={`px-4 py-3 text-right font-bold ${row.missing ? 'text-rose-600' : 'text-emerald-600'}`}>{formatNumber(row.missing, 3)} {row.material.unit}</td><td className="px-4 py-3">{row.missing ? <StatusBadge status="cho_duyet" /> : <StatusBadge status="hieu_luc" />}</td><td className="px-4 py-3">{row.missing ? row.request ? <span className="text-[11px] font-semibold text-[#5F6F82]">{row.request.code}</span> : <button onClick={() => createRequest(row.material.id)} className="text-[11px] font-bold text-[#0F5FAF] hover:underline">Tạo yêu cầu mua</button> : '—'}</td></tr>)}{!rows.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-[#8DA0B3]">Chưa có kế hoạch đang hiệu lực để tính nhu cầu.</td></tr>}</tbody></table></div></Panel></div>; };

  const renderProgress = () => { const orders = database.productionOrders.filter((order) => order.status !== 'huy'); const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0); const totalCompleted = orders.reduce((sum, order) => sum + order.completed, 0); const totalDefects = database.productionResults.reduce((sum, row) => sum + row.failed, 0); const totalHours = database.productionResults.reduce((sum, row) => sum + row.hours, 0); const percent = totalQuantity ? Math.round(totalCompleted / totalQuantity * 100) : 0; const focusOrder = orders.find((order) => order.status === 'dang_san_xuat') || orders[0]; const latest = [...database.productionResults].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5); const stages = focusOrder ? [['Cắt', Math.min(100, percent + 18), 'Tổ cắt 01'], ['May', percent, 'Chuyền may A2'], ['Hoàn thiện', Math.max(0, percent - 16), 'Tổ hoàn thiện'], ['KCS', Math.max(0, percent - 34), 'Bộ phận KCS']] : []; return <div className="space-y-4"><section className="grid overflow-hidden rounded-2xl border border-[#CDE4EF] bg-white shadow-sm lg:grid-cols-[1fr_320px]"><div className="bg-[radial-gradient(circle_at_85%_0%,rgba(86,190,214,.2),transparent_15rem),linear-gradient(120deg,#F9FCFE,#EEF8FC)] p-5"><span className="text-[10px] font-bold tracking-[.14em] text-[#0F5FAF]">ĐIỀU HÀNH SẢN XUẤT</span><h2 className="mt-1 text-xl font-bold tracking-tight text-[#172033]">Toàn cảnh tiến độ phân xưởng</h2><p className="mt-1 text-xs text-[#5F6F82]">Tổng hợp trực tiếp từ các lệnh sản xuất và phiếu kết quả thực tế.</p><div className="mt-5 rounded-xl border border-[#CFE8F4] bg-white/75 p-4"><div className="flex justify-between text-xs font-semibold text-[#3D5D72]"><span>Tiến độ tổng hợp</span><b className="text-base text-[#0F5FAF]">{percent}%</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#DCECF3]"><span className="block h-full rounded-full bg-gradient-to-r from-[#0F5FAF] to-cyan-400" style={{ width: `${percent}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-[#7A929F]"><span>{formatNumber(totalCompleted)} đã hoàn thành</span><span>Mục tiêu {formatNumber(totalQuantity)} SP</span></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[[orders.filter((order) => order.status === 'dang_san_xuat').length, 'Lệnh vận hành'], [formatNumber(totalCompleted), 'Sản lượng đạt'], [`${totalCompleted + totalDefects ? formatNumber(totalDefects / (totalCompleted + totalDefects) * 100, 1) : 0}%`, 'Tỷ lệ lỗi'], [formatNumber(totalHours), 'Giờ công']].map(([value, label]) => <div key={label} className="rounded-xl border border-[#DCEAF4] bg-white/80 p-3"><b className="block text-lg text-[#174C68]">{value}</b><span className="mt-1 block text-[10px] text-[#7B929E]">{label}</span></div>)}</div></div><aside className="flex flex-col bg-gradient-to-br from-[#075B94] via-[#0D85B8] to-[#2DB3C6] p-5 text-white">{focusOrder ? (() => { const plan = getPlan(database, focusOrder.planId); const product = productOf(plan.productId); const pct = Math.round(focusOrder.completed / focusOrder.quantity * 100); return <><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.12em] text-cyan-100">ƯU TIÊN THEO DÕI</span><StatusBadge status={focusOrder.status} /></div><p className="mt-6 text-xs font-bold text-cyan-100">{focusOrder.code}</p><h3 className="mt-1 text-lg font-bold leading-snug">{product.name}</h3><p className="mt-1 text-[11px] text-cyan-100">{plan.code} · Hạn {formatDate(focusOrder.end)}</p><div className="mt-6"><b className="text-4xl">{pct}%</b><span className="mt-1 block text-xs text-cyan-100">{formatNumber(focusOrder.completed)} / {formatNumber(focusOrder.quantity)} {product.unit}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white" style={{ width: `${pct}%` }} /></div><div className="mt-auto flex items-end justify-between pt-6 text-[10px] text-cyan-50"><span>Phụ trách<b className="mt-1 block text-xs text-white">{focusOrder.manager}</b></span>{focusOrder.status === 'dang_san_xuat' && <button onClick={() => setModal({ type: 'result', orderId: focusOrder.id })} className="rounded-lg border border-white/50 bg-white/10 px-2 py-1.5 font-bold hover:bg-white/20">Cập nhật →</button>}</div></>; })() : <p className="m-auto text-center text-sm">Chưa có lệnh sản xuất để theo dõi.</p>}</aside></section>
    <div className="grid gap-4 xl:grid-cols-[1fr_330px]"><Panel><div className="flex items-center justify-between border-b border-[#E2EDF5] bg-[#F9FCFE] p-4"><div><h2 className="text-sm font-bold text-[#172033]">Tiến độ theo lệnh sản xuất</h2><p className="mt-1 text-xs text-[#6B7785]">Theo dõi sản lượng kế hoạch, chất lượng và hạn hoàn thành.</p></div><span className="rounded-full bg-[#EAF5FC] px-2 py-1 text-[10px] font-bold text-[#0F5FAF]">{orders.length} lệnh</span></div><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-xs"><thead className="border-b border-[#E2EDF5] bg-[#F7FAFC] text-[10px] font-bold uppercase tracking-wide text-[#5F6F82]"><tr><th className="px-4 py-3">Lệnh / sản phẩm</th><th className="px-4 py-3 text-right">Kế hoạch</th><th className="px-4 py-3 text-right">Đạt / lỗi</th><th className="px-4 py-3">Tiến độ</th><th className="px-4 py-3">Hạn</th><th className="px-4 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-[#EDF3F7]">{orders.map((order) => { const plan = getPlan(database, order.planId); const product = productOf(plan.productId); const pct = Math.round(order.completed / order.quantity * 100); const defects = database.productionResults.filter((row) => row.orderId === order.id).reduce((sum, row) => sum + row.failed, 0); return <tr key={order.id} className="hover:bg-[#F9FCFE]"><td className="px-4 py-3"><p className="font-bold text-[#0F5FAF]">{order.code}</p><p className="mt-0.5 font-semibold text-[#172033]">{product.name}</p></td><td className="px-4 py-3 text-right"><b className="text-[#172033]">{formatNumber(order.quantity)}</b><p className="mt-0.5 text-[10px] text-[#8DA0B3]">{product.unit}</p></td><td className="px-4 py-3 text-right"><b className="text-emerald-700">{formatNumber(order.completed)}</b><p className="mt-0.5 text-[10px] text-rose-600">Lỗi {formatNumber(defects)}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E2EDF5]"><span className="block h-full rounded-full bg-[#0F5FAF]" style={{ width: `${pct}%` }} /></div><b className="text-[#0F5FAF]">{pct}%</b></div></td><td className="px-4 py-3 text-[#5F6F82]">{formatDate(order.end)}</td><td className="px-4 py-3"><StatusBadge status={order.status} /></td></tr>; })}</tbody></table></div></Panel><Panel><div className="flex items-center justify-between border-b border-[#E2EDF5] bg-[#F9FCFE] p-4"><div><span className="text-[10px] font-bold tracking-[.11em] text-[#0F5FAF]">NHẬT KÝ MỚI NHẤT</span><h2 className="mt-1 text-sm font-bold text-[#172033]">Kết quả ghi nhận</h2></div><TrendingUp className="h-5 w-5 text-[#0F5FAF]" /></div><div className="divide-y divide-[#EDF3F7]">{latest.length ? latest.map((result) => { const order = getOrder(database, result.orderId); const plan = getPlan(database, order.planId); return <div key={result.id} className="grid grid-cols-[72px_1fr] gap-2 p-3"><div><b className="block text-[10px] text-[#3D5D72]">{formatDate(result.date)}</b><span className="mt-1 block text-[10px] font-semibold text-[#0F5FAF]">{order.code}</span></div><div><b className="text-[11px] text-[#172033]">{productOf(plan.productId).name}</b><p className="mt-1 text-[10px] text-[#6B7785]">Đạt <strong className="text-emerald-700">{formatNumber(result.completed)}</strong> · Lỗi <strong className="text-rose-600">{formatNumber(result.failed)}</strong></p><p className="mt-1 truncate text-[10px] text-[#8DA0B3]">{formatNumber(result.hours, 1)} giờ công{result.note ? ` · ${result.note}` : ''}</p></div></div>; }) : <p className="p-8 text-center text-xs text-[#8DA0B3]">Chưa có kết quả được ghi nhận.</p>}</div></Panel></div>
    <Panel><div className="flex flex-col justify-between gap-3 border-b border-[#E2EDF5] bg-[#F9FCFE] p-4 sm:flex-row sm:items-center"><div><span className="text-[10px] font-bold tracking-[.11em] text-[#0F5FAF]">KIỂM SOÁT CÔNG ĐOẠN</span><h2 className="mt-1 text-sm font-bold text-[#172033]">{focusOrder ? `Luồng công đoạn của ${focusOrder.code}` : 'Luồng công đoạn sản xuất'}</h2><p className="mt-1 text-xs text-[#6B7785]">Chỉ số mô phỏng theo tiến độ lệnh hiện tại; sẵn sàng kết nối bảng công đoạn từ backend.</p></div>{focusOrder && <div className="rounded-lg border border-[#D6EDFF] bg-[#F1FAFE] px-3 py-2 text-right"><b className="block text-base text-[#0F5FAF]">{formatNumber(focusOrder.completed)}</b><span className="text-[10px] text-[#6B7785]">sản phẩm hoàn thành</span></div>}</div><div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{stages.map(([name, value, team], index) => <div key={name} className="relative rounded-xl border border-[#DCEAF4] bg-gradient-to-br from-white to-[#F8FCFD] p-4"><span className="absolute -top-2 left-3 rounded bg-[#EAF5FC] px-1.5 py-0.5 text-[9px] font-bold text-[#0F5FAF]">0{index + 1}</span><div className="mt-2 flex items-center justify-between"><h3 className="font-bold text-[#172033]">{name}</h3><b className="text-base text-[#0F5FAF]">{value}%</b></div><p className="mt-1 text-[10px] text-[#7B929E]">{team}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2EDF5]"><span className="block h-full rounded-full bg-gradient-to-r from-[#0F5FAF] to-cyan-400" style={{ width: `${value}%` }} /></div><p className="mt-2 text-[10px] text-[#5F6F82]">{value >= 100 ? 'Đã hoàn tất' : value ? 'Đang thực hiện' : 'Chờ chuyển công đoạn'}</p></div>)}</div></Panel>
  </div>; };

  const planInModal = modal?.planId ? getPlan(database, modal.planId) : null;
  const bomInModal = modal?.bomId ? database.bom.find((item) => item.id === modal.bomId) : null;
  const orderInModal = modal?.orderId ? getOrder(database, modal.orderId) : null;
  const detailRequirements = planInModal ? requirementsForPlan(database, planInModal) : [];

  return <div className="space-y-4">
    <ModuleHeader code="PH2" title="Sản xuất & Kế hoạch NPL" description="Quản lý kế hoạch sản xuất, định mức nguyên phụ liệu, lệnh sản xuất và tiến độ phân xưởng." badgeText="Đang vận hành demo" badgeType="success" imageKey="production">
      {tab === 'plans' && <PrimaryButton onClick={() => requirePermission(canCreate) && setModal({ type: 'new-plan' })}><Plus className="h-3.5 w-3.5" />Lập kế hoạch</PrimaryButton>}
      {tab === 'bom' && <PrimaryButton onClick={() => requirePermission(canCreate) && setModal({ type: 'new-bom' })}><PackagePlus className="h-3.5 w-3.5" />Thêm định mức</PrimaryButton>}
      {tab === 'orders' && <PrimaryButton disabled={!database.plans.some((plan) => plan.status === 'da_duyet' && !database.productionOrders.some((order) => order.planId === plan.id))} onClick={() => requirePermission(canCreate) && setModal({ type: 'new-order' })}><FilePlus2 className="h-3.5 w-3.5" />Lập lệnh SX</PrimaryButton>}
      {tab === 'overview' && <PrimaryButton onClick={() => requirePermission(canCreate) && setModal({ type: 'new-plan' })}><Plus className="h-3.5 w-3.5" />Lập kế hoạch</PrimaryButton>}
    </ModuleHeader>
    <nav className="grid grid-cols-2 gap-1 rounded-xl border border-[#DCEAF4] bg-white p-1 shadow-sm sm:grid-cols-3 xl:grid-cols-6">{tabs.map(([key, label, Icon]) => <button key={key} onClick={() => { setQuery(''); setTab(key); }} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${tab === key ? 'bg-[#0F5FAF] text-white shadow-sm' : 'text-[#5A8CAE] hover:bg-[#EAF5FC] hover:text-[#0F4C81]'}`}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{label}</span></button>)}</nav>
    {tab === 'overview' && renderOverview()}{tab === 'plans' && renderPlans()}{tab === 'bom' && renderBom()}{tab === 'orders' && renderOrders()}{tab === 'mrp' && renderMrp()}{tab === 'progress' && renderProgress()}
    {modal?.type === 'new-plan' && <PlanModal database={database} onClose={() => setModal(null)} onSave={(form) => savePlan(form)} />}
    {modal?.type === 'edit-plan' && <PlanModal key={`edit-${planInModal.id}`} database={database} plan={planInModal} onClose={() => setModal(null)} onSave={(form) => savePlan(form, planInModal)} />}
    {modal?.type === 'new-bom' && <BomModal database={database} onClose={() => setModal(null)} onSave={(form) => saveBom(form)} />}
    {modal?.type === 'edit-bom' && <BomModal key={`bom-${bomInModal.id}`} database={database} bomItem={bomInModal} onClose={() => setModal(null)} onSave={(form) => saveBom(form, bomInModal)} />}
    {modal?.type === 'new-order' && <OrderModal database={database} onClose={() => setModal(null)} onSave={saveOrder} />}
    {modal?.type === 'result' && <ResultModal order={orderInModal} onClose={() => setModal(null)} onSave={(form) => saveResult(form, orderInModal.id)} />}
    {modal?.type === 'detail-plan' && planInModal && <Modal onClose={() => setModal(null)} wide><ModalHeader title={`Chi tiết ${planInModal.code}`} description="Kiểm tra số lượng kế hoạch, vật tư đã giữ chỗ và phần còn thiếu trước khi triển khai." onClose={() => setModal(null)} /><div className="space-y-5 p-5"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Sản phẩm', productOf(planInModal.productId)?.name], ['Đơn bán hàng', planInModal.order], ['Số lượng', `${formatNumber(planInModal.quantity)} ${productOf(planInModal.productId)?.unit}`], ['Thời hạn', formatDate(planInModal.end)]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#F4FAFE] p-3"><span className="block text-[10px] text-[#8096A5]">{label}</span><b className="mt-1 block text-xs text-[#274D63]">{value}</b></div>)}</div><div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-[#172033]">Nhu cầu nguyên phụ liệu</h3><StatusBadge status={planInModal.status} /></div><div className="overflow-x-auto rounded-xl border border-[#E2EDF5]"><table className="min-w-[720px] w-full text-left text-xs"><thead className="border-b border-[#E2EDF5] bg-[#F7FAFC] text-[10px] font-bold uppercase tracking-wide text-[#5F6F82]"><tr><th className="px-3 py-2.5">Mã</th><th className="px-3 py-2.5">Vật tư</th><th className="px-3 py-2.5 text-right">Nhu cầu</th><th className="px-3 py-2.5 text-right">Đã trừ kho</th><th className="px-3 py-2.5 text-right">Tồn kho</th><th className="px-3 py-2.5">Đáp ứng</th></tr></thead><tbody className="divide-y divide-[#EDF3F7]">{detailRequirements.length ? detailRequirements.map((row) => { const allocation = (planInModal.inventoryDeductions || []).find((item) => item.materialId === row.material.id); const missing = allocation ? allocation.missing : row.missing; return <tr key={row.id}><td className="px-3 py-3 font-bold text-[#0F5FAF]">{row.material.code}</td><td className="px-3 py-3 text-[#172033]">{row.material.name}</td><td className="px-3 py-3 text-right">{formatNumber(row.needed, 3)} {row.material.unit}</td><td className="px-3 py-3 text-right text-emerald-700">{planInModal.inventoryDeducted ? `${formatNumber(allocation?.quantity, 3)} ${row.material.unit}` : 'Chưa duyệt'}</td><td className="px-3 py-3 text-right">{formatNumber(row.material.stock, 3)} {row.material.unit}</td><td className={`px-3 py-3 font-semibold ${missing ? 'text-rose-600' : 'text-emerald-700'}`}>{missing ? `Thiếu ${formatNumber(missing, 3)}` : 'Đủ vật tư'}</td></tr>; }) : <tr><td colSpan="6" className="px-4 py-8 text-center text-[#8DA0B3]">Sản phẩm chưa có định mức Hiệu lực.</td></tr>}</tbody></table></div></div></div><div className="flex flex-wrap justify-end gap-2 border-t border-[#E2EDF5] bg-[#F9FCFE] px-5 py-4">{!['hoan_thanh', 'huy'].includes(planInModal.status) && <button onClick={() => cancelPlan(planInModal.id)} className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"><X className="h-3.5 w-3.5" />Hủy kế hoạch</button>}<PrimaryButton onClick={() => setModal(null)}>Đóng</PrimaryButton></div></Modal>}
    <Toast toast={toast} onClose={() => setToast(null)} />
  </div>;
}

export default ProductionModule;
