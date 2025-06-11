
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Wrench, Truck, Clock } from 'lucide-react';

interface QuickAccessCardProps {
  userRole: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const isTechnician = userRole === 'technician';

  const navigateToTechnicianOrders = () => {
    navigate('/technician');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso Rápido</CardTitle>
        <CardDescription>
          Ações comuns para seu papel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTechnician ? (
          <>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={navigateToTechnicianOrders}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Minhas Ordens de Serviço
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/technician/tracking')}  
            >
              <Truck className="mr-2 h-4 w-4" />
              Rastreamento
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" className="w-full justify-start">
              <Wrench className="mr-2 h-4 w-4" />
              Solicitar Novo Serviço
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" />
              Agendar Visita
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickAccessCard;
