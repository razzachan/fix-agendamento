import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  DollarSign,
  Eye,
  EyeOff,
  X,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useFinancialAlerts } from '@/hooks/useFinancialAlerts';
import { formatCurrency } from '@/utils/financialCalculations';
import { FinancialAlert } from '@/services/financialAlertService';

interface FinancialAlertsWidgetProps {
  maxHeight?: string;
  showActions?: boolean;
  compact?: boolean;
}

const FinancialAlertsWidget: React.FC<FinancialAlertsWidgetProps> = ({
  maxHeight = '400px',
  showActions = true,
  compact = false
}) => {
  const {
    alerts,
    unreadAlerts,
    criticalAlerts,
    isAnalyzing,
    markAsRead,
    markAllAsRead,
    removeAlert,
    clearAlerts,
    totalAlerts,
    unreadCount,
    criticalCount
  } = useFinancialAlerts();

  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Filtrar alertas
  const filteredAlerts = alerts.filter(alert => {
    if (showOnlyUnread && alert.isRead) return false;
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    return true;
  });

  const getAlertIcon = (alert: FinancialAlert) => {
    switch (alert.type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Alertas Financeiros</span>
            </div>
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} críticos
                </Badge>
              )}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} não lidos
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {totalAlerts} total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Alertas Financeiros</CardTitle>
            {isAnalyzing && (
              <div className="animate-spin">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                className="text-xs"
              >
                {showOnlyUnread ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {showOnlyUnread ? 'Todos' : 'Não lidos'}
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    markAllAsRead();
                    toast.success('Todos os alertas marcados como lidos', {
                      description: `${unreadCount} alerta${unreadCount > 1 ? 's' : ''} marcado${unreadCount > 1 ? 's' : ''} como lido${unreadCount > 1 ? 's' : ''}.`
                    });
                  }}
                  className="text-xs"
                  title="Marcar todos os alertas como lidos"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Marcar todos
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-xs text-muted-foreground">Críticos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
            <div className="text-xs text-muted-foreground">Não Lidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalAlerts}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-4">
          {(['all', 'high', 'medium', 'low'] as const).map(severity => (
            <Button
              key={severity}
              variant={selectedSeverity === severity ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSeverity(severity)}
              className="text-xs"
            >
              {severity === 'all' ? 'Todos' : 
               severity === 'high' ? 'Alta' :
               severity === 'medium' ? 'Média' : 'Baixa'}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-medium mb-2">
              {showOnlyUnread ? 'Nenhum alerta não lido' : 'Nenhum alerta encontrado'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {showOnlyUnread 
                ? 'Todos os alertas foram lidos.' 
                : 'Não há alertas financeiros no momento.'}
            </p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border transition-all duration-200 ${
                    alert.isRead
                      ? 'opacity-60 bg-gray-50 border-gray-200'
                      : 'shadow-sm hover:shadow-md'
                  } ${!alert.isRead ? getSeverityColor(alert.severity) : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">
                          {getAlertIcon(alert)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {alert.title}
                            </h4>
                            {alert.isRead && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                ✓ Lido
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            {alert.actionRequired && !alert.isRead && (
                              <Badge variant="destructive" className="text-xs">
                                Ação necessária
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {alert.orderNumber || `#${alert.serviceOrderId.slice(0, 8)}`}
                            </span>
                            <span>{alert.clientName}</span>
                            <span>{formatTimeAgo(alert.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {showActions && (
                        <div className="flex items-center gap-1 ml-2">
                          {!alert.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                markAsRead(alert.id);
                                toast.success('Alerta marcado como lido', {
                                  description: `"${alert.title}" foi marcado como lido.`
                                });
                              }}
                              className="h-6 w-6 p-0"
                              title="Marcar como lido"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeAlert(alert.id);
                              toast.success('Alerta removido', {
                                description: `"${alert.title}" foi removido.`
                              });
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title="Remover alerta"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialAlertsWidget;
