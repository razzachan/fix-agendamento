import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  List,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Filter,
  Zap,
  Wrench,
  Package,
  DollarSign
} from 'lucide-react';
import { useWorkshopQueue } from '@/hooks/useWorkshopQueue';
import { QueueItem } from '@/services/workshop/workshopQueueService';
import { WorkshopQueueItem } from './WorkshopQueueItem';
import { WorkshopQueueMetrics } from './WorkshopQueueMetrics';

interface WorkshopQueueProps {
  className?: string;
}

export function WorkshopQueue({ className }: WorkshopQueueProps) {
  const {
    queueItems,
    queueMetrics,
    isLoading,
    error,
    lastUpdated,
    refreshQueue,
    reorderItem,
    getItemsByCategory,
    getUrgentItems,
    getOverdueItems
  } = useWorkshopQueue();

  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'time' | 'status'>('priority');

  console.log('🔍 [WorkshopQueue] Debug:', {
    queueItems: queueItems?.length || 0,
    isLoading,
    error,
    queueMetrics
  });

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(1)}h`;
    }
  };

  const getFilteredItems = (): QueueItem[] => {
    let items: QueueItem[] = [];

    switch (activeTab) {
      case 'urgent':
        items = getUrgentItems();
        break;
      case 'diagnosis':
        items = getItemsByCategory('diagnosis_pending');
        break;
      case 'repair':
        items = getItemsByCategory('repair_approved');
        break;
      case 'approval':
        items = getItemsByCategory('awaiting_approval');
        break;
      case 'delivery':
        items = getItemsByCategory('ready_delivery');
        break;
      default:
        items = queueItems;
    }

    // Aplicar ordenação adicional se necessário
    if (sortBy === 'time') {
      return [...items].sort((a, b) => b.timeInWorkshop - a.timeInWorkshop);
    } else if (sortBy === 'status') {
      return [...items].sort((a, b) => a.status.localeCompare(b.status));
    }

    return items; // Já vem ordenado por prioridade do serviço
  };

  const filteredItems = getFilteredItems();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5 text-blue-600" />
            Fila de Trabalho Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Carregando fila de trabalho...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5 text-blue-600" />
            Fila de Trabalho Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-500" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refreshQueue} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas da Fila */}
      <WorkshopQueueMetrics metrics={queueMetrics} />

      {/* Fila Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-blue-600" />
              Fila de Trabalho Inteligente
              <Badge variant="outline" className="ml-2">
                {queueItems.length} itens
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
                </span>
              )}
              <Button onClick={refreshQueue} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs de Filtros */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <List className="h-3 w-3" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="urgent" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Urgentes
                {queueMetrics.urgentItems > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {queueMetrics.urgentItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="diagnosis" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Diagnóstico
              </TabsTrigger>
              <TabsTrigger value="repair" className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                Reparo
              </TabsTrigger>
              <TabsTrigger value="approval" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Aprovação
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Entrega
              </TabsTrigger>
            </TabsList>

            {/* Controles de Ordenação */}
            <div className="flex items-center gap-2 mt-4 mb-4">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <Button
                variant={sortBy === 'priority' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('priority')}
              >
                Prioridade
              </Button>
              <Button
                variant={sortBy === 'time' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('time')}
              >
                Tempo na Oficina
              </Button>
              <Button
                variant={sortBy === 'status' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('status')}
              >
                Status
              </Button>
            </div>

            {/* Conteúdo das Tabs */}
            <TabsContent value={activeTab} className="mt-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="text-gray-600">
                    {activeTab === 'all'
                      ? 'Nenhum item na fila de trabalho'
                      : `Nenhum item na categoria ${activeTab}`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item, index) => (
                    <WorkshopQueueItem
                      key={item.id}
                      item={item}
                      onReorder={reorderItem}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}