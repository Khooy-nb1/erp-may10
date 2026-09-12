import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../../types/invoice.js';
import { getInvoiceById } from '../../services/invoiceService.js';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Link } from '@astryxdesign/core/Link';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { ArrowLeft } from 'lucide-react';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { AsyncPanel } from '../../components/common/AsyncPanel.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

/** `qua_han` reads "Quá hạn thanh toán" on this screen; the shared badge labels it "Quá hạn". */
const STATUS_LABELS: Partial<Record<Invoice['trang_thai'], string>> = {
  qua_han: 'Quá hạn thanh toán',
};

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoiceById(invoiceId);
      setInvoice(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const remainingDebt = invoice
    ? Math.max(0, Number(invoice.tong_tien_sau_thue) - Number(invoice.so_tien_da_thu))
    : 0;
  const isOverdue = invoice?.trang_thai === 'qua_han';

  return (
    <PageScaffold
      title={invoice ? `Hóa đơn: ${invoice.ma_hoa_don}` : 'Hóa đơn'}
      subtitle={
        invoice
          ? `Ngày xuất: ${formatDate(invoice.ngay_xuat_hoa_don)} • Hạn thanh toán: ${formatDate(invoice.ngay_dao_han)}`
          : undefined
      }
      breadcrumbs={[
        { label: 'Hóa đơn', href: '/invoices' },
        { label: invoice?.ma_hoa_don ?? 'Chi tiết' },
      ]}
      actions={
        <Button
          label="Danh sách hóa đơn"
          variant="secondary"
          icon={<ArrowLeft size={16} aria-hidden />}
          href="/invoices"
        />
      }
    >
      <AsyncPanel
        isLoading={loading}
        error={error}
        isEmpty={!invoice}
        loadingMessage="Đang tải chi tiết hóa đơn..."
        emptyTitle="Không tìm thấy hóa đơn"
        emptyDescription="Hóa đơn không tồn tại hoặc đã bị xóa."
        onRetry={fetchInvoice}
      >
        {invoice && (
          <VStack gap={5}>
            {isOverdue && (
              <Banner
                status="warning"
                title="Hóa đơn đã quá hạn thanh toán"
                description={`Hóa đơn này đã quá ngày đáo hạn (${formatDate(invoice.ngay_dao_han)}). Số tiền còn nợ: ${formatCurrency(remainingDebt)}. Cần liên hệ đối tác để thu hồi nợ.`}
                collapsible={false}
              />
            )}

            {/* Financial Summary Breakdown */}
            <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
              <Card>
                <VStack gap={1}>
                  <Text type="supporting">Tiền trước thuế</Text>
                  <Text type="label" hasTabularNumbers>
                    {formatCurrency(invoice.tong_tien_truoc_thue)}
                  </Text>
                </VStack>
              </Card>
              <Card>
                <VStack gap={1}>
                  <Text type="supporting">Tiền thuế GTGT</Text>
                  <Text type="label" hasTabularNumbers>
                    {formatCurrency(invoice.tien_thue)}
                  </Text>
                </VStack>
              </Card>
              <Card variant="blue">
                <VStack gap={1}>
                  <Text type="supporting">Tổng tiền sau thuế</Text>
                  <Text type="label" hasTabularNumbers>
                    {formatCurrency(invoice.tong_tien_sau_thue)}
                  </Text>
                </VStack>
              </Card>
              <Card variant="green">
                <VStack gap={1}>
                  <Text type="supporting">Đã thu lũy kế</Text>
                  <Text type="label" hasTabularNumbers>
                    {formatCurrency(invoice.so_tien_da_thu)}
                  </Text>
                </VStack>
              </Card>
              <Card variant={remainingDebt > 0 ? 'red' : 'green'}>
                <VStack gap={1}>
                  <Text type="supporting">Còn phải thu</Text>
                  <Text type="label" hasTabularNumbers>
                    {formatCurrency(remainingDebt)}
                  </Text>
                </VStack>
              </Card>
            </Grid>

            {/* Invoice Information Card */}
            <Card>
              <VStack gap={4}>
                <Heading level={3}>Thông tin chứng từ liên kết</Heading>
                <MetadataList columns={2}>
                  <MetadataListItem label="Đơn bán hàng liên kết">
                    <Link href={`/sales-orders/${invoice.ma_don_ban_hang}`}>
                      {invoice.ma_don_ban || `Đơn hàng #${invoice.ma_don_ban_hang}`}
                    </Link>
                  </MetadataListItem>
                  <MetadataListItem label="Khách hàng">
                    <Link href={`/customers/${invoice.ma_khach_hang}`}>
                      {invoice.ten_khach_hang || `Khách hàng #${invoice.ma_khach_hang}`}
                    </Link>
                  </MetadataListItem>
                  <MetadataListItem label="Trạng thái thanh toán">
                    <StatusBadge
                      status={invoice.trang_thai}
                      label={STATUS_LABELS[invoice.trang_thai]}
                    />
                  </MetadataListItem>
                  <MetadataListItem label="Ngày xuất hóa đơn">
                    {formatDate(invoice.ngay_xuat_hoa_don)}
                  </MetadataListItem>
                  <MetadataListItem label="Hạn thanh toán (Đáo hạn)">
                    {formatDate(invoice.ngay_dao_han)}
                  </MetadataListItem>
                  <MetadataListItem label="Ghi chú">
                    {invoice.ghi_chu || 'Không có ghi chú'}
                  </MetadataListItem>
                </MetadataList>
              </VStack>
            </Card>

            {/* Informational Disclaimer Card */}
            <Banner
              status="info"
              title="Lưu ý về lịch sử thanh toán:"
              description="Cơ sở dữ liệu ERP hiện tại chỉ lưu trữ số tiền đã thu lũy kế (so_tien_da_thu) mà không có bảng nhật ký từng đợt thanh toán (chi_tiet_thanh_toan). Do đó, giao diện không hiển thị lịch sử phân kỳ thanh toán để đảm bảo tính toàn vẹn dữ liệu."
              collapsible={false}
            />
          </VStack>
        )}
      </AsyncPanel>
    </PageScaffold>
  );
};
