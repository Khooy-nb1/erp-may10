import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { createCustomer } from '../../services/customerService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { ErrorState } from '../../components/common/ErrorState.js';

const customerFormSchema = z.object({
  ten_khach_hang: z.string().min(1, 'Tên khách hàng không được để trống'),
  loai_khach_hang: z.enum(['to_chuc', 'ca_nhan', 'dai_ly', 'xuat_khau']),
  ma_so_thue: z.string().optional(),
  so_dien_thoai: z.string().min(8, 'Số điện thoại từ 8 ký tự'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  dia_chi: z.string().min(1, 'Địa chỉ không được để trống'),
  tinh_thanh_pho: z.string().min(1, 'Tỉnh/thành phố không được để trống'),
  nguoi_lien_he: z.string().optional(),
  han_muc_cong_no: z.coerce.number().min(0, 'Hạn mức không được âm'),
  so_ngay_cong_no: z.coerce.number().int().min(0, 'Số ngày không được âm'),
  ghi_chu: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      ten_khach_hang: '',
      loai_khach_hang: 'to_chuc',
      ma_so_thue: '',
      so_dien_thoai: '',
      email: '',
      dia_chi: '',
      tinh_thanh_pho: 'Hà Nội',
      nguoi_lien_he: '',
      han_muc_cong_no: 0,
      so_ngay_cong_no: 0,
      ghi_chu: '',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setServerError(null);
    try {
      const created = await createCustomer(data);
      navigate(`/customers/${created.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Không thể tạo khách hàng.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Thêm khách hàng mới"
        subtitle="Khởi tạo hồ sơ khách hàng và thiết lập hạn mức tín dụng"
      >
        <Link
          to="/customers"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Hủy bỏ
        </Link>
      </PageHeader>

      {serverError && <ErrorState message={serverError} onRetry={() => setServerError(null)} />}

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          maxWidth: '800px',
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Tên khách hàng / Đơn vị *
              </label>
              <input
                {...register('ten_khach_hang')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.ten_khach_hang ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
              {errors.ten_khach_hang && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.ten_khach_hang.message}</span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Loại khách hàng *
              </label>
              <select
                {...register('loai_khach_hang')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="to_chuc">Tổ chức / Doanh nghiệp</option>
                <option value="ca_nhan">Cá nhân</option>
                <option value="dai_ly">Đại lý phân phối</option>
                <option value="xuat_khau">Khách xuất khẩu</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Mã số thuế
              </label>
              <input
                {...register('ma_so_thue')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Số điện thoại liên hệ *
              </label>
              <input
                {...register('so_dien_thoai')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.so_dien_thoai ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
              {errors.so_dien_thoai && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.so_dien_thoai.message}</span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Địa chỉ Email
              </label>
              <input
                type="email"
                {...register('email')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.email ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
              {errors.email && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.email.message}</span>
              )}
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Địa chỉ trụ sở / nhận hàng *
              </label>
              <input
                {...register('dia_chi')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.dia_chi ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
              {errors.dia_chi && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.dia_chi.message}</span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Tỉnh / Thành phố *
              </label>
              <input
                {...register('tinh_thanh_pho')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.tinh_thanh_pho ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Người liên hệ đại diện
              </label>
              <input
                {...register('nguoi_lien_he')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Hạn mức công nợ (VNĐ)
              </label>
              <input
                type="number"
                {...register('han_muc_cong_no')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.han_muc_cong_no ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Số ngày được nợ (ngày)
              </label>
              <input
                type="number"
                {...register('so_ngay_cong_no')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${errors.so_ngay_cong_no ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Ghi chú
              </label>
              <textarea
                rows={3}
                {...register('ghi_chu')}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Link
              to="/customers"
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu khách hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
