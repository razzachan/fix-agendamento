
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { PhotoCaptureDialog } from '../OrdersTable/PhotoCaptureDialog';
import WorkshopVerificationDialog from './WorkshopVerificationDialog';
import OrderHeader from './OrderHeader';
import OrderProgress from './OrderProgress';
import { useServiceOrderStatus } from '@/hooks/useServiceOrderStatus';

interface DashboardServiceTrackerProps {
  serviceOrder: ServiceOrder;
  orderNumber: number;
  onUpdateStatus: (serviceOrderId: string, status: string) => Promise<boolean>;
}

const DashboardServiceTracker: React.FC<DashboardServiceTrackerProps> = ({
  serviceOrder,
  orderNumber,
  onUpdateStatus,
}) => {
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showWorkshopDialog, setShowWorkshopDialog] = useState(false);

  const {
    isUpdating,
    pendingStatus,
    progressPercentage,
    getNextStatus,
    handleUpdateStatus,
    handleStatusConfirmation
  } = useServiceOrderStatus({ serviceOrder, onUpdateStatus });

  useEffect(() => {
    console.log(`DashboardServiceTracker: Order ID=${serviceOrder.id}, Cliente=${serviceOrder.clientName}`);
    console.log(`Tipo de Atendimento: ${serviceOrder.serviceAttendanceType || 'em_domicilio'}, Status atual: ${serviceOrder.status}`);
  }, [serviceOrder]);

  const handleProgressUpdate = async () => {
    const needsVerification = await handleUpdateStatus();
    if (needsVerification) {
      if (getNextStatus() === 'at_workshop') {
        setShowWorkshopDialog(true);
      } else if (getNextStatus() === 'collected') {
        setShowPhotoDialog(true);
      }
    }
  };

  return (
    <>
      <Card className="mt-4">
        <CardContent className="p-4 space-y-6">
          <OrderHeader serviceOrder={serviceOrder} orderNumber={orderNumber} />
          <OrderProgress serviceOrder={serviceOrder} progressPercentage={progressPercentage} />

          {getNextStatus() && (
            <div className="flex justify-center">
              <Button 
                onClick={handleProgressUpdate} 
                disabled={isUpdating} 
                className="mt-2 w-full"
              >
                {isUpdating ? 'Atualizando...' : `Avançar para próximo status`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PhotoCaptureDialog
        open={showPhotoDialog}
        onOpenChange={setShowPhotoDialog}
        orderId={serviceOrder.id}
        onSuccess={handleStatusConfirmation}
      />

      <WorkshopVerificationDialog
        open={showWorkshopDialog}
        onOpenChange={setShowWorkshopDialog}
        onVerify={handleStatusConfirmation}
      />
    </>
  );
};

export default DashboardServiceTracker;
