
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Stethoscope, Building2 } from 'lucide-react';
import { DiagnosisDialog } from '@/components/workshop/DiagnosisDialog';
import { DiagnosisDisplay } from '@/components/workshop/DiagnosisDisplay';
import { ApprovedQuoteActions } from '@/components/workshop/ApprovedQuoteActions';
import { RejectedQuoteActions } from '@/components/workshop/RejectedQuoteActions';
import { RepairProgressTimeline } from '@/components/repair/RepairProgressTimeline';
import { WorkshopSelector } from '@/components/workshop/WorkshopSelector';

interface WorkshopEquipmentItemProps {
  order: ServiceOrder;
  refreshKey: number;
  onDiagnosisSuccess: () => Promise<void>;
}

const WorkshopEquipmentItem: React.FC<WorkshopEquipmentItemProps> = ({
  order,
  refreshKey,
  onDiagnosisSuccess
}) => {
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
  const [showWorkshopSelector, setShowWorkshopSelector] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const handleDiagnosisSuccess = async () => {
    console.log("Diagnóstico salvo com sucesso, atualizando dados...");
    
    // Force immediate local component refresh
    setLocalRefreshKey(prev => prev + 1);
    
    // Close dialog
    setShowDiagnosisDialog(false);
    
    // Wait a moment and then update global data 
    // This ensures both the local component refreshes immediately
    // and the global data is updated after the database has time to update
    setTimeout(async () => {
      try {
        console.log("Chamando onDiagnosisSuccess para atualizar dados globais");
        await onDiagnosisSuccess();
        console.log("Dados globais atualizados com sucesso após salvar diagnóstico");
      } catch (error) {
        console.error("Erro ao atualizar dados globais após salvar diagnóstico:", error);
      }
    }, 1500);
  };

  return (
    <Card key={order.id} className="p-4">
      <CardContent className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{order.clientName}</h3>
            <p className="text-sm text-muted-foreground">{order.equipmentType}</p>
            {order.equipmentModel && (
              <p className="text-sm text-muted-foreground">Modelo: {order.equipmentModel}</p>
            )}
            {/* Informação da Oficina */}
            <div className="flex items-center gap-2 mt-2">
              {order.workshopName ? (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  🏭 Oficina: {order.workshopName}
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  ⚠️ Oficina não definida
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWorkshopSelector(true)}
                className="h-6 px-2 text-xs"
              >
                <Building2 className="h-3 w-3 mr-1" />
                {order.workshopName ? 'Alterar' : 'Definir'}
              </Button>
            </div>
          </div>
          
          {order.serviceAttendanceType === 'coleta_diagnostico' && (
            <Button 
              onClick={() => setShowDiagnosisDialog(true)} 
              size="sm" 
              className="flex items-center gap-1"
            >
              <Stethoscope className="h-4 w-4" />
              Adicionar Diagnóstico
            </Button>
          )}
        </div>
        
        <DiagnosisDisplay
          serviceOrderId={order.id}
          refreshKey={refreshKey + localRefreshKey}
        />

        <ApprovedQuoteActions
          order={{
            id: order.id,
            client_name: order.clientName,
            equipment_type: order.equipmentType,
            equipment_model: order.equipmentModel,
            status: order.status,
            service_attendance_type: order.serviceAttendanceType
          }}
          onStatusUpdate={onDiagnosisSuccess}
        />

        <RejectedQuoteActions
          order={{
            id: order.id,
            client_name: order.clientName,
            equipment_type: order.equipmentType,
            equipment_model: order.equipmentModel,
            status: order.status,
            service_attendance_type: order.serviceAttendanceType
          }}
          onStatusUpdate={onDiagnosisSuccess}
        />

        {/* Timeline de progresso do reparo */}
        {['in_progress', 'ready_for_delivery'].includes(order.status) && (
          <RepairProgressTimeline
            serviceOrderId={order.id}
            refreshKey={refreshKey + localRefreshKey}
            showTitle={true}
            compact={false}
            hideFinancialInfo={true}
          />
        )}
      </CardContent>
      
      <DiagnosisDialog
        open={showDiagnosisDialog}
        onOpenChange={setShowDiagnosisDialog}
        serviceOrderId={order.id}
        onSuccess={handleDiagnosisSuccess}
      />

      <WorkshopSelector
        open={showWorkshopSelector}
        onOpenChange={setShowWorkshopSelector}
        serviceOrderId={order.id}
        currentWorkshopId={order.workshopId}
        currentWorkshopName={order.workshopName}
        onSuccess={onDiagnosisSuccess}
      />
    </Card>
  );
};

export default WorkshopEquipmentItem;
