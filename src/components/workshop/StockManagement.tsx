import React, { useState, useEffect } from 'react';
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
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  supplier: string;
  location: string;
  lastMovement: Date;
  status: 'available' | 'low_stock' | 'out_of_stock';
}

interface StockMovement {
  id: string;
  itemId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  orderId?: string;
  date: Date;
  user: string;
}

interface StockManagementProps {
  onDataUpdate: () => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ onDataUpdate }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - Em produção, isso viria de uma API
  useEffect(() => {
    const mockStockItems: StockItem[] = [
      {
        id: '1',
        code: 'RES001',
        name: 'Resistência 220V',
        description: 'Resistência para forno elétrico 220V 2000W',
        category: 'Resistências',
        currentStock: 5,
        minStock: 10,
        maxStock: 50,
        unitPrice: 45.90,
        supplier: 'Fornecedor A',
        location: 'Prateleira A1',
        lastMovement: new Date(),
        status: 'low_stock'
      },
      {
        id: '2',
        code: 'TER001',
        name: 'Termostato Universal',
        description: 'Termostato universal para fornos',
        category: 'Termostatos',
        currentStock: 15,
        minStock: 5,
        maxStock: 30,
        unitPrice: 89.90,
        supplier: 'Fornecedor B',
        location: 'Prateleira B2',
        lastMovement: new Date(),
        status: 'available'
      },
      {
        id: '3',
        code: 'FUS001',
        name: 'Fusível 15A',
        description: 'Fusível cerâmico 15A para proteção',
        category: 'Fusíveis',
        currentStock: 0,
        minStock: 20,
        maxStock: 100,
        unitPrice: 8.50,
        supplier: 'Fornecedor C',
        location: 'Gaveta C1',
        lastMovement: new Date(),
        status: 'out_of_stock'
      }
    ];

    const mockMovements: StockMovement[] = [
      {
        id: '1',
        itemId: '1',
        type: 'out',
        quantity: 2,
        reason: 'Usado na OS #12345',
        orderId: '12345',
        date: new Date(),
        user: 'João Silva'
      },
      {
        id: '2',
        itemId: '2',
        type: 'in',
        quantity: 10,
        reason: 'Compra - Nota Fiscal 001',
        date: new Date(),
        user: 'Maria Santos'
      }
    ];

    setStockItems(mockStockItems);
    setStockMovements(mockMovements);
    setIsLoading(false);
  }, []);

  // Filtrar itens
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'low_stock':
        return 'Estoque Baixo';
      case 'out_of_stock':
        return 'Sem Estoque';
      default:
        return status;
    }
  };

  // Calcular estatísticas
  const stats = {
    totalItems: stockItems.length,
    lowStockItems: stockItems.filter(item => item.status === 'low_stock').length,
    outOfStockItems: stockItems.filter(item => item.status === 'out_of_stock').length,
    totalValue: stockItems.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0)
  };

  const handleAddItem = () => {
    // Implementar adição de item
    toast.success('Funcionalidade em desenvolvimento');
  };

  const handleMovement = (item: StockItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setShowMovementDialog(true);
    // Implementar movimentação
    toast.success('Funcionalidade em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Resistências">Resistências</SelectItem>
              <SelectItem value="Termostatos">Termostatos</SelectItem>
              <SelectItem value="Fusíveis">Fusíveis</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="low_stock">Estoque Baixo</SelectItem>
              <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAddItem} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>

      {/* Lista de Itens */}
      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                    <Badge variant="outline">{item.category}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Código:</span> {item.code}
                    </div>
                    <div>
                      <span className="font-medium">Estoque:</span> {item.currentStock} un.
                    </div>
                    <div>
                      <span className="font-medium">Preço:</span> R$ {item.unitPrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Localização:</span> {item.location}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMovement(item, 'in')}
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Entrada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMovement(item, 'out')}
                    className="flex items-center gap-2"
                  >
                    <TrendingDown className="h-4 w-4" />
                    Saída
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas de Estoque Baixo */}
      {stats.lowStockItems > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              {stats.lowStockItems} item(ns) com estoque baixo e {stats.outOfStockItems} item(ns) sem estoque.
              Considere fazer uma reposição.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockManagement;
