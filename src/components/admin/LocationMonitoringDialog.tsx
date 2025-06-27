import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MapPin, 
  AlertTriangle, 
  Clock, 
  User,
  RefreshCw,
  Loader2,
  Eye,
  Filter
} from 'lucide-react';
import { GeolocationService } from '@/services/geolocation/geolocationService';
import { CheckInAttempt } from '@/types/geolocation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface LocationMonitoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationMonitoringDialog({ open, onOpenChange }: LocationMonitoringDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suspiciousAttempts, setSuspiciousAttempts] = useState<CheckInAttempt[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

  const loadSuspiciousAttempts = async () => {
    setIsLoading(true);
    try {
      // Se for "all", buscar de todos os técnicos (implementar endpoint específico)
      if (selectedTechnician === 'all') {
        // Por enquanto, buscar apenas dados de exemplo
        // TODO: Implementar endpoint para buscar de todos os técnicos
        setSuspiciousAttempts([]);
      } else {
        const attempts = await GeolocationService.getSuspiciousCheckIns(
          selectedTechnician,
          selectedPeriod
        );
        setSuspiciousAttempts(attempts);
      }
    } catch (error) {
      console.error('Erro ao carregar tentativas suspeitas:', error);
      toast.error('Erro ao carregar dados de localização');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSuspiciousAttempts();
    }
  }, [open, selectedTechnician, selectedPeriod]);

  const getSeverityColor = (attempt: CheckInAttempt) => {
    if (attempt.was_overridden) return 'bg-yellow-100 border-yellow-300';
    if (attempt.validation_result.distance > 1000) return 'bg-red-100 border-red-300';
    if (attempt.validation_result.distance > 500) return 'bg-orange-100 border-orange-300';
    return 'bg-gray-100 border-gray-300';
  };

  const getSeverityBadge = (attempt: CheckInAttempt) => {
    if (attempt.was_overridden) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Override</Badge>;
    }
    if (attempt.validation_result.distance > 1000) {
      return <Badge variant="destructive">Muito Distante</Badge>;
    }
    if (attempt.validation_result.distance > 500) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Distante</Badge>;
    }
    return <Badge variant="outline">Normal</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Monitoramento de Localização
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value={1}>Último dia</option>
                    <option value={7}>Últimos 7 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                    <option value={90}>Últimos 90 dias</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Técnico:</label>
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">Todos os técnicos</option>
                    {/* TODO: Carregar lista de técnicos dinamicamente */}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={loadSuspiciousAttempts}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar Dados
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {suspiciousAttempts.length}
                  </div>
                  <div className="text-sm text-gray-600">Total de Tentativas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {suspiciousAttempts.filter(a => a.was_overridden).length}
                  </div>
                  <div className="text-sm text-gray-600">Com Override</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {suspiciousAttempts.filter(a => a.validation_result.distance > 1000).length}
                  </div>
                  <div className="text-sm text-gray-600">Muito Distantes</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de tentativas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tentativas de Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Carregando tentativas...</span>
                </div>
              ) : suspiciousAttempts.length > 0 ? (
                <div className="space-y-3">
                  {suspiciousAttempts.map((attempt) => (
                    <Card key={attempt.id} className={`border ${getSeverityColor(attempt)}`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Técnico ID: {attempt.technician_id}</span>
                                {getSeverityBadge(attempt)}
                              </div>
                              <div className="text-sm text-gray-600">
                                OS: {attempt.service_order_id}
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(attempt.timestamp), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Detalhes */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-gray-700">Endereço de destino:</div>
                              <div className="text-gray-600">{attempt.target_address}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">Distância:</div>
                              <div className="text-gray-600">
                                {Math.round(attempt.validation_result.distance)}m
                                {attempt.validation_result.tolerance && (
                                  <span className="text-gray-400">
                                    {' '}(tolerância: {attempt.validation_result.tolerance}m)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Override reason */}
                          {attempt.was_overridden && attempt.override_reason && (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <div className="font-medium text-yellow-800 mb-1">Motivo do Override:</div>
                              <div className="text-yellow-700 text-sm">{attempt.override_reason}</div>
                            </div>
                          )}

                          {/* Status */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Status:</span>
                              <Badge variant={
                                attempt.status === 'success' ? 'default' :
                                attempt.status === 'overridden' ? 'secondary' : 'destructive'
                              }>
                                {attempt.status === 'success' ? 'Sucesso' :
                                 attempt.status === 'overridden' ? 'Override' : 'Falhou'}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <h3 className="font-medium mb-1">Nenhuma tentativa encontrada</h3>
                  <p className="text-sm">
                    Não há tentativas de check-in suspeitas no período selecionado.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
