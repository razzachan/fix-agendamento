import React from 'react';
import { ClientLayout } from '@/components/client/ClientLayout';
import { WelcomeSection } from '@/components/client/WelcomeSection';
import { QuickActions } from '@/components/client/QuickActions';
import { RecentOrders } from '@/components/client/RecentOrders';
import { useClientOrders } from '@/hooks/client/useClientOrders';
import { useAuth } from '@/contexts/AuthContext';

export function ClientPortal() {
  const { user } = useAuth();
  const { orders, isLoading, error } = useClientOrders();

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando seus dados...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-gray-600">Erro ao carregar dados: {error}</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-8">
        <WelcomeSection user={user} orders={orders} />
        <QuickActions />
        <RecentOrders orders={orders} />
      </div>
    </ClientLayout>
  );
}
