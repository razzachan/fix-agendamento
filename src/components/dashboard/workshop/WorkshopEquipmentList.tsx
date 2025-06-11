
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ServiceOrder } from '@/types';
import WorkshopEquipmentItem from './WorkshopEquipmentItem';

interface WorkshopEquipmentListProps {
  orders: ServiceOrder[];
  refreshKey: number;
  onDiagnosisSuccess: () => Promise<void>;
}

const WorkshopEquipmentList: React.FC<WorkshopEquipmentListProps> = ({
  orders,
  refreshKey,
  onDiagnosisSuccess
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipamentos na Oficina</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum equipamento na oficina no momento.
            </div>
          ) : (
            orders.map(order => (
              <WorkshopEquipmentItem 
                key={order.id} 
                order={order}
                refreshKey={refreshKey}
                onDiagnosisSuccess={onDiagnosisSuccess}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkshopEquipmentList;
