
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import { useDashboardUtils } from '@/hooks/useDashboardUtils';
import { useTechnicianOrders } from '@/hooks/useTechnicianOrders';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import UserDashboard from '@/components/dashboard/UserDashboard';
import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';
import WorkshopDashboard from '@/components/dashboard/WorkshopDashboard';
import WorkshopAdvancedDashboard from '@/components/workshop/WorkshopAdvancedDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { serviceOrders, financialTransactions, clients, technicians, isLoading, updateServiceOrder } = useAppData();
  const { getStatusColor, getStatusLabel, formatDate, formatCurrency } = useDashboardUtils();

  // Hook específico para técnicos
  const technicianData = useTechnicianOrders();

  // Determinar tipo de usuário
  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const isWorkshop = user?.role === 'workshop';
  const userRole = user?.role || '';

  if (isLoading || (isTechnician && technicianData.isLoading)) {
    return <LoadingState />;
  }

  // Calculate statistics based on data
  const pendingOrders = serviceOrders.filter(o => 
    o.status === 'pending' || o.status === 'scheduled' || o.status === 'scheduled_collection'
  ).length;
  
  const inProgressOrders = serviceOrders.filter(order => 
    order.status === 'in_progress' || 
    order.status === 'collected' || 
    order.status === 'collected_for_diagnosis' ||
    order.status === 'at_workshop' ||
    order.status === 'diagnosis_completed'
  ).length;
  
  const completedOrders = serviceOrders.filter(order => 
    order.status === 'completed'
  ).length;
  
  const technicianCount = technicians.length;
  const clientCount = clients.length;
  const scheduledServicesCount = serviceOrders.filter(o => 
    o.status === 'scheduled' || o.status === 'scheduled_collection'
  ).length;

  // Calculate revenue
  const totalRevenue = financialTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate pending revenue
  const pendingRevenue = financialTransactions
    .filter(tx => tx.type === 'income' && tx.paidStatus === 'pending')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Função para atualizar status (para técnicos) - usa a função do hook que já tem sincronização
  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string): Promise<void> => {
    if (isTechnician && technicianData.handleUpdateOrderStatus) {
      try {
        const success = await technicianData.handleUpdateOrderStatus(orderId, newStatus);
        if (!success) {
          throw new Error('Falha ao atualizar status');
        }
        console.log('Status atualizado e sincronizado com sucesso:', { orderId, newStatus, notes });
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }
    } else {
      // Fallback para outros tipos de usuário
      try {
        await updateServiceOrder(orderId, { status: newStatus as any });
        console.log('Status atualizado com sucesso:', { orderId, newStatus, notes });
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader userRole={userRole} />

      {isAdmin ? (
        <AdminDashboard
          serviceOrders={serviceOrders}
          pendingOrders={pendingOrders}
          inProgressOrders={inProgressOrders}
          completedOrders={completedOrders}
          totalRevenue={totalRevenue}
          pendingRevenue={pendingRevenue}
          clientCount={clientCount}
          technicianCount={technicianCount}
          scheduledServicesCount={scheduledServicesCount}
          totalOrdersCount={serviceOrders.length}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      ) : isTechnician ? (
        <TechnicianDashboard
          technicianOrders={technicianData.technicianOrders}
          technicianId={technicianData.technicianId || ''}
          onStatusUpdate={handleStatusUpdate}
        />
      ) : isWorkshop ? (
        <WorkshopAdvancedDashboard />
      ) : (
        <UserDashboard
          serviceOrders={serviceOrders}
          userRole={userRole}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
          updateServiceOrder={updateServiceOrder}
        />
      )}
    </div>
  );
};

export default Dashboard;
