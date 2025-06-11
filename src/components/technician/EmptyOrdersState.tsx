
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const EmptyOrdersState: React.FC = () => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-xl font-semibold">Você não tem ordens de serviço atribuídas</p>
          <p className="text-muted-foreground mt-2">
            Quando você receber uma atribuição, ela aparecerá aqui.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyOrdersState;
