import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Link } from '@astryxdesign/core/Link';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table, proportional, type TableColumn } from '@astryxdesign/core/Table';
import { useToast } from '@astryxdesign/core/Toast';
import { Customer, CustomerSummary } from '../../types/customer.js';
import { Receivable, ReceivableStatus, ReceivableSummary } from '../../types/receivable.js';
import { getCustomerById, getCustomerSummary, updateCustomerStatus } from '../../services/customerService.js';
import { getCustomerReceivables, getReceivableSummary } from '../../services/receivableService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { AsyncPanel } from '../../components/common/AsyncPanel.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { EmptyState } from '../../components/common/EmptyState.js';

interface ReceivableRow extends Record<string, unknown> {
  id: number;
  ma_hoa_don: number | null;
  ma_hoa_don_code?: string;
  so_tien_phat_sinh: number | string;
  so_tien_da_thanh_toan: number | string;
  so_tien_con_lai: number | string;
  ngay_dao_han: string;
  daysOverdue?: number;
  trang_thai: ReceivableStatus;
}

type DetailTab = 'info' | 'orders' | 'invoices' | 'receivables';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);
  const { user } = useAuth();
  const toast = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Receivables tab (lazy-loaded on first open)
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [receivableSummary, setReceivableSummary] = useState<ReceivableSummary | null>(null);
  const [receivablesLoading, setReceivablesLoading] = useState<boolean>(false);
  const [receivablesError, setReceivablesError] = useState<string | null>(null);
  const [receivablesLoadedFor, setReceivablesLoadedFor] = useState<number | null>(null);
  const [receivablesTotal, setReceivablesTotal] = useState<number>(0);
  const [receivablesReloadKey, setReceivablesReloadKey] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([
        getCustomerById(customerId),
        getCustomerSummary(customerId),
      ]);
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
      .catch((err: unknown) => {
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

  const handleConfirmOpenChange = (isOpen: boolean) => {
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
      toast({
        body: err instanceof Error ? err.message : 'Không thể cập nhật trạng thái',
        type: 'error',
      });
    } finally {
      setUpdatingStatus(false);
      handleConfirmOpenChange(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const receivableColumns: TableColumn<ReceivableRow>[] = [
    {
      key: 'ma_hoa_don',
      header: 'Mã hóa đơn',
      width: proportional(1),
      renderCell: (r) =>
        r.ma_hoa_don ? (
          <Link href={`/invoices/${r.ma_hoa_don}`}>{r.ma_hoa_don_code || `#${r.ma_hoa_don}`}</Link>
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
        <Text as="span" weight="semibold" hasTabularNumbers>
          {formatCurrency(r.so_tien_phat_sinh)}
        </Text>
      ),
    },
    {
      key: 'so_tien_da_thanh_toan',
      header: 'Đã thanh toán',
      align: 'end',
      width: proportional(1),
      renderCell: (r) => <Text as="span" hasTabularNumbers>{formatCurrency(r.so_tien_da_thanh_toan)}</Text>,
    },
    {
      key: 'so_tien_con_lai',
      header: 'Còn lại',
      align: 'end',
      width: proportional(1),
      renderCell: (r) => (
        <Text as="span" weight="semibold" hasTabularNumbers>
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
      align: 'center',
      width: proportional(1),
      renderCell: (r) =>
        r.daysOverdue && r.daysOverdue > 0 ? (
          <Text as="span" weight="semibold" hasTabularNumbers>
            {r.daysOverdue}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      key: 'trang_thai',
      header: 'Trạng thái',
      align: 'center',
      width: proportional(1),
      renderCell: (r) => <StatusBadge status={r.trang_thai} />,
    },
  ];

  const receivableRows: ReceivableRow[] = receivables.map((r) => ({ ...r }));

  const isAdmin = user?.vai_tro === 'admin';

  const breadcrumbs = customer
    ? [
        { label: 'Khách hàng', href: '/customers' },
        { label: customer.ten_khach_hang },
      ]
    : [{ label: 'Khách hàng', href: '/customers' }];

  return (
    <PageScaffold
      title={customer ? `${customer.ten_khach_hang} (${customer.ma_khach_hang})` : 'Khách hàng'}
      subtitle={customer ? `Loại: ${customer.loai_khach_hang} • Khu vực: ${customer.tinh_thanh_pho}` : undefined}
      breadcrumbs={breadcrumbs}
      actions={
        <HStack gap={2} wrap="wrap" vAlign="center">
          <Link href="/customers" weight="medium">
            <ArrowLeft size={16} aria-hidden /> Danh sách
          </Link>

          {isAdmin && customer ? (
            <HStack gap={2} wrap="wrap" vAlign="center">
              {customer.trang_thai === 'hoat_dong' ? (
                <Button
                  label="Tạm khóa"
                  variant="secondary"
                  isDisabled={updatingStatus}
                  onClick={() => setPendingStatus('tam_khoa')}
                />
              ) : (
                <Button
                  label="Kích hoạt lại"
                  variant="secondary"
                  isDisabled={updatingStatus}
                  onClick={() => setPendingStatus('hoat_dong')}
                />
              )}

              {customer.trang_thai !== 'ngung_giao_dich' && (
                <Button
                  label="Ngừng giao dịch"
                  variant="destructive"
                  isDisabled={updatingStatus}
                  onClick={() => setPendingStatus('ngung_giao_dich')}
                />
              )}
            </HStack>
          ) : null}
        </HStack>
      }
    >
      <AsyncPanel
        isLoading={loading}
        error={error || (!customer ? 'Không tìm thấy thông tin khách hàng' : null)}
        loadingMessage="Đang tải hồ sơ khách hàng..."
        onRetry={fetchData}
      >
        {customer ? (
          <VStack gap={5} width="100%">
            {/* Commercial Summary Cards */}
            {summary && (
              <Grid columns={{ minWidth: 200 }} gap={4}>
                <Card>
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      Tổng số đơn hàng
                    </Text>
                    <Text type="large" weight="bold" hasTabularNumbers>
                      {summary.totalOrders}
                    </Text>
                  </VStack>
                </Card>
                <Card>
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      Tổng giá trị đặt hàng
                    </Text>
                    <Text type="large" weight="bold" hasTabularNumbers>
                      {formatCurrency(summary.totalOrderValue)}
                    </Text>
                  </VStack>
                </Card>
                <Card>
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      Công nợ phải thu hiện tại
                    </Text>
                    <Text type="large" weight="bold" hasTabularNumbers>
                      {formatCurrency(summary.outstandingReceivable)}
                    </Text>
                  </VStack>
                </Card>
                <Card>
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      Nợ quá hạn
                    </Text>
                    <Text type="large" weight="bold" hasTabularNumbers>
                      {formatCurrency(summary.overdueReceivable)}
                    </Text>
                  </VStack>
                </Card>
              </Grid>
            )}

            {/* Tabs */}
            <TabList
              value={activeTab}
              onChange={(value) => setActiveTab(value as DetailTab)}
              hasDivider
            >
              <Tab value="info" label="Thông tin chi tiết" />
              <Tab value="orders" label="Đơn bán hàng" />
              <Tab value="invoices" label="Hóa đơn" />
              <Tab value="receivables" label="Sổ công nợ" />
            </TabList>

            {/* Tab Content */}
            {activeTab === 'info' && (
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
                    <Text as="span" weight="semibold" hasTabularNumbers>
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
            )}

            {activeTab === 'orders' && (
              <EmptyState
                title="Đơn bán hàng của khách"
                description="Danh sách đơn hàng liên kết sẽ hiển thị khi phân hệ Đơn bán hàng (P5) được hoàn thiện."
              />
            )}

            {activeTab === 'invoices' && (
              <EmptyState
                title="Hóa đơn bán hàng"
                description="Danh sách hóa đơn liên kết sẽ hiển thị khi phân hệ Hóa đơn (P7) được hoàn thiện."
              />
            )}

            {activeTab === 'receivables' && (
              <VStack gap={4} width="100%">
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
                  <VStack gap={4} width="100%">
                    {receivableSummary && (
                      <Grid columns={{ minWidth: 180 }} gap={3}>
                        <Card>
                          <VStack gap={1}>
                            <Text type="supporting" color="secondary">
                              Phát sinh
                            </Text>
                            <Text type="large" weight="bold" hasTabularNumbers>
                              {formatCurrency(receivableSummary.totalOriginal)}
                            </Text>
                          </VStack>
                        </Card>
                        <Card>
                          <VStack gap={1}>
                            <Text type="supporting" color="secondary">
                              Đã thu
                            </Text>
                            <Text type="large" weight="bold" hasTabularNumbers>
                              {formatCurrency(receivableSummary.totalPaid)}
                            </Text>
                          </VStack>
                        </Card>
                        <Card>
                          <VStack gap={1}>
                            <Text type="supporting" color="secondary">
                              Còn lại
                            </Text>
                            <Text type="large" weight="bold" hasTabularNumbers>
                              {formatCurrency(receivableSummary.totalOutstanding)}
                            </Text>
                          </VStack>
                        </Card>
                        <Card>
                          <VStack gap={1}>
                            <Text type="supporting" color="secondary">
                              Quá hạn
                            </Text>
                            <Text type="large" weight="bold" hasTabularNumbers>
                              {formatCurrency(receivableSummary.totalOverdue)}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {receivableSummary.overdueCount} khoản quá hạn
                            </Text>
                          </VStack>
                        </Card>
                      </Grid>
                    )}

                    <Card padding={0}>
                      <Table
                        data={receivableRows}
                        columns={receivableColumns}
                        idKey="id"
                        hasHover
                      />
                      <HStack gap={1} paddingBlock={3} paddingInline={4} wrap="wrap">
                        <Text type="supporting" color="secondary">
                          Hiển thị {receivables.length}/{receivablesTotal} khoản công nợ phải thu
                          {receivablesTotal > receivables.length && ' — xem đầy đủ tại trang Sổ công nợ.'}
                        </Text>
                      </HStack>
                    </Card>
                  </VStack>
                </AsyncPanel>
              </VStack>
            )}
          </VStack>
        ) : null}
      </AsyncPanel>

      <AlertDialog
        isOpen={pendingStatus !== null}
        onOpenChange={handleConfirmOpenChange}
        title="Xác nhận chuyển trạng thái"
        description={`Bạn có chắc chắn muốn chuyển trạng thái khách hàng sang "${pendingStatus ?? ''}"?`}
        actionLabel="Xác nhận"
        cancelLabel="Hủy"
        isActionLoading={updatingStatus}
        onAction={() => {
          void handleStatusChange();
        }}
      />
    </PageScaffold>
  );
};
