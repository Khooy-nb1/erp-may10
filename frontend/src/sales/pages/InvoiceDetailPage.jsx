import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getInvoiceById } from '../services/invoiceService.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { AsyncPanel } from '../components/common/AsyncPanel.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { MetadataList, MetadataListItem } from '../components/ui/MetadataList.jsx';
import { Heading, Text } from '../components/ui/Typography.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { formatCurrency, formatDate } from '../lib/format.js';

/**
 * Invoice detail (PH1 \`pages/invoices/InvoiceDetailPage.tsx\`, ported 1:1 for Step 6H).
 * \`qua_han\` reads "Quá hạn thanh toán" on this screen; the shared badge labels it "Quá hạn".
 * In-module links are rewritten under \`/sales\`.
 */
const STATUS_LABELS = {
  qua_han: 'Quá hạn thanh toán',
};

export function InvoiceDetailPage() {
  const { id } = useParams();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const remainingDebt = invoice
    ? Math.max(0, Number(invoice.tong_tien_sau_thue) - Number(invoice.so_tien_da_thu))
    : 0;
  const isOverdue = invoice && invoice.trang_thai === 'qua_han';

  return (
    <PageScaffold
      title={invoice ? 'Hóa đơn: ' + invoice.ma_hoa_don : 'Hóa đơn'}
      subtitle={
        invoice
          ? 'Ngày xuất: ' +
            formatDate(invoice.ngay_xuat_hoa_don) +
            ' • Hạn thanh toán: ' +
            formatDate(invoice.ngay_dao_han)
          : undefined
      }
      breadcrumbs={[
        { label: 'Hóa đơn', href: '/sales/invoices' },
        { label: (invoice && invoice.ma_hoa_don) || 'Chi tiết' },
      ]}
      actions={
        <Button variant="secondary" icon={<ArrowLeft size={16} aria-hidden />} href="/sales/invoices">
          Danh sách hóa đơn
        </Button>
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
          <div className="flex flex-col gap-5">
            {isOverdue && (
              <Banner
                status="warning"
                title="Hóa đơn đã quá hạn thanh toán"
                description={
                  'Hóa đơn này đã quá ngày đáo hạn (' +
                  formatDate(invoice.ngay_dao_han) +
                  '). Số tiền còn nợ: ' +
                  formatCurrency(remainingDebt) +
                  '. Cần liên hệ đối tác để thu hồi nợ.'
                }
              />
            )}

            {/* Financial Summary Breakdown */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Card>
                <div className="flex flex-col gap-1">
                  <Text variant="supporting">Tiền trước thuế</Text>
                  <Text variant="large" className="tabular-nums">
                    {formatCurrency(invoice.tong_tien_truoc_thue)}
                  </Text>
                </div>
              </Card>
              <Card>
                <div className="flex flex-col gap-1">
                  <Text variant="supporting">Tiền thuế GTGT</Text>
                  <Text variant="large" className="tabular-nums">
                    {formatCurrency(invoice.tien_thue)}
                  </Text>
                </div>
              </Card>
              <Card variant="blue">
                <div className="flex flex-col gap-1">
                  <Text variant="supporting">Tổng tiền sau thuế</Text>
                  <Text variant="large" className="tabular-nums">
                    {formatCurrency(invoice.tong_tien_sau_thue)}
                  </Text>
                </div>
              </Card>
              <Card variant="green">
                <div className="flex flex-col gap-1">
                  <Text variant="supporting">Đã thu lũy kế</Text>
                  <Text variant="large" className="tabular-nums">
                    {formatCurrency(invoice.so_tien_da_thu)}
                  </Text>
                </div>
              </Card>
              <Card variant={remainingDebt > 0 ? 'red' : 'green'}>
                <div className="flex flex-col gap-1">
                  <Text variant="supporting">Còn phải thu</Text>
                  <Text variant="large" className="tabular-nums">
                    {formatCurrency(remainingDebt)}
                  </Text>
                </div>
              </Card>
            </div>

            {/* Invoice Information Card */}
            <Card>
              <div className="flex flex-col gap-4">
                <Heading level={3}>Thông tin chứng từ liên kết</Heading>
                <MetadataList columns={2}>
                  <MetadataListItem label="Đơn bán hàng liên kết">
                    <TextLink to={'/sales/orders/' + invoice.ma_don_ban_hang}>
                      {invoice.ma_don_ban || 'Đơn hàng #' + invoice.ma_don_ban_hang}
                    </TextLink>
                  </MetadataListItem>
                  <MetadataListItem label="Khách hàng">
                    <TextLink to={'/sales/customers/' + invoice.ma_khach_hang}>
                      {invoice.ten_khach_hang || 'Khách hàng #' + invoice.ma_khach_hang}
                    </TextLink>
                  </MetadataListItem>
                  <MetadataListItem label="Trạng thái thanh toán">
                    <StatusBadge status={invoice.trang_thai} label={STATUS_LABELS[invoice.trang_thai]} />
                  </MetadataListItem>
                  <MetadataListItem label="Ngày xuất hóa đơn">{formatDate(invoice.ngay_xuat_hoa_don)}</MetadataListItem>
                  <MetadataListItem label="Hạn thanh toán (Đáo hạn)">{formatDate(invoice.ngay_dao_han)}</MetadataListItem>
                  <MetadataListItem label="Ghi chú">{invoice.ghi_chu || 'Không có ghi chú'}</MetadataListItem>
                </MetadataList>
              </div>
            </Card>

            {/* Informational Disclaimer Card */}
            <Banner
              status="info"
              title="Lưu ý về lịch sử thanh toán:"
              description="Cơ sở dữ liệu ERP hiện tại chỉ lưu trữ số tiền đã thu lũy kế (so_tien_da_thu) mà không có bảng nhật ký từng đợt thanh toán (chi_tiet_thanh_toan). Do đó, giao diện không hiển thị lịch sử phân kỳ thanh toán để đảm bảo tính toàn vẹn dữ liệu."
            />
          </div>
        )}
      </AsyncPanel>
    </PageScaffold>
  );
}
