
import React from 'react';
import { Package } from 'lucide-react';

const EmptyOrdersState: React.FC = () => {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p>Nenhuma ordem de serviço encontrada.</p>
      <p className="text-sm mt-2">As ordens de serviço aparecerão aqui quando forem criadas.</p>
    </div>
  );
};

export default EmptyOrdersState;
