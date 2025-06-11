import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, RefreshCw, Clock, User, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RepairProgressTimeline } from '@/components/repair/RepairProgressTimeline';
import { AlertBadge, useAlertType, useDaysOverdue } from '@/components/ui/AlertBadge';
import { toast } from 'sonner';

interface OngoingRepair {
  id: string;
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  service_attendance_type: string;
  status: string;
  created_at: string;
  current_location: string;
}

export function OngoingRepairsList() {
  const [repairsList, setRepairsList] = useState<OngoingRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadOngoingRepairs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          equipment_type,
          equipment_model,
          service_attendance_type,
          status,
          created_at,
          current_location
        `)
        .in('status', ['in_progress', 'quote_approved', 'ready_for_delivery'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar reparos em andamento:', error);
        throw error;
      }

      setRepairsList(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar reparos em andamento:', error);
      toast.error('Erro ao carregar reparos em andamento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOngoingRepairs();
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    loadOngoingRepairs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'quote_approved':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Orçamento Aprovado</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Reparo</Badge>;
      case 'ready_for_delivery':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Pronto para Entrega</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'coleta_diagnostico':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Diagnóstico</Badge>;
      case 'coleta_conserto':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Conserto</Badge>;
      case 'em_domicilio':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Domicílio</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Reparos em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando reparos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Reparos em Andamento
            {repairsList.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {repairsList.length}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {repairsList.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum reparo em andamento
            </h3>
            <p className="text-gray-600">
              Não há equipamentos sendo reparados no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {repairsList.map((repair) => (
              <div 
                key={repair.id} 
                className="border rounded-lg p-4 space-y-4"
              >
                {/* Cabeçalho do reparo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {repair.client_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {repair.equipment_type}
                        {repair.equipment_model && ` - ${repair.equipment_model}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Badge de alerta inteligente */}
                    {(() => {
                      const alertType = useAlertType(repair);
                      const daysOverdue = useDaysOverdue(repair);

                      if (alertType) {
                        return (
                          <AlertBadge
                            type={alertType}
                            daysOverdue={daysOverdue}
                            size="md"
                          />
                        );
                      }
                      return null;
                    })()}

                    {getServiceTypeBadge(repair.service_attendance_type)}
                    {getStatusBadge(repair.status)}
                  </div>
                </div>
                
                {/* Informações adicionais */}
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Localização:</span>
                    <p>{repair.current_location === 'workshop' ? 'Oficina' : repair.current_location}</p>
                  </div>
                  <div>
                    <span className="font-medium">Iniciado em:</span>
                    <p>{formatDate(repair.created_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p>
                      {repair.status === 'quote_approved' && 'Aguardando início do reparo'}
                      {repair.status === 'in_progress' && 'Reparo em andamento'}
                      {repair.status === 'ready_for_delivery' && 'Aguardando coleta'}
                    </p>
                  </div>
                </div>
                
                {/* Timeline de progresso */}
                <div className="mt-4">
                  <RepairProgressTimeline
                    serviceOrderId={repair.id}
                    refreshKey={refreshKey}
                    showTitle={true}
                    compact={true}
                    hideFinancialInfo={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
