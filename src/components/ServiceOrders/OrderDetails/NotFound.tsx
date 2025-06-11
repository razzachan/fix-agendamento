
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h2 className="text-xl font-semibold">Ordem de Serviço não encontrada</h2>
      <p className="text-muted-foreground mb-4">A ordem de serviço que você está procurando não existe ou foi removida.</p>
      <Button onClick={() => navigate('/orders')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Ordens
      </Button>
    </div>
  );
};

export default NotFound;
