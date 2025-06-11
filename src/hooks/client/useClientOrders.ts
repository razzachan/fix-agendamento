import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientOrderService } from '@/services/client/clientOrderService';

export interface ClientOrder {
  id: string;
  orderNumber: string;
  equipmentType: string;
  equipmentModel: string;
  equipmentBrand: string;
  equipmentSerial: string;
  status: string;
  statusLabel: string;
  currentLocation: string;
  locationLabel: string;
  createdAt: string;
  scheduledDate: string;
  description: string;
  finalCost?: number;
  estimatedCompletion?: string;
  technician?: {
    name: string;
    phone: string;
  };
  photos?: string[];
  timeline?: {
    status: string;
    date: string;
    description: string;
    createdBy?: string;
  }[];
}

export function useClientOrders() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOrders = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const clientOrders = await clientOrderService.getClientOrders(user.id);
      setOrders(clientOrders);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar suas ordens de serviço.');
    } finally {
      setIsLoading(false);
    }
  };

  const getOrderById = async (orderId: string): Promise<ClientOrder | null> => {
    try {
      return await clientOrderService.getOrderById(orderId);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes da ordem.');
      return null;
    }
  };

  const getOrdersByStatus = (status: string): ClientOrder[] => {
    return orders.filter(order => order.status === status);
  };

  const getActiveOrders = (): ClientOrder[] => {
    const activeStatuses = [
      'scheduled',
      'in_progress',
      'at_workshop',
      'diagnosis_completed',
      'quote_sent',
      'quote_approved',
      'ready_for_delivery'
    ];
    return orders.filter(order => activeStatuses.includes(order.status));
  };

  const getCompletedOrders = (): ClientOrder[] => {
    return orders.filter(order => order.status === 'completed');
  };

  const getPendingApprovalOrders = (): ClientOrder[] => {
    return orders.filter(order => 
      order.status === 'quote_sent' || order.status === 'awaiting_approval'
    );
  };

  const refreshOrders = () => {
    fetchOrders();
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        fetchOrders();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [isLoading]);

  return {
    orders,
    isLoading,
    error,
    getOrderById,
    getOrdersByStatus,
    getActiveOrders,
    getCompletedOrders,
    getPendingApprovalOrders,
    refreshOrders
  };
}
