import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Truck, Package, CheckCircle } from 'lucide-react';
import { OngoingRepairsList } from '@/components/admin/OngoingRepairsList';
import { ReadyForDeliveryList } from '@/components/delivery/ReadyForDeliveryList';
import { PaidOrdersList } from '@/components/delivery/PaidOrdersList';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

const RepairsAndDeliveries: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('repairs');
  const { badges } = useSidebarBadges();

  // Detectar qual aba mostrar baseado na URL
  useEffect(() => {
    if (location.pathname === '/deliveries') {
      setActiveTab('deliveries');
    } else if (location.pathname === '/repairs') {
      setActiveTab('repairs');
    }
  }, [location.pathname]);



  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reparos & Entregas</h2>
          <p className="text-muted-foreground">
            Gerencie o ciclo completo: desde reparos em andamento até entregas finalizadas
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reparos Ativos</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-blue-600">
                {badges.repairs || 0}
              </div>
              {badges.repairs > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Atenção
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Equipamentos em reparo ou prontos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Pendentes</CardTitle>
            <Truck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-green-600">
                {badges.deliveries || 0}
              </div>
              {badges.deliveries > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Ação
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Equipamentos para entrega
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ativo</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-purple-600">
                {(badges.repairs || 0) + (badges.deliveries || 0)}
              </div>
              <Badge variant="outline" className="border-purple-200 text-purple-800">
                Equipamentos
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Em todo o processo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="repairs" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Reparos
            {badges.repairs > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {badges.repairs}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Entregas
            {badges.deliveries > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {badges.deliveries}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da aba Reparos */}
        <TabsContent value="repairs" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold">Gestão de Reparos</h3>
            <Badge variant="outline" className="ml-2">
              Oficina
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6">
            Acompanhe o progresso dos reparos em andamento na oficina e equipamentos prontos para entrega
          </p>
          
          <OngoingRepairsList />
        </TabsContent>

        {/* Conteúdo da aba Entregas */}
        <TabsContent value="deliveries" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-green-600" />
            <h3 className="text-xl font-semibold">Gestão de Entregas</h3>
            <Badge variant="outline" className="ml-2">
              Logística
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6">
            Gerencie entregas de equipamentos reparados - o pagamento será coletado pelo entregador
          </p>

          {/* Sub-abas para diferentes tipos de entrega */}
          <Tabs defaultValue="ready" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ready" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Prontos para Entrega
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pagos - Agendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ready" className="mt-6">
              <ReadyForDeliveryList />
            </TabsContent>

            <TabsContent value="paid" className="mt-6">
              <PaidOrdersList />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RepairsAndDeliveries;
