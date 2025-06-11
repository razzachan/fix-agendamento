import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import serviceOrderProgressService, { ProgressEntry } from '@/services/serviceOrderProgress/serviceOrderProgressService';
import { AddProgressEntryDialog } from './AddProgressEntryDialog';
import { getStatusColor, getStatusIcon } from '@/lib/utils';

interface ServiceOrderProgressHistoryProps {
  serviceOrderId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

export function ServiceOrderProgressHistory({ 
  serviceOrderId, 
  currentStatus,
  onStatusChange 
}: ServiceOrderProgressHistoryProps) {
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchProgressHistory = async () => {
      setLoading(true);
      try {
        const entries = await serviceOrderProgressService.getServiceOrderProgress(serviceOrderId);
        setProgressEntries(entries);
      } catch (error) {
        console.error('Erro ao buscar histórico de progresso:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressHistory();
  }, [serviceOrderId, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleAddEntry = async (status: string, notes: string) => {
    try {
      const result = await serviceOrderProgressService.addProgressEntry({
        serviceOrderId,
        status,
        notes
      });

      if (result) {
        setRefreshKey(prev => prev + 1);
        if (onStatusChange && status !== currentStatus) {
          onStatusChange(status);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao adicionar entrada de progresso:', error);
      return false;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Histórico de Progresso</CardTitle>
          <CardDescription>
            Acompanhe o histórico de atualizações desta ordem
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : progressEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum histórico de progresso disponível.
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {progressEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="border rounded-lg p-4 relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      className={`${getStatusColor(entry.status)}`}
                    >
                      {React.createElement(getStatusIcon(entry.status), { className: "h-3 w-3 mr-1" })}
                      {entry.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{entry.notes}</p>
                  {entry.createdBy && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Por: {entry.createdBy}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <AddProgressEntryDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSubmit={handleAddEntry}
        currentStatus={currentStatus}
      />
    </Card>
  );
}
