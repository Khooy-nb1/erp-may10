import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Heading, Text } from '../../components/ui/Typography.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { Banner } from '../../components/ui/Banner.js';
import { useAuth, UserProfile } from '../../context/AuthContext.js';
import { apiFetch, ApiError } from '../../services/api.js';

const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginResponse {
  token: string;
  user: UserProfile;
}

/** Reads the `from` route that ProtectedRoute stores in navigation state. */
function resolveRedirectTarget(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const from = state.from;
    if (from && typeof from === 'object' && 'pathname' in from && typeof from.pathname === 'string') {
      return from.pathname;
    }
  }
  return '/dashboard';
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string>('AUTH_ERROR');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      login(result.token, result.user);

      // Redirect to intended route or default to /dashboard
      navigate(resolveRedirectTarget(location.state), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else {
        setErrorCode('UNKNOWN_ERROR');
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-center gap-6 bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-control bg-primary-foreground/15">
            <ClipboardList size={22} aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-semibold">ERP Sales &amp; CRM</span>
            <span className="text-sm text-primary-foreground/80">Phân hệ Quản lý Bán hàng</span>
          </span>
        </div>
      </aside>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] rounded-card border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 text-center">
              <Heading level={1}>Đăng nhập Hệ thống</Heading>
              <Text variant="supporting" as="p">
                Phân hệ Quản lý Bán hàng &amp; Khách hàng
              </Text>
            </div>

            {errorMessage && (
              <Banner
                status="error"
                title="Đã xảy ra lỗi"
                description={`[${errorCode}] ${errorMessage}`}
                endContent={
                  <Button variant="secondary" size="sm" onClick={() => setErrorMessage(null)}>
                    Thử lại
                  </Button>
                }
              />
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex w-full flex-col gap-4">
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Địa chỉ Email"
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      type="email"
                      autoComplete="email"
                      status={
                        errors.email ? { type: 'error', message: errors.email.message } : undefined
                      }
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Mật khẩu"
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      type="password"
                      autoComplete="current-password"
                      status={
                        errors.password
                          ? { type: 'error', message: errors.password.message }
                          : undefined
                      }
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
