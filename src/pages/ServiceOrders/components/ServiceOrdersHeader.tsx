
import React, { useState, useEffect } from 'react';
import { NewOrderDialog } from '@/components/ServiceOrders';
import SimpleNewOrderDialog from '@/components/ServiceOrders/SimpleNewOrderDialog';
import { useAppData } from '@/hooks/useAppData';
import { ServiceOrder } from '@/types';

const ServiceOrdersHeader = ({ refreshServiceOrders }: { refreshServiceOrders: () => Promise<void> }) => {
  const { addServiceOrder } = useAppData();
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCreateOrder = async (data: Partial<ServiceOrder>): Promise<ServiceOrder | null> => {
    return await addServiceOrder(data);
  };

  return (
    <div className="mb-4 flex justify-between items-center">
      <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
      {isMobile ? (
        <SimpleNewOrderDialog
          refreshServiceOrders={refreshServiceOrders}
          onCreateOrder={handleCreateOrder}
        />
      ) : (
        <NewOrderDialog
          refreshServiceOrders={refreshServiceOrders}
          onCreateOrder={handleCreateOrder}
        />
      )}
    </div>
  );
};

export default ServiceOrdersHeader;
