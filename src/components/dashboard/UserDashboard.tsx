
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceOrder } from '@/types';
import UserServiceOrders from './UserServiceOrders';
import { useAuth } from '@/contexts/AuthContext';
import TechnicianDashboard from './TechnicianDashboard';
import WorkshopDashboard from './WorkshopDashboard';
import { technicianService } from '@/services';
import DashboardServiceTracker from '@/components/ServiceOrders/DashboardTracker';


interface UserDashboardProps {
  serviceOrders: ServiceOrder[];
  userRole: string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  updateServiceOrder?: (id: string, updates: Partial<ServiceOrder>) => Promise<boolean>;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  serviceOrders,
  userRole,
  formatDate,
  getStatusColor,
  getStatusLabel,
  updateServiceOrder
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTechnician = userRole === 'technician';
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Redirecionar clientes para o portal correto
  useEffect(() => {
    if (user?.role === 'client') {
      navigate('/client/portal', { replace: true });
      return;
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    if (isTechnician && user?.id) {
      const fetchTechnicianRecord = async () => {
        try {
          const technicianRecord = await technicianService.getByUserId(user.id);
          if (technicianRecord) setTechnicianId(technicianRecord.id);
        } catch (error) {
          console.error('Error fetching technician:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchTechnicianRecord();
    } else {
      setIsLoading(false);
    }
  }, [isTechnician, user?.id]);

  const filteredServiceOrders = isTechnician && technicianId
    ? serviceOrders.filter(order => order.technicianId === technicianId)
    : serviceOrders;

  useEffect(() => {
    if (filteredServiceOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(filteredServiceOrders[0].id);
    }
  }, [filteredServiceOrders, selectedOrderId]);

  const selectedOrder = filteredServiceOrders.find(order => order.id === selectedOrderId);
  const displayedOrders = showAllOrders ? filteredServiceOrders : filteredServiceOrders.slice(0, 5);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!updateServiceOrder) return false;
    try {
      const success = await updateServiceOrder(orderId, { status: newStatus as any });
      return success;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40">Carregando...</div>;
  }

  if (userRole === 'workshop') {
    return <WorkshopDashboard />;
  }

  if (isTechnician) {
    // Find the index of the selected order to determine its order number
    const selectedOrderIndex = filteredServiceOrders.findIndex(order => order.id === selectedOrderId);
    // Order number is index + 1 (to start from 1 instead of 0)
    const orderNumber = selectedOrderIndex !== -1 ? selectedOrderIndex + 1 : 0;

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
        <TechnicianDashboard
          technicianOrders={filteredServiceOrders}
          onSelectOrder={setSelectedOrderId}
          selectedOrderId={selectedOrderId}
        />
        {selectedOrder && updateServiceOrder && (
          <DashboardServiceTracker
            serviceOrder={selectedOrder}
            orderNumber={orderNumber}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

      </div>
    );
  }

  // Se chegou até aqui e não é técnico nem workshop, não deveria estar aqui
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Acesso Restrito
        </h2>
        <p className="text-gray-600">
          Esta área é restrita a administradores e técnicos.
        </p>
      </div>
    </div>
  );
};

export default UserDashboard;
