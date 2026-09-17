/**
 * ERP May 10 - Enterprise Menu Navigation Structure
 * Business-first categorization with strict RBAC permission mapping.
 */

export const ENTERPRISE_MENU = [
  {
    group: 'TỔNG QUAN',
    items: [
      {
        id: 'home',
        title: 'Trang chủ',
        path: '/',
        icon: 'LayoutDashboard',
        permission: 'dashboard.view',
      },
    ],
  },
  {
    group: 'KINH DOANH',
    permission: 'sales.view',
    items: [
      {
        id: 'sales-overview',
        title: 'Tổng quan bán hàng',
        path: '/sales',
        icon: 'LayoutDashboard',
        permission: 'sales.view',
      },
      {
        id: 'sales-customers',
        title: 'Khách hàng',
        path: '/sales/customers',
        icon: 'Users',
        permission: 'sales.view',
      },
      {
        id: 'sales-products',
        title: 'Sản phẩm',
        path: '/sales/products',
        icon: 'Package',
        permission: 'sales.view',
      },
      {
        id: 'sales-orders',
        title: 'Bán hàng & Đơn hàng',
        path: '/sales/orders',
        icon: 'ShoppingBag',
        permission: 'sales.view',
      },
      {
        id: 'sales-deliveries',
        title: 'Giao hàng',
        path: '/sales/deliveries',
        icon: 'ShoppingCart',
        permission: 'sales.view',
      },
      {
        id: 'sales-invoices',
        title: 'Hóa đơn bán hàng',
        path: '/sales/invoices',
        icon: 'DollarSign',
        permission: 'sales.view',
      },
      {
        id: 'sales-receivables',
        title: 'Công nợ phải thu',
        path: '/sales/receivables',
        icon: 'CreditCard',
        permission: 'sales.view',
      },
    ],
  },
  {
    group: 'SẢN XUẤT',
    permission: 'production.view',
    items: [
      {
        id: 'production-plan',
        title: 'Kế hoạch sản xuất',
        path: '/production',
        icon: 'CalendarDays',
        permission: 'production.view',
      },
      {
        id: 'production-orders',
        title: 'Lệnh sản xuất (LSX)',
        path: '/production',
        icon: 'Factory',
        permission: 'production.view',
      },
    ],
  },
  {
    group: 'MUA HÀNG',
    permission: 'purchasing.view',
    items: [
      {
        id: 'purchasing-orders',
        title: 'Đơn mua hàng (PO)',
        path: '/purchasing',
        icon: 'ShoppingCart',
        permission: 'purchasing.view',
      },
      {
        id: 'purchasing-suppliers',
        title: 'Nhà cung cấp',
        path: '/purchasing',
        icon: 'Building2',
        permission: 'purchasing.view',
      },
    ],
  },
  {
    group: 'KHO & VẬT TƯ',
    permission: 'warehouse.view',
    items: [
      {
        id: 'wh-dashboard',
        title: 'Tổng quan kho',
        path: '/warehouse?tab=dashboard',
        icon: 'Warehouse',
        permission: 'warehouse.view',
      },
      {
        id: 'wh-ton-kho',
        title: 'Tồn kho & Thẻ kho',
        path: '/warehouse?tab=ton-kho',
        icon: 'Package',
        permission: 'warehouse.view',
      },
      {
        id: 'wh-vi-tri',
        title: 'Vị trí kho',
        path: '/warehouse?tab=vi-tri',
        icon: 'Layers',
        permission: 'warehouse.view',
      },
      {
        id: 'wh-lo-vat-tu',
        title: 'Lô vật tư & Cây vải',
        path: '/warehouse?tab=lo-vat-tu',
        icon: 'Tag',
        permission: 'warehouse.view',
      },
      {
        id: 'wh-phieu-nhap',
        title: 'Phiếu nhập kho',
        path: '/warehouse?tab=phieu-nhap',
        icon: 'ArrowDownLeft',
        permission: 'warehouse.receipt',
      },
      {
        id: 'wh-phieu-xuat',
        title: 'Phiếu xuất kho',
        path: '/warehouse?tab=phieu-xuat',
        icon: 'ArrowUpRight',
        permission: 'warehouse.issue',
      },
      {
        id: 'wh-phieu-chuyen',
        title: 'Điều chuyển kho',
        path: '/warehouse?tab=phieu-chuyen',
        icon: 'RefreshCw',
        permission: 'warehouse.transfer',
      },
      {
        id: 'wh-kiem-ke',
        title: 'Kiểm kê kho',
        path: '/warehouse?tab=kiem-ke',
        icon: 'ClipboardCheck',
        permission: 'warehouse.stocktake',
      },
    ],
  },
  {
    group: 'TÀI CHÍNH',
    permission: 'accounting.view',
    items: [
      {
        id: 'acc-journal',
        title: 'Kế toán & Sổ cái',
        path: '/accounting',
        icon: 'Calculator',
        permission: 'accounting.view',
      },
      {
        id: 'acc-debts',
        title: 'Công nợ',
        path: '/accounting',
        icon: 'CreditCard',
        permission: 'accounting.view',
      },
      {
        id: 'acc-costs',
        title: 'Giá thành sản phẩm',
        path: '/accounting',
        icon: 'DollarSign',
        permission: 'accounting.cost',
      },
    ],
  },
  {
    group: 'QUẢN TRỊ',
    permission: 'admin.users',
    items: [
      {
        id: 'admin-users',
        title: 'Người dùng',
        path: '/admin/users',
        icon: 'Users',
        permission: 'admin.users',
      },
      {
        id: 'admin-permissions',
        title: 'Vai trò & phân quyền',
        path: '/admin/permissions',
        icon: 'ShieldCheck',
        permission: 'admin.permissions',
      },
    ],
  },
];
