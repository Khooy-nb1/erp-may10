import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import viVN from '@astryxdesign/core/locales/vi-VN.json';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { AuthProvider } from './context/AuthContext.js';
import { AppRoutes } from './routes/AppRoutes.js';
import { RouterLink } from './components/common/RouterLink.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <Theme theme={neutralTheme} mode="system">
      <InternationalizationProvider locale="vi-VN" messages={{ 'vi-VN': viVN }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <LinkProvider component={RouterLink}>
                <AppRoutes />
              </LinkProvider>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </InternationalizationProvider>
    </Theme>
  );
};

export default App;
