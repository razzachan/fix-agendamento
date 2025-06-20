
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import Header from './Header';
import { PWAInstallPrompt, PWAStatus } from '@/components/pwa/PWAInstallPrompt';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
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

  console.log('🔔 [AppLayout] Renderizando AppLayout');

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        {console.log('🔔 [AppLayout] Renderizando Header')}
        <Header />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>

      {/* Componentes PWA */}
      <PWAInstallPrompt />
      <PWAStatus />
    </SidebarProvider>
  );
};

export default AppLayout;
