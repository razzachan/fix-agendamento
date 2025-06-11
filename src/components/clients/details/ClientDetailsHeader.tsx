
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientDetailsHeaderProps {
  title: string;
}

const ClientDetailsHeader: React.FC<ClientDetailsHeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  
  const goBack = () => navigate("/clients");
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={goBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
    </div>
  );
};

export default ClientDetailsHeader;
