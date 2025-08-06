import React, { useState, useMemo } from 'react';
import { ClientLayout } from '@/components/client/ClientLayout';
import { useClientOrders } from '@/hooks/client/useClientOrders';
import { OrderDetailsModal } from '@/components/client/OrderDetailsModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  RefreshCw,
  Eye,
  FileText,
  Copy
} from 'lucide-react';
import { ClientOrder } from '@/types/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import QuoteApprovalCard from '@/components/client/QuoteApprovalCard';

export function ClientOrders() {
  const { orders, isLoading, error, refetch } = useClientOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleViewDetails = (order: ClientOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Dados do orçamento (mock - depois vamos buscar da API)
  const getQuoteData = (orderId: string) => ({
    diagnosticFee: 50.00, // Taxa de diagnóstico
    laborCost: 120.00,    // Mão de obra
    partsCost: 80.00,     // Peças
    totalCost: 150.00,    // Total (diagnóstico + labor + peças - diagnóstico como mão de obra)
    description: "Necessário substituir capacitor do motor e limpeza geral do equipamento. O diagnóstico será descontado do valor total como mão de obra.",
    details: [
      { item: "Taxa de diagnóstico", value: 50.00, note: "Será descontada do total" },
      { item: "Capacitor do motor", value: 80.00, note: "Peça original" },
      { item: "Mão de obra (limpeza e instalação)", value: 120.00, note: "Inclui desconto do diagnóstico" }
    ]
  });

  const handleQuoteApproval = async (orderId: string, approved: boolean) => {
    setIsProcessing(true);
    try {
      // Aqui vamos implementar a chamada para a API
      console.log(`Orçamento ${approved ? 'aprovado' : 'rejeitado'} para ordem ${orderId}`);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(
        approved
          ? 'Orçamento aprovado com sucesso! Iniciaremos o reparo em breve.'
          : 'Orçamento rejeitado. Entraremos em contato para discutir outras opções.'
      );

      // Atualizar a lista de ordens
      refetch();

    } catch (error) {
      toast.error('Erro ao processar resposta do orçamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // Filtrar e ordenar ordens
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = 
        order.equipmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.equipmentModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'status':
          return a.statusLabel.localeCompare(b.statusLabel);
        case 'equipment':
          return a.equipmentType.localeCompare(b.equipmentType);
        default:
          return 0;
      }
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, sortBy]);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter(o => o.status === 'in_progress' || o.status === 'scheduled').length,
      completed: orders.filter(o => o.status === 'completed').length,
      pending: orders.filter(o => o.status === 'awaiting_quote_approval' || o.status === 'diagnosis_completed').length
    };
  }, [orders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5B034] mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando seus equipamentos...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-gray-600">Erro ao carregar equipamentos: {error}</p>
            <Button onClick={() => refetch()} className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Equipamentos</h1>
            <p className="text-gray-600">Acompanhe todos os seus equipamentos e serviços</p>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Concluídos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aguardando</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por equipamento, modelo ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtro por Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="quote_sent">Aguardando Aprovação</SelectItem>
                </SelectContent>
              </Select>

              {/* Ordenação */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mais Recentes</SelectItem>
                  <SelectItem value="oldest">Mais Antigos</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="equipment">Equipamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Equipamentos */}
        <div className="space-y-4">
          {filteredAndSortedOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Nenhum equipamento encontrado' 
                    : 'Nenhum equipamento cadastrado'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Você ainda não possui equipamentos em nosso sistema.'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button 
                    onClick={() => {
                      const message = encodeURIComponent(
                        'Olá! Gostaria de solicitar um serviço para meu equipamento.'
                      );
                      window.open(`https://api.whatsapp.com/send?phone=5548988332664&text=${message}`, '_blank');
                    }}
                    className="bg-[#E5B034] hover:bg-[#D4A017]"
                  >
                    Solicitar Primeiro Serviço
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Informações principais */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">OS #{order.orderNumber}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.statusLabel}
                          </div>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{order.equipmentType}</p>
                          {order.equipmentModel && (
                            <p className="text-gray-600">Modelo: {order.equipmentModel}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Criado: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          {order.scheduledDate && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>Agendado: {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{order.locationLabel}</span>
                          </div>
                        </div>
                      </div>

                      {order.description && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Problema:</strong> {order.description}
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          <strong>Previsão de conclusão:</strong> {order.estimatedCompletion}
                        </p>
                      </div>

                      {/* Seção de Orçamento - Apenas quando aguardando aprovação */}
                      {order.status === 'awaiting_quote_approval' && (
                        <div className="mt-4">
                          <QuoteApprovalCard
                            order={order as any}
                            onQuoteResponse={(approved) => handleQuoteApproval(order.id, approved)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Informações adicionais */}
        {filteredAndSortedOrders.length > 0 && (
          <div className="text-center text-sm text-gray-500">
            Mostrando {filteredAndSortedOrders.length} de {orders.length} equipamentos
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </ClientLayout>
  );
}
