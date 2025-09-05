import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import { useDashboardUtils } from '@/hooks/useDashboardUtils';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import UserDashboard from '@/components/dashboard/UserDashboard';
import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';
import WorkshopAdvancedDashboard from '@/components/workshop/WorkshopAdvancedDashboard';

const Dashboard: React.FC = () => {
  // Determinar tipo de usuário primeiro
  const { user } = useAuth();
  const { serviceOrders, financialTransactions, clients, technicians, isLoading, updateServiceOrder } = useAppData();
  const { formatCurrency, formatDate, getStatusColor, getStatusLabel } = useDashboardUtils();

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const isWorkshop = user?.role === 'workshop';
  const userRole = user?.role || '';

  // Hook específico para técnicos - SÓ EXECUTAR SE FOR TÉCNICO
  let technicianData = { orders: [], isLoading: false, selectedOrderId: null, setSelectedOrderId: () => {}, handleUpdateOrderStatus: () => {}, scheduledServices: [] } as any;

  if (isTechnician === true && userRole === 'technician') {
    try {
      const { useTechnicianOrders } = require('@/hooks/useTechnicianOrders');
      technicianData = useTechnicianOrders();
    } catch (error) {
      console.error('Erro ao carregar hooks de técnico:', error);
    }
  }

  if (isLoading || (isTechnician && technicianData.isLoading)) {
    return <LoadingState />;
  }

  // Estatísticas
  const pendingOrders = serviceOrders.filter(o =>
    o.status === 'pending' || o.status === 'scheduled' || o.status === 'scheduled_collection'
  ).length;

  const inProgressOrders = serviceOrders.filter(order =>
    order.status === 'in_progress' ||
    order.status === 'collected' ||
    order.status === 'collected_for_diagnosis' ||
    order.status === 'at_workshop' ||
    order.status === 'received_at_workshop' ||
    order.status === 'diagnosis_completed' ||
    order.status === 'awaiting_quote_approval' ||
    order.status === 'quote_approved' ||
    order.status === 'ready_for_delivery' ||
    order.status === 'delivery_scheduled' ||
    order.status === 'collected_for_delivery' ||
    order.status === 'on_the_way_to_deliver' ||
    order.status === 'payment_pending'
  ).length;

  const completedOrders = serviceOrders.filter(order =>
    order.status === 'completed'
  ).length;

  const technicianCount = technicians.length;
  const clientCount = clients.length;
  const scheduledServicesCount = serviceOrders.filter(o =>
    o.status === 'scheduled' || o.status === 'scheduled_collection'
  ).length;

  // Receita (corrigido)
  const calculateRevenueFromOrders = () => {
    let totalReceived = 0;
    let totalPending = 0;

    serviceOrders.forEach(order => {
      const initialCost = Number(order.initialCost) || 0;
      const finalCost = Number(order.finalCost) || 0;
      const paymentStatus = order.paymentStatus as any;

      if (paymentStatus === 'completed') {
        totalReceived += finalCost;
      } else if (paymentStatus === 'partial' || paymentStatus === 'advance_paid') {
        totalReceived += initialCost;
        if (finalCost > initialCost) totalPending += (finalCost - initialCost);
      } else if (initialCost > 0) {
        totalReceived += initialCost;
        if (finalCost > initialCost) totalPending += (finalCost - initialCost);
      } else if (finalCost > 0) {
        totalPending += finalCost;
      }
    });

    return { totalReceived, totalPending };
  };

  const { totalReceived, totalPending } = calculateRevenueFromOrders();
  const totalRevenue = totalReceived;
  const pendingRevenue = totalPending;

  // Atualização de status (fallback)
  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string): Promise<void> => {
    if (isTechnician && technicianData.handleUpdateOrderStatus) {
      const success = await technicianData.handleUpdateOrderStatus(orderId, newStatus);
      if (!success) throw new Error('Falha ao atualizar status');
    } else {
      await updateServiceOrder(orderId, { status: newStatus as any });
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader userRole={userRole} />

      {isAdmin ? (
        <>
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
        </>
      ) : isTechnician ? (
        <TechnicianDashboard
          technicianOrders={technicianData.orders || []}
          technicianId={user?.id || ''}
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

