import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Search, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Send,
  Calculator,
  User,
  Package,
  Calendar
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';

interface Quote {
  id: string;
  orderId: string;
  clientName: string;
  equipmentType: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  description: string;
  estimatedDays: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
  sentAt?: Date;
  respondedAt?: Date;
  items: QuoteItem[];
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'labor' | 'part';
}

interface QuoteSystemProps {
  workshopOrders: ServiceOrder[];
  onDataUpdate: () => void;
}

const QuoteSystem: React.FC<QuoteSystemProps> = ({ workshopOrders, onDataUpdate }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - Em produção, isso viria de uma API
  React.useEffect(() => {
    const mockQuotes: Quote[] = [
      {
        id: '1',
        orderId: 'order-1',
        clientName: 'João Silva',
        equipmentType: 'Forno Elétrico',
        laborCost: 150.00,
        partsCost: 89.90,
        totalCost: 239.90,
        description: 'Troca de resistência e limpeza geral',
        estimatedDays: 3,
        status: 'sent',
        createdAt: new Date(),
        sentAt: new Date(),
        items: [
          {
            id: '1',
            description: 'Mão de obra - Troca de resistência',
            quantity: 1,
            unitPrice: 150.00,
            total: 150.00,
            type: 'labor'
          },
          {
            id: '2',
            description: 'Resistência 220V 2000W',
            quantity: 1,
            unitPrice: 89.90,
            total: 89.90,
            type: 'part'
          }
        ]
      },
      {
        id: '2',
        orderId: 'order-2',
        clientName: 'Maria Santos',
        equipmentType: 'Micro-ondas',
        laborCost: 120.00,
        partsCost: 45.00,
        totalCost: 165.00,
        description: 'Troca de fusível e ajuste do timer',
        estimatedDays: 2,
        status: 'approved',
        createdAt: new Date(),
        sentAt: new Date(),
        respondedAt: new Date(),
        items: [
          {
            id: '3',
            description: 'Mão de obra - Reparo timer',
            quantity: 1,
            unitPrice: 120.00,
            total: 120.00,
            type: 'labor'
          },
          {
            id: '4',
            description: 'Fusível 15A',
            quantity: 1,
            unitPrice: 45.00,
            total: 45.00,
            type: 'part'
          }
        ]
      }
    ];

    setQuotes(mockQuotes);
  }, []);

  // Filtrar orçamentos
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesSearch = !searchTerm || 
        quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.equipmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.orderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  // Ordens que precisam de orçamento
  const ordersNeedingQuote = useMemo(() => {
    return workshopOrders.filter(order => 
      order.status === 'diagnosis_completed' && 
      order.serviceAttendanceType === 'coleta_diagnostico' &&
      !quotes.some(quote => quote.orderId === order.id)
    );
  }, [workshopOrders, quotes]);

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200';
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200';
    }
  };

  // Obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'sent':
        return 'Enviado';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  // Calcular estatísticas
  const stats = {
    totalQuotes: quotes.length,
    pendingQuotes: quotes.filter(q => q.status === 'sent').length,
    approvedQuotes: quotes.filter(q => q.status === 'approved').length,
    totalValue: quotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + q.totalCost, 0)
  };

  const handleCreateQuote = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowCreateDialog(true);
  };

  const handleSaveQuote = () => {
    // Implementar criação de orçamento
    toast.success('Funcionalidade em desenvolvimento');
    setShowCreateDialog(false);
    setSelectedOrder(null);
  };

  const handleSendQuote = (quoteId: string) => {
    // Implementar envio de orçamento
    toast.success('Orçamento enviado para aprovação');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Aprovação</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedQuotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Aprovado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ordens que precisam de orçamento */}
      {ordersNeedingQuote.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ordens Aguardando Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ordersNeedingQuote.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">OS #{order.id.slice(-8)} - {order.clientName}</p>
                    <p className="text-sm text-gray-600">{order.equipmentType}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleCreateQuote(order)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Orçamento
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar orçamentos..."
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
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Orçamentos */}
      <div className="grid gap-4">
        {filteredQuotes.map((quote) => (
          <Card key={quote.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">Orçamento #{quote.id}</h3>
                    <Badge className={getStatusColor(quote.status)}>
                      {getStatusLabel(quote.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Cliente:</span>
                      <span>{quote.clientName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Equipamento:</span>
                      <span>{quote.equipmentType}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Valor:</span>
                      <span className="font-bold text-green-600">R$ {quote.totalCost.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Prazo:</span>
                      <span>{quote.estimatedDays} dias</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">{quote.description}</p>

                  {/* Breakdown de custos */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Mão de obra:</span>
                        <span className="ml-2">R$ {quote.laborCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Peças:</span>
                        <span className="ml-2">R$ {quote.partsCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Total:</span>
                        <span className="ml-2 font-bold">R$ {quote.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {quote.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSendQuote(quote.id)}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Enviar
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para criar orçamento */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrder && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p><strong>OS:</strong> #{selectedOrder.id.slice(-8)}</p>
                <p><strong>Cliente:</strong> {selectedOrder.clientName}</p>
                <p><strong>Equipamento:</strong> {selectedOrder.equipmentType}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="laborCost">Mão de Obra (R$)</Label>
                <Input id="laborCost" type="number" placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="partsCost">Peças (R$)</Label>
                <Input id="partsCost" type="number" placeholder="0.00" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="estimatedDays">Prazo Estimado (dias)</Label>
              <Input id="estimatedDays" type="number" placeholder="3" />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição do Serviço</Label>
              <Textarea id="description" placeholder="Descreva o serviço a ser realizado..." />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveQuote}>
                Salvar Orçamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteSystem;
