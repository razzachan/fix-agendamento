import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientOrderService } from '@/services/client/clientOrderService';
import { supabase } from '@/integrations/supabase/client';

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
  initialCost?: number; // ✅ Valor inicial (sinal para coleta diagnóstico)
  serviceAttendanceType?: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'; // ✅ Tipo de atendimento
  estimatedCompletion?: string;
  technician?: {
    name: string;
    phone: string;
  };
  photos?: string[];
  images?: {
    id: string;
    url: string;
    name: string;
  }[];
  timeline?: {
    status: string;
    date: string;
    description: string;
    createdBy?: string;
  }[];
  diagnosis?: {
    description?: string;
    estimatedCost?: number;
    recommendedService?: string;
  };
}

export function useClientOrders() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOrders = async () => {
    if (!user?.email) return;

    setIsLoading(true);
    setError(null);

    try {
      // Buscar client_id usando o email do usuário
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single();

      if (clientError || !client) {
        console.log('Cliente não encontrado na tabela clients para email:', user.email);
        setOrders([]);
        return;
      }

      const clientOrders = await clientOrderService.getClientOrders(client.id);
      console.log('🔍 [useClientOrders] Ordens processadas:', clientOrders.length);
      if (clientOrders.length > 0) {
        console.log('🔍 [useClientOrders] Primeira ordem processada:', {
          id: clientOrders[0].id,
          status: clientOrders[0].status,
          statusLabel: clientOrders[0].statusLabel,
          orderNumber: clientOrders[0].orderNumber
        });
      }
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
      'awaiting_quote_approval',
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
  }, [user?.email]);

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
