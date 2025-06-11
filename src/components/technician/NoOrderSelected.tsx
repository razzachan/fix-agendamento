
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const NoOrderSelected: React.FC = () => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Selecione uma ordem de serviço para visualizar o progresso.
        </p>
      </CardContent>
    </Card>
  );
};

export default NoOrderSelected;
