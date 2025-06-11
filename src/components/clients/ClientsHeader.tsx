
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClientsHeader: React.FC = () => {
  const navigate = useNavigate();

  const handleNewClient = () => {
    navigate('/new-client');
  };

  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
      <Button onClick={handleNewClient}>
        <Plus className="h-4 w-4 mr-2" /> Novo Cliente
      </Button>
    </div>
  );
};

export default ClientsHeader;
