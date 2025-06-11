
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Calendar, FileText } from 'lucide-react';

interface SystemStatisticsProps {
  clientCount: number;
  technicianCount: number;
  scheduledServicesCount: number;
  totalOrdersCount: number;
}

const SystemStatistics: React.FC<SystemStatisticsProps> = ({ 
  clientCount, 
  technicianCount, 
  scheduledServicesCount, 
  totalOrdersCount 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estatísticas</CardTitle>
        <CardDescription>
          Visão geral do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm">Total de Clientes</span>
            </div>
            <span className="font-medium">{clientCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm">Total de Técnicos</span>
            </div>
            <span className="font-medium">{technicianCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">Serviços Agendados</span>
            </div>
            <span className="font-medium">{scheduledServicesCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm">Total de Ordens</span>
            </div>
            <span className="font-medium">{totalOrdersCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatistics;
