import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { equipmentReceiptService } from '@/services/workshop/equipmentReceiptService';
import { EquipmentReceiptDialog } from './EquipmentReceiptDialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PendingEquipment {
  id: string;
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  service_attendance_type: string;
  created_at: string;
  scheduled_date?: string;
}

interface PendingEquipmentsListProps {
  onEquipmentReceived?: () => void;
}

export function PendingEquipmentsList({ onEquipmentReceived }: PendingEquipmentsListProps) {
  const { user } = useAuth();
  const [pendingEquipments, setPendingEquipments] = useState<PendingEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<PendingEquipment | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  const loadPendingEquipments = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const equipments = await equipmentReceiptService.getPendingEquipments(user.id);
      setPendingEquipments(equipments);
      
      if (equipments.length === 0) {
        console.log('Nenhum equipamento pendente de recebimento');
      }
    } catch (error) {
      console.error('Erro ao carregar equipamentos pendentes:', error);
      toast.error('Erro ao carregar equipamentos pendentes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingEquipments();
  }, [user?.id]);

  const handleConfirmReceipt = (equipment: PendingEquipment) => {
    setSelectedEquipment(equipment);
    setShowReceiptDialog(true);
  };

  const handleReceiptSuccess = async () => {
    console.log('🎉 [PendingEquipmentsList] Equipamento recebido com sucesso, atualizando dados');

    // Recarregar lista local
    await loadPendingEquipments();

    // Notificar componente pai para atualizar dados globais
    if (onEquipmentReceived) {
      await onEquipmentReceived();
    }

    toast.success('Equipamento recebido com sucesso!');
  };

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'coleta_diagnostico':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Diagnóstico</Badge>;
      case 'coleta_conserto':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Conserto</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Equipamentos Pendentes de Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando equipamentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Equipamentos Pendentes de Recebimento
              {pendingEquipments.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingEquipments.length}
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPendingEquipments}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingEquipments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum equipamento pendente
              </h3>
              <p className="text-gray-600">
                Todos os equipamentos foram recebidos ou não há equipamentos enviados para esta oficina.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEquipments.map((equipment) => (
                <div 
                  key={equipment.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {equipment.client_name}
                        </h4>
                        {getServiceTypeBadge(equipment.service_attendance_type)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Equipamento:</span>
                          <p>{equipment.equipment_type}</p>
                        </div>
                        
                        {equipment.equipment_model && (
                          <div>
                            <span className="font-medium">Modelo:</span>
                            <p>{equipment.equipment_model}</p>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium">Enviado em:</span>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(equipment.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleConfirmReceipt(equipment)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Recebimento
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EquipmentReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        equipment={selectedEquipment}
        onSuccess={handleReceiptSuccess}
      />
    </>
  );
}
