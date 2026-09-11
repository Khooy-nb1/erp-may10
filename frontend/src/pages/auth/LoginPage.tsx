import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Center } from '@astryxdesign/core/Center';
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
    <Center height="100vh" padding={4}>
      <Card width="100%" maxWidth={440} elevation="med">
        <VStack gap={5}>
          <VStack gap={1} align="center">
            <Heading level={1}>Đăng nhập Hệ thống</Heading>
            <Text type="supporting" as="p" justify="center">
              Phân hệ Quản lý Bán hàng &amp; Khách hàng
            </Text>
          </VStack>

          {errorMessage && (
            <Banner
              status="error"
              title="Đã xảy ra lỗi"
              description={`[${errorCode}] ${errorMessage}`}
              collapsible={false}
              endContent={
                <Button
                  label="Thử lại"
                  variant="secondary"
                  size="sm"
                  onClick={() => setErrorMessage(null)}
                />
              }
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <VStack gap={4} width="100%">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Địa chỉ Email"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    type="email"
                    autoComplete="email"
                    isRequired
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
                  <TextInput
                    label="Mật khẩu"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    type="password"
                    autoComplete="current-password"
                    isRequired
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
                label={isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
                variant="primary"
                width="100%"
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
              />
            </VStack>
          </form>
        </VStack>
      </Card>
    </Center>
  );
};
