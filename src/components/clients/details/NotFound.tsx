
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const ClientNotFound: React.FC = () => {
  const navigate = useNavigate();
  
  const goBack = () => navigate("/clients");
  
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={goBack} className="flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <Card>
        <CardContent className="pt-6 text-center">
          Cliente não encontrado
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientNotFound;
