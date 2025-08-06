import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useTechnicianOrdersTest = () => {
  console.log('🚀 [useTechnicianOrdersTest] HOOK DE TESTE EXECUTADO!');
  
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🚀 [useTechnicianOrdersTest] useEffect executado! user:', user);
  }, [user]);

  return {
    orders,
    isLoading,
    selectedOrderId: null,
    setSelectedOrderId: () => {},
    updateOrderStatus: () => {},
    scheduledServices: []
  };
};
