
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/hooks/useAppData';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceOrder } from '@/types';
import { ServiceOrderProgress } from '@/types/serviceOrderProgress';

import OrderHeader from './OrderHeader';
import OrderEquipmentInfo from './OrderEquipmentInfo';
import OrderClientInfo from './OrderClientInfo';
import OrderServiceInfo from './OrderServiceInfo';
import OrderDescription from './OrderDescription';
import OrderActions from './OrderActions';
import OrderImages from './OrderImages';
import NotFound from './NotFound';
import DiagnosisDetails from '@/components/workshop/DiagnosisDetails';
import { StatusChangePhotoPrompt } from '../CapturePhoto';
import { ServiceOrderProgressHistory } from '@/components/ServiceOrders/ProgressHistory/ServiceOrderProgressHistory';
import WarrantyInfo from '../WarrantyInfo';
import CreateWarrantyOrderDialog from '../CreateWarrantyOrderDialog';
import QRCodeDisplay from '@/components/qrcode/QRCodeDisplay';
import { serviceOrderService } from '@/services';

interface OrderDetailsProps {
  orderId?: string;
  refreshKey?: number;
  onRefreshRequest?: () => Promise<void>;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ orderId, refreshKey = 0, onRefreshRequest }) => {
  const { serviceOrders, deleteServiceOrder, refreshServiceOrders, isLoading } = useAppData();
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<ServiceOrder | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | undefined>();
  const [progressHistory, setProgressHistory] = useState<ServiceOrderProgress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isWarrantyDialogOpen, setIsWarrantyDialogOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!isLoading && serviceOrders.length > 0) {
        const order = serviceOrders.find(o => o.id === orderId);
        setCurrentOrder(order || null);
        setIsLocalLoading(false);
        return;
      }

      // Só recarregar se realmente não temos dados
      if (serviceOrders.length === 0 && !isLoading) {
        setIsLocalLoading(true);
        await refreshServiceOrders();
        const order = serviceOrders.find(o => o.id === orderId);
        setCurrentOrder(order || null);
        setIsLocalLoading(false);
      }
    }

    loadData();
  }, [orderId, refreshKey]); // Removido refreshServiceOrders das dependências

  // Atualizar a ordem atual quando serviceOrders mudar
  useEffect(() => {
    if (!isLocalLoading && !isLoading && orderId) {
      const order = serviceOrders.find(o => o.id === orderId);
      setCurrentOrder(order || null);
    }
  }, [serviceOrders, orderId, isLoading, isLocalLoading]);

  // Carregar o histórico de progresso quando a ordem for carregada
  useEffect(() => {
    async function loadProgressHistory() {
      if (currentOrder && orderId) {
        setIsLoadingProgress(true);
        try {
          const progress = await serviceOrderService.getProgress(orderId);
          setProgressHistory(progress);
        } catch (error) {
          console.error('Erro ao carregar histórico de progresso:', error);
        } finally {
          setIsLoadingProgress(false);
        }
      }
    }

    loadProgressHistory();
  }, [currentOrder, orderId]);

  const handleOrderUpdated = async (updatedOrder: ServiceOrder) => {
    // Salvar o status anterior antes de atualizar
    if (currentOrder && currentOrder.status !== updatedOrder.status) {
      setPreviousStatus(currentOrder.status);
    }

    // Atualizar a ordem atual no estado local
    setCurrentOrder(updatedOrder);

    // Apenas uma chamada de refresh - escolher entre refreshServiceOrders OU onRefreshRequest
    if (onRefreshRequest) {
      // Se há uma função externa, usar ela (evita duplicação)
      await onRefreshRequest();
    } else {
      // Caso contrário, usar o refresh padrão
      await refreshServiceOrders();
    }

    // Recarregar o histórico de progresso apenas se o status mudou
    if (updatedOrder.id && currentOrder && currentOrder.status !== updatedOrder.status) {
      setIsLoadingProgress(true);
      try {
        const progress = await serviceOrderService.getProgress(updatedOrder.id);
        setProgressHistory(progress);
      } catch (error) {
        console.error('Erro ao recarregar histórico de progresso:', error);
      } finally {
        setIsLoadingProgress(false);
      }
    }
  };

  if (isLoading || isLocalLoading) {
    console.log(`OrderDetails: Mostrando loading - isLoading: ${isLoading}, isLocalLoading: ${isLocalLoading}, orderId: ${orderId}, serviceOrders.length: ${serviceOrders.length}`);
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>

        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>

            <Separator />

            <Skeleton className="h-32 w-full" />
          </CardContent>

          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const orderIndex = serviceOrders.findIndex(o => o.id === orderId);

  if (!currentOrder) {
    console.log(`OrderDetails: Ordem não encontrada - orderId: ${orderId}, serviceOrders.length: ${serviceOrders.length}, isLoading: ${isLoading}, isLocalLoading: ${isLocalLoading}`);
    return <NotFound />;
  }

  // Verificar se a ordem é do tipo coleta para diagnóstico
  const isCollectDiagnosis = currentOrder.serviceAttendanceType === 'coleta_diagnostico';

  return (
    <div className="animate-fade-in space-y-6">
      <OrderHeader order={currentOrder} onOrderUpdated={handleOrderUpdated} />

      {/* Prompt para tirar foto quando o status mudar para coletado */}
      <StatusChangePhotoPrompt
        serviceOrder={currentOrder}
        previousStatus={previousStatus}
      />

      <Card className="glass-card">
        <CardHeader>
          <OrderEquipmentInfo order={currentOrder} orderIndex={orderIndex} />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <OrderClientInfo order={currentOrder} onOrderUpdated={handleOrderUpdated} />
            <OrderServiceInfo order={currentOrder} />
          </div>

          <Separator />

          <OrderDescription description={currentOrder.description} />

          {/* Adicionar o componente de diagnóstico se for coleta para diagnóstico */}
          {isCollectDiagnosis && (
            <>
              <Separator />
              <div className="pt-2">
                <h3 className="text-lg font-medium mb-3">Diagnóstico Técnico</h3>
                <DiagnosisDetails
                  serviceOrderId={currentOrder.id}
                  refreshKey={refreshKey}
                />
              </div>
            </>
          )}

          {/* QR Code de Rastreamento */}
          <Separator />
          <div className="pt-2">
            <QRCodeDisplay serviceOrder={currentOrder} />
          </div>

          {/* Histórico de progresso da ordem de serviço */}
          <Separator />
          <div className="pt-2">
            <ServiceOrderProgressHistory
              serviceOrderId={currentOrder.id}
              currentStatus={currentOrder.status}
              onStatusChange={(newStatus) => {
                if (newStatus !== currentOrder.status) {
                  handleOrderUpdated({
                    ...currentOrder,
                    status: newStatus
                  });
                }
              }}
            />
          </div>

          {/* Informações de garantia */}
          <Separator />
          <div className="pt-2">
            <WarrantyInfo
              serviceOrder={currentOrder}
              onCreateWarrantyOrder={(originalOrderId) => {
                setIsWarrantyDialogOpen(true);
              }}
              onWarrantyUpdated={handleOrderUpdated}
              canEdit={true}
            />
          </div>
        </CardContent>

        <CardFooter>
          <OrderActions order={currentOrder} onDelete={deleteServiceOrder} />
        </CardFooter>
      </Card>

      <OrderImages serviceOrder={currentOrder} />

      {/* Diálogo para criar ordem em garantia */}
      {isWarrantyDialogOpen && currentOrder && (
        <CreateWarrantyOrderDialog
          isOpen={isWarrantyDialogOpen}
          onClose={() => setIsWarrantyDialogOpen(false)}
          originalOrderId={currentOrder.id}
        />
      )}
    </div>
  );
};

export default OrderDetails;
