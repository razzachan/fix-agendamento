
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import Header from './Header';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Se ainda estiver carregando, mostra um indicador de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Somente redireciona quando o carregamento estiver completo e o usuário não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirecionar clientes para o portal correto
  if (user?.role === 'client') {
    return <Navigate to="/client/portal" replace />;
  }

  console.log('🔔 [AppLayout] Renderizando AppLayout');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppSidebar />
      <div
        className="flex-1 flex flex-col transition-all duration-300 main-content md:ml-[var(--sidebar-width,80px)] ml-0"
      >
        {console.log('🔔 [AppLayout] Renderizando Header')}
        <Header />
        <main className="flex-1 overflow-y-auto pt-16 md:pt-4 bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-full sm:container sm:mx-auto mobile-safe-area px-1 sm:px-0">
            {children}
          </div>
        </main>
        {/* Componentes PWA */}
        <PWAInstallPrompt />
      </div>
    </div>
  );
};

export default AppLayout;
