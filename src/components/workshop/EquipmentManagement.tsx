import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Wrench,
  Eye,
  Edit,
  Camera,
  FileText,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import { DiagnosisDialog } from './DiagnosisDialog';
import { RepairProgressDialog } from './RepairProgressDialog';
import { CompleteRepairDialog } from './CompleteRepairDialog';

interface EquipmentManagementProps {
  workshopOrders: ServiceOrder[];
  diagnosisCompletedIds: string[];
  onDataUpdate: () => void;
}

const EquipmentManagement: React.FC<EquipmentManagementProps> = ({
  workshopOrders,
  diagnosisCompletedIds,
  onDataUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<ServiceOrder | null>(null);
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Filtrar equipamentos
  const filteredEquipments = useMemo(() => {
    return workshopOrders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.equipmentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.equipmentModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      const matchesType = typeFilter === 'all' || order.serviceAttendanceType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workshopOrders, searchTerm, statusFilter, typeFilter]);

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received_at_workshop':
        return 'bg-blue-100 text-blue-800';
      case 'diagnosis_completed':
        return 'bg-purple-100 text-purple-800';
      case 'quote_approved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready_for_delivery':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'received_at_workshop':
        return 'Recebido na Oficina';
      case 'diagnosis_completed':
        return 'Diagnóstico Concluído';
      case 'quote_approved':
        return 'Orçamento Aprovado';
      case 'in_progress':
        return 'Em Reparo';
      case 'ready_for_delivery':
        return 'Pronto para Entrega';
      default:
        return status;
    }
  };

  // Função para obter ações disponíveis
  const getAvailableActions = (order: ServiceOrder) => {
    const actions = [];
    
    // Diagnóstico (apenas para coleta_diagnostico)
    if (order.serviceAttendanceType === 'coleta_diagnostico' && 
        order.status === 'received_at_workshop' && 
        !diagnosisCompletedIds.includes(order.id)) {
      actions.push({
        label: 'Adicionar Diagnóstico',
        icon: FileText,
        action: () => handleDiagnosis(order),
        variant: 'default' as const
      });
    }

    // Verificar se é coleta diagnóstico aguardando aprovação
    if (order.serviceAttendanceType === 'coleta_diagnostico' && order.status === 'awaiting_quote_approval') {
      // Mostrar apenas status de aguardando
      return actions; // Não adicionar botões de reparo
    }

    // Iniciar/Atualizar Reparo
    if ((order.status === 'quote_approved') ||
        (order.serviceAttendanceType === 'coleta_conserto' && order.status === 'received_at_workshop') ||
        (order.status === 'in_progress')) {
      actions.push({
        label: order.status === 'in_progress' ? 'Atualizar Progresso' : 'Iniciar Reparo',
        icon: Wrench,
        action: () => handleProgress(order),
        variant: 'default' as const
      });
    }

    // Concluir Reparo - APENAS se não for coleta diagnóstico aguardando aprovação
    if (order.status === 'in_progress' &&
        !(order.serviceAttendanceType === 'coleta_diagnostico' && order.status === 'awaiting_quote_approval')) {
      actions.push({
        label: 'Concluir Reparo',
        icon: CheckCircle,
        action: () => handleComplete(order),
        variant: 'default' as const
      });
    }

    return actions;
  };

  // Handlers para ações
  const handleDiagnosis = (order: ServiceOrder) => {
    setSelectedEquipment(order);
    setShowDiagnosisDialog(true);
  };

  const handleProgress = (order: ServiceOrder) => {
    setSelectedEquipment(order);
    setShowProgressDialog(true);
  };

  const handleComplete = (order: ServiceOrder) => {
    setSelectedEquipment(order);
    setShowCompleteDialog(true);
  };

  const handleDialogSuccess = () => {
    setShowDiagnosisDialog(false);
    setShowProgressDialog(false);
    setShowCompleteDialog(false);
    setSelectedEquipment(null);
    onDataUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por cliente, equipamento ou OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="received_at_workshop">Recebido</SelectItem>
            <SelectItem value="diagnosis_completed">Diagnóstico Concluído</SelectItem>
            <SelectItem value="quote_approved">Orçamento Aprovado</SelectItem>
            <SelectItem value="in_progress">Em Reparo</SelectItem>
            <SelectItem value="ready_for_delivery">Pronto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="coleta_diagnostico">Coleta Diagnóstico</SelectItem>
            <SelectItem value="coleta_conserto">Coleta Conserto</SelectItem>
            <SelectItem value="em_domicilio">Em Domicílio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de equipamentos */}
      <div className="grid gap-4">
        {filteredEquipments.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum equipamento encontrado</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEquipments.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">OS #{order.id.slice(-8)}</h3>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                      <Badge variant="outline">
                        {order.serviceAttendanceType === 'coleta_diagnostico' ? 'Diagnóstico' :
                         order.serviceAttendanceType === 'coleta_conserto' ? 'Conserto' : 'Domicílio'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Cliente:</span>
                        <span>{order.clientName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Equipamento:</span>
                        <span>{order.equipmentType}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Recebido:</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {order.equipmentModel && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Modelo:</span> {order.equipmentModel}
                      </p>
                    )}

                    {order.problemDescription && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Problema:</span> {order.problemDescription}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {/* Mensagem especial para coleta diagnóstico aguardando aprovação */}
                    {order.serviceAttendanceType === 'coleta_diagnostico' && order.status === 'awaiting_quote_approval' ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-yellow-700 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium text-sm">Aguardando Confirmação</span>
                        </div>
                        <p className="text-xs text-yellow-600">
                          Orçamento enviado para aprovação do cliente
                        </p>
                      </div>
                    ) : (
                      // Botões normais para outros casos
                      getAvailableActions(order).map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant={action.variant}
                          onClick={action.action}
                          className="flex items-center gap-2"
                        >
                          <action.icon className="h-4 w-4" />
                          {action.label}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      {selectedEquipment && (
        <>
          <DiagnosisDialog
            open={showDiagnosisDialog}
            onOpenChange={setShowDiagnosisDialog}
            serviceOrderId={selectedEquipment.id}
            onSuccess={handleDialogSuccess}
          />

          <RepairProgressDialog
            open={showProgressDialog}
            onOpenChange={setShowProgressDialog}
            order={selectedEquipment}
            onSuccess={handleDialogSuccess}
          />

          <CompleteRepairDialog
            open={showCompleteDialog}
            onOpenChange={setShowCompleteDialog}
            order={selectedEquipment}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}
    </div>
  );
};

export default EquipmentManagement;
