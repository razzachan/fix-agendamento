import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { ClientOrder } from '@/types/client';

interface WelcomeSectionProps {
  user: any;
  orders: ClientOrder[];
}

export function WelcomeSection({ user, orders }: WelcomeSectionProps) {
  const currentHour = new Date().getHours();
  
  const getGreeting = () => {
    if (currentHour < 12) return 'Bom dia';
    if (currentHour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || 'Cliente';
  };

  // Calcular estatísticas reais baseadas nas ordens
  const stats = {
    active: orders.filter(order =>
      order.status === 'in_progress' ||
      order.status === 'scheduled'
    ).length,
    completed: orders.filter(order =>
      order.status === 'completed'
    ).length,
    pending: orders.filter(order =>
      order.status === 'quote_sent' ||
      order.status === 'diagnosis_completed' ||
      order.status === 'pending'
    ).length
  };

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {getFirstName(user?.name)}! 👋
        </h1>
        <p className="text-gray-600">
          Acompanhe o status dos seus equipamentos e solicite novos serviços
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Equipamentos Ativos */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Acompanhe o progresso
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Equipamentos Concluídos */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                Serviços finalizados
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Aguardando Ação */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aguardando</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                Sua aprovação
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
