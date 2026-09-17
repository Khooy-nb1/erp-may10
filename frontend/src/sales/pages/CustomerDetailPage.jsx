import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from '../components/ui/toast.jsx';
import {
  getCustomerById,
  getCustomerSummary,
  getCustomerReceivables,
  updateCustomerStatus,
} from '../services/customerService.js';
import { getReceivableSummary } from '../services/receivableService.js';
import { useAuth } from '../../components/rbac/AuthContext.jsx';
import { isAdmin } from '../config/permissions.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { AsyncPanel } from '../components/common/AsyncPanel.jsx';
import { StatusBadge, statusLabel } from '../components/common/StatusBadge.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { AlertDialog } from '../components/ui/AlertDialog.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { MetadataList, MetadataListItem } from '../components/ui/MetadataList.jsx';
import { Table, proportional } from '../components/ui/Table.jsx';
import { Tab, TabList, TabPanel, Tabs } from '../components/ui/Tabs.jsx';
import { Text } from '../components/ui/Typography.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { formatCurrency, formatDate } from '../lib/format.js';

/**
 * Customer 360 (PH1 `pages/customers/CustomerDetailPage.tsx`, ported 1:1 for Step 6H).
 *
 * Request order is PH1's: the profile and its commercial summary are fetched
 * together on mount, and the receivables tab lazily loads its page plus summary
 * the first time it is opened (cancellation guards kept, so a quick tab switch
 * or id change cannot land a stale response).
 *
 * Admin-only status transitions keep PH1's confirm dialog; in-module links move
 * under Core's mount point (`/invoices/:id` -> `/sales/invoices/:id`).
 */

export function CustomerDetailPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  // Receivables tab (lazy-loaded on first open)
  const [receivables, setReceivables] = useState([]);
  const [receivableSummary, setReceivableSummary] = useState(null);
  const [receivablesLoading, setReceivablesLoading] = useState(false);
  const [receivablesError, setReceivablesError] = useState(null);
  const [receivablesLoadedFor, setReceivablesLoadedFor] = useState(null);
  const [receivablesTotal, setReceivablesTotal] = useState(0);
  const [receivablesReloadKey, setReceivablesReloadKey] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([getCustomerById(customerId), getCustomerSummary(customerId)]);
      setCustomer(c);
      setSummary(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  useEffect(() => {
    if (activeTab !== 'receivables' || !customerId || receivablesLoadedFor === customerId) {
      return;
    }

    let cancelled = false;
    setReceivablesLoading(true);
    setReceivablesError(null);

    Promise.all([getCustomerReceivables(customerId, { pageSize: 100 }), getReceivableSummary(customerId)])
      .then(([page, sum]) => {
        if (cancelled) return;
        setReceivables(page.receivables);
        setReceivablesTotal(page.meta.total);
        setReceivableSummary(sum);
        setReceivablesLoadedFor(customerId);
      })
      .catch((err) => {
        if (cancelled) return;
        setReceivablesError(err instanceof Error ? err.message : 'Không thể tải sổ công nợ');
      })
      .finally(() => {
        if (!cancelled) setReceivablesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, customerId, receivablesLoadedFor, receivablesReloadKey]);

  const handleConfirmOpenChange = (isOpen) => {
    if (!isOpen) setPendingStatus(null);
  };

  const handleStatusChange = async () => {
    if (!pendingStatus) {
      return;
    }
    setUpdatingStatus(true);
    try {
      const updated = await updateCustomerStatus(customerId, pendingStatus);
      setCustomer(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái');
    } finally {
      setUpdatingStatus(false);
      handleConfirmOpenChange(false);
    }
  };

  const receivableColumns = [
    {
      key: 'ma_hoa_don',
      header: 'Mã hóa đơn',
      width: proportional(1),
      renderCell: (r) =>
        r.ma_hoa_don ? (
          <TextLink to={`/sales/invoices/${r.ma_hoa_don}`}>{r.ma_hoa_don_code || `#${r.ma_hoa_don}`}</TextLink>
        ) : (
          r.ma_hoa_don_code || '—'
        ),
    },
    {
      key: 'so_tien_phat_sinh',
      header: 'Phát sinh',
      align: 'end',
      width: proportional(1),
      renderCell: (r) => (
        <Text as="span" className="font-semibold tabular-nums">
          {formatCurrency(r.so_tien_phat_sinh)}
        </Text>
      ),
    },
    {
      key: 'so_tien_da_thanh_toan',
      header: 'Đã thanh toán',
      align: 'end',
      width: proportional(1),
      renderCell: (r) => (
        <Text as="span" className="tabular-nums">
          {formatCurrency(r.so_tien_da_thanh_toan)}
        </Text>
      ),
    },
    {
      key: 'so_tien_con_lai',
      header: 'Còn lại',
      align: 'end',
      width: proportional(1),
      renderCell: (r) => (
        <Text as="span" className="font-semibold tabular-nums">
          {formatCurrency(r.so_tien_con_lai)}
        </Text>
      ),
    },
    {
      key: 'ngay_dao_han',
      header: 'Ngày đáo hạn',
      width: proportional(1),
      renderCell: (r) => formatDate(r.ngay_dao_han),
    },
    {
      key: 'daysOverdue',
      header: 'Số ngày quá hạn',
      align: 'end',
      width: proportional(1),
      renderCell: (r) =>
        r.daysOverdue && r.daysOverdue > 0 ? (
          <Text as="span" className="font-semibold tabular-nums">
            {r.daysOverdue}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      key: 'trang_thai',
      header: 'Trạng thái',
      width: proportional(1),
      renderCell: (r) => <StatusBadge status={r.trang_thai} />,
    },
  ];

  const receivableRows = receivables.map((r) => ({ ...r }));

  const breadcrumbs = customer
    ? [
        { label: 'Khách hàng', href: '/sales/customers' },
        { label: customer.ten_khach_hang },
      ]
    : [{ label: 'Khách hàng', href: '/sales/customers' }];

  return (
    <PageScaffold
      title={customer ? `${customer.ten_khach_hang} (${customer.ma_khach_hang})` : 'Khách hàng'}
      subtitle={customer ? `Loại: ${customer.loai_khach_hang} • Khu vực: ${customer.tinh_thanh_pho}` : undefined}
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} aria-hidden />}
            href="/sales/customers"
          >
            Danh sách
          </Button>

          {isAdmin(user) && customer ? (
            <div className="flex flex-wrap items-center gap-2">
              {customer.trang_thai === 'hoat_dong' ? (
                <Button
                  variant="secondary"
                  disabled={updatingStatus}
                  onClick={() => setPendingStatus('tam_khoa')}
                >
                  Tạm khóa
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={updatingStatus}
                  onClick={() => setPendingStatus('hoat_dong')}
                >
                  Kích hoạt lại
                </Button>
              )}

              {customer.trang_thai !== 'ngung_giao_dich' && (
                <Button
                  variant="destructive"
                  disabled={updatingStatus}
                  onClick={() => setPendingStatus('ngung_giao_dich')}
                >
                  Ngừng giao dịch
                </Button>
              )}
            </div>
          ) : null}
        </div>
      }
    >
      <AsyncPanel
        isLoading={loading}
        error={error || (!customer ? 'Không tìm thấy thông tin khách hàng' : null)}
        loadingMessage="Đang tải hồ sơ khách hàng..."
        onRetry={fetchData}
      >
        {customer ? (
          <div className="flex w-full flex-col gap-5">
            {/* Commercial Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <div className="flex flex-col gap-1">
                    <Text variant="supporting">Tổng số đơn hàng</Text>
                    <Text variant="large" className="font-bold tabular-nums">
                      {summary.totalOrders}
                    </Text>
                  </div>
                </Card>
                <Card>
                  <div className="flex flex-col gap-1">
                    <Text variant="supporting">Tổng giá trị đặt hàng</Text>
                    <Text variant="large" className="font-bold tabular-nums">
                      {formatCurrency(summary.totalOrderValue)}
                    </Text>
                  </div>
                </Card>
                <Card>
                  <div className="flex flex-col gap-1">
                    <Text variant="supporting">Công nợ phải thu hiện tại</Text>
                    <Text variant="large" className="font-bold tabular-nums">
                      {formatCurrency(summary.outstandingReceivable)}
                    </Text>
                  </div>
                </Card>
                <Card>
                  <div className="flex flex-col gap-1">
                    <Text variant="supporting">Nợ quá hạn</Text>
                    <Text variant="large" className="font-bold tabular-nums">
                      {formatCurrency(summary.overdueReceivable)}
                    </Text>
                  </div>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(value) => setActiveTab(value)}>
              <TabList className="flex-nowrap overflow-x-auto whitespace-nowrap border-b border-brand-border">
                <Tab value="info" label="Thông tin chi tiết" />
                <Tab value="orders" label="Đơn bán hàng" />
                <Tab value="invoices" label="Hóa đơn" />
                <Tab value="receivables" label="Sổ công nợ" />
              </TabList>

              {/* Tab Content */}
              <TabPanel value="info">
                <Card>
                  <MetadataList columns={2}>
                    <MetadataListItem label="Mã số thuế">{customer.ma_so_thue || 'Chưa cập nhật'}</MetadataListItem>
                    <MetadataListItem label="Số điện thoại">{customer.so_dien_thoai}</MetadataListItem>
                    <MetadataListItem label="Email">{customer.email || 'Chưa cập nhật'}</MetadataListItem>
                    <MetadataListItem label="Người liên hệ">{customer.nguoi_lien_he || 'Chưa cập nhật'}</MetadataListItem>
                    <MetadataListItem label="Địa chỉ">
                      {customer.dia_chi}, {customer.tinh_thanh_pho}
                    </MetadataListItem>
                    <MetadataListItem label="Hạn mức công nợ được cấp">
                      <Text as="span" className="font-semibold tabular-nums">
                        {formatCurrency(customer.han_muc_cong_no)}
                      </Text>
                    </MetadataListItem>
                    <MetadataListItem label="Thời hạn nợ tối đa">{customer.so_ngay_cong_no} ngày</MetadataListItem>
                    <MetadataListItem label="Trạng thái">
                      <StatusBadge status={customer.trang_thai} />
                    </MetadataListItem>
                    <MetadataListItem label="Ghi chú nội bộ">
                      {customer.ghi_chu || 'Không có ghi chú'}
                    </MetadataListItem>
                  </MetadataList>
                </Card>
              </TabPanel>

              <TabPanel value="orders">
                <EmptyState
                  title="Đơn bán hàng của khách"
                  description="Danh sách đơn hàng liên kết sẽ hiển thị khi phân hệ Đơn bán hàng (P5) được hoàn thiện."
                />
              </TabPanel>

              <TabPanel value="invoices">
                <EmptyState
                  title="Hóa đơn bán hàng"
                  description="Danh sách hóa đơn liên kết sẽ hiển thị khi phân hệ Hóa đơn (P7) được hoàn thiện."
                />
              </TabPanel>

              <TabPanel value="receivables">
                <div className="flex w-full flex-col gap-4">
                  <Banner status="info" title="Chỉ đọc — ghi nhận thanh toán thuộc Kế toán." />

                  <AsyncPanel
                    isLoading={!receivablesError && (receivablesLoading || receivablesLoadedFor !== customerId)}
                    error={receivablesError}
                    isEmpty={
                      !receivablesError &&
                      !receivablesLoading &&
                      receivablesLoadedFor === customerId &&
                      receivables.length === 0
                    }
                    loadingMessage="Đang tải sổ công nợ..."
                    onRetry={() => setReceivablesReloadKey((k) => k + 1)}
                    emptyTitle="Không có công nợ phải thu"
                    emptyDescription="Khách hàng này hiện không có khoản công nợ phải thu nào."
                  >
                    <div className="flex w-full flex-col gap-4">
                      {receivableSummary && (
                        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                          <Card>
                            <div className="flex flex-col gap-1">
                              <Text variant="supporting">Phát sinh</Text>
                              <Text variant="large" className="font-bold tabular-nums">
                                {formatCurrency(receivableSummary.totalOriginal)}
                              </Text>
                            </div>
                          </Card>
                          <Card>
                            <div className="flex flex-col gap-1">
                              <Text variant="supporting">Đã thu</Text>
                              <Text variant="large" className="font-bold tabular-nums">
                                {formatCurrency(receivableSummary.totalPaid)}
                              </Text>
                            </div>
                          </Card>
                          <Card>
                            <div className="flex flex-col gap-1">
                              <Text variant="supporting">Còn lại</Text>
                              <Text variant="large" className="font-bold tabular-nums">
                                {formatCurrency(receivableSummary.totalOutstanding)}
                              </Text>
                            </div>
                          </Card>
                          <Card>
                            <div className="flex flex-col gap-1">
                              <Text variant="supporting">Quá hạn</Text>
                              <Text variant="large" className="font-bold tabular-nums">
                                {formatCurrency(receivableSummary.totalOverdue)}
                              </Text>
                              <Text variant="supporting">{receivableSummary.overdueCount} khoản quá hạn</Text>
                            </div>
                          </Card>
                        </div>
                      )}

                      <Card className="p-0">
                        <Table data={receivableRows} columns={receivableColumns} idKey="id" density="compact" hasHover />
                        <div className="flex flex-wrap gap-1 px-4 py-3">
                          <Text variant="supporting">
                            Hiển thị {receivables.length}/{receivablesTotal} khoản công nợ phải thu
                            {receivablesTotal > receivables.length && ' — xem đầy đủ tại trang Sổ công nợ.'}
                          </Text>
                        </div>
                      </Card>
                    </div>
                  </AsyncPanel>
                </div>
              </TabPanel>
            </Tabs>
          </div>
        ) : null}
      </AsyncPanel>

      <AlertDialog
        isOpen={pendingStatus !== null}
        onOpenChange={handleConfirmOpenChange}
        title={`Chuyển trạng thái sang "${statusLabel(pendingStatus ?? '')}"`}
        description={`Bạn có chắc chắn muốn chuyển trạng thái khách hàng sang "${statusLabel(
          pendingStatus ?? ''
        )}"? Thao tác này có thể hoàn tác bằng cách chuyển lại trạng thái.`}
        actionLabel="Xác nhận"
        cancelLabel="Hủy"
        actionVariant={pendingStatus === 'ngung_giao_dich' ? 'destructive' : 'primary'}
        isActionLoading={updatingStatus}
        onAction={() => {
          void handleStatusChange();
        }}
      />
    </PageScaffold>
  );
}
