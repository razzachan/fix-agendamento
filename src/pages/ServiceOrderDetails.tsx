
import React, { useEffect, useState } from 'react';
import { OrderDetails } from '@/components/ServiceOrders';
import { useAppData } from '@/hooks/useAppData';
import { useParams } from 'react-router-dom';

const ServiceOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { refreshServiceOrders, serviceOrders } = useAppData();
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Função para forçar a atualização dos dados
  const forceRefresh = async () => {
    console.log(`ServiceOrderDetails: Forçando atualização para ID=${id}`);
    await refreshServiceOrders();
    setRefreshKey(prev => prev + 1);
  };

  // Atualizar dados ao entrar na página - apenas uma vez por ID
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      console.log(`ServiceOrderDetails: Iniciando carregamento para ID=${id}`);

      // Se não temos dados ou não carregamos ainda, carregar
      if (serviceOrders.length === 0) {
        console.log(`ServiceOrderDetails: Carregando dados do Supabase...`);
        await refreshServiceOrders();
        if (isMounted) {
          setIsDataLoaded(true);
          setRefreshKey(prev => prev + 1);
          console.log(`ServiceOrderDetails: Dados carregados, total de ordens: ${serviceOrders.length}`);
        }
      } else {
        // Se já temos dados, apenas marcar como carregado e atualizar
        console.log(`ServiceOrderDetails: Usando dados existentes (${serviceOrders.length} ordens)`);
        if (isMounted) {
          setIsDataLoaded(true);
          setRefreshKey(prev => prev + 1);
        }
      }
    }

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  // Apenas ID como dependência - quando mudar de ordem, recarregar
  }, [id]);

  // Intervalo separado para atualizações periódicas
  useEffect(() => {
    const intervalId = setInterval(() => {
      forceRefresh();
    }, 30000); // 30 segundos (reduzido a frequência)

    return () => {
      clearInterval(intervalId);
    };
  }, []); // Sem dependências para evitar recriação

  return <OrderDetails orderId={id} refreshKey={refreshKey} onRefreshRequest={forceRefresh} />;
};

export default ServiceOrderDetails;
