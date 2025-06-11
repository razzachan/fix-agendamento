import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { DiagnosisAwaitingQuote } from '@/components/admin/DiagnosisAwaitingQuote';
import { PendingQuotesList } from '@/components/admin/PendingQuotesList';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

const Quotes: React.FC = () => {
  const [activeTab, setActiveTab] = useState('diagnosis');
  const { badges } = useSidebarBadges();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Orçamentos</h2>
          <p className="text-muted-foreground">
            Gerencie diagnósticos, crie orçamentos e aprove solicitações dos clientes
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diagnósticos Pendentes</CardTitle>
            <Stethoscope className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-blue-600">
                {badges.quotes || 0}
              </div>
              {badges.quotes > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Ação
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando criação de orçamento
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamentos Enviados</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-orange-600">
                {badges.quotes || 0}
              </div>
              {badges.quotes > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Aguardando
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação do cliente
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ativo</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-green-600">
                {badges.quotes || 0}
              </div>
              <Badge variant="outline" className="border-green-200 text-green-800">
                Orçamentos
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
          <TabsTrigger value="diagnosis" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Diagnósticos
            {badges.quotes > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {badges.quotes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Orçamentos
            {badges.quotes > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {badges.quotes}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da aba Diagnósticos */}
        <TabsContent value="diagnosis" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold">Diagnósticos Concluídos</h3>
            <Badge variant="outline" className="ml-2">
              Aguardando Orçamento
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6">
            Diagnósticos concluídos que precisam de orçamento para envio ao cliente
          </p>

          <DiagnosisAwaitingQuote />
        </TabsContent>

        {/* Conteúdo da aba Orçamentos */}
        <TabsContent value="quotes" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-orange-600" />
            <h3 className="text-xl font-semibold">Orçamentos Enviados</h3>
            <Badge variant="outline" className="ml-2">
              Aguardando Aprovação
            </Badge>
          </div>
          <p className="text-muted-foreground mb-6">
            Orçamentos enviados aos clientes aguardando aprovação ou rejeição
          </p>

          <PendingQuotesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Quotes;
