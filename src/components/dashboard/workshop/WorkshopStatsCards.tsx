
import React, { useEffect, memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, Wrench, Package, TrendingUp, DollarSign, Loader2 } from 'lucide-react';

interface WorkshopStatsCardsProps {
  pendingDiagnostics: number;
  awaitingQuoteApproval: number;
  ongoingWork: number;
  readyForPickup: number;
  completedToday: number;
  isLoading?: boolean;
}

// Usando memo para evitar renderizações desnecessárias
const WorkshopStatsCards: React.FC<WorkshopStatsCardsProps> = memo(({
  pendingDiagnostics,
  awaitingQuoteApproval,
  ongoingWork,
  readyForPickup,
  completedToday,
  isLoading = false
}) => {
  // Log props values apenas quando realmente mudam
  useEffect(() => {
    console.log("WorkshopStatsCards valores:", {
      pendingDiagnostics,
      awaitingQuoteApproval,
      ongoingWork,
      readyForPickup,
      completedToday,
      isLoading
    });
  }, [pendingDiagnostics, awaitingQuoteApproval, ongoingWork, readyForPickup, completedToday, isLoading]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
      {/* Card 1: Aguardando Diagnóstico */}
      <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-400 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-200">Aguardando Diagnóstico</CardTitle>
          <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingDiagnostics}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Equipamentos recebidos para avaliação
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Aguardando Aprovação */}
      <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800">Aguardando Aprovação</CardTitle>
          <DollarSign className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : awaitingQuoteApproval}
          </div>
          <p className="text-xs text-gray-600">
            Orçamentos aguardando aprovação
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Em Trabalho */}
      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800">Em Trabalho</CardTitle>
          <Wrench className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ongoingWork}
          </div>
          <p className="text-xs text-gray-600">
            Reparos em andamento (aprovados)
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Prontos para Coleta */}
      <Card className="border-l-4 border-l-green-500 dark:border-l-green-400 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-200">Prontos para Coleta</CardTitle>
          <Package className="h-4 w-4 text-green-500 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : readyForPickup}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Equipamentos finalizados aguardando retirada
          </p>
        </CardContent>
      </Card>

      {/* Card 5: Concluídos Hoje */}
      <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800">Concluídos Hoje</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : completedToday}
          </div>
          <p className="text-xs text-gray-600">
            Serviços finalizados no dia de hoje
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

// Definindo displayName para o componente memo
WorkshopStatsCards.displayName = 'WorkshopStatsCards';

export default WorkshopStatsCards;
