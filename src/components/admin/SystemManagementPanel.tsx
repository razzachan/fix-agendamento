import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bug, 
  Rocket, 
  MapPin, 
  Database, 
  MessageSquare,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';
import { SystemTestingDialog } from './SystemTestingDialog';
import { MVPLaunchChecklistDialog } from './MVPLaunchChecklistDialog';
import { LocationMonitoringDialog } from './LocationMonitoringDialog';
import { FinalCostMigrationDialog } from './FinalCostMigrationDialog';

export function SystemManagementPanel() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const managementTools = [
    {
      id: 'system-tests',
      title: 'Testes do Sistema',
      description: 'Execute testes automatizados para validar funcionalidades críticas',
      icon: Bug,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      status: 'ready',
      component: SystemTestingDialog
    },
    {
      id: 'mvp-checklist',
      title: 'Checklist MVP',
      description: 'Verifique a prontidão do sistema para lançamento',
      icon: Rocket,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
      status: 'ready',
      component: MVPLaunchChecklistDialog
    },
    {
      id: 'location-monitoring',
      title: 'Monitoramento de Localização',
      description: 'Monitore tentativas de check-in e validações de proximidade',
      icon: MapPin,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      status: 'ready',
      component: LocationMonitoringDialog
    },
    {
      id: 'cost-migration',
      title: 'Migração de Valores',
      description: 'Migre valores da descrição para o campo final_cost',
      icon: Database,
      color: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600',
      status: 'ready',
      component: FinalCostMigrationDialog
    }
  ];

  const systemMetrics = [
    {
      title: 'Sistema de Comentários',
      status: 'operational',
      description: 'Funcionando normalmente',
      icon: MessageSquare
    },
    {
      title: 'Validação de Geolocalização',
      status: 'operational',
      description: 'Funcionando normalmente',
      icon: MapPin
    },
    {
      title: 'Sistema de Notificações',
      status: 'operational',
      description: 'Funcionando normalmente',
      icon: Zap
    },
    {
      title: 'Segurança (RLS)',
      status: 'operational',
      description: 'Políticas ativas',
      icon: Shield
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800">Operacional</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Atenção</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const openDialog = (dialogId: string) => {
    setActiveDialog(dialogId);
  };

  const closeDialog = () => {
    setActiveDialog(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6 mobile-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gerenciamento do Sistema</h2>
          <p className="text-sm sm:text-base text-gray-600">Ferramentas de administração, testes e monitoramento</p>
        </div>
      </div>

      {/* Status Geral do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemMetrics.map((metric, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <metric.icon className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="font-medium text-sm">{metric.title}</div>
                        <div className="text-xs text-gray-500">{metric.description}</div>
                      </div>
                    </div>
                    {getStatusBadge(metric.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ferramentas de Gerenciamento */}
      <Card>
        <CardHeader>
          <CardTitle>Ferramentas de Gerenciamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {managementTools.map((tool) => (
              <Card 
                key={tool.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${tool.color}`}
                onClick={() => openDialog(tool.id)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white`}>
                          <tool.icon className={`h-5 w-5 ${tool.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{tool.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {tool.status === 'ready' ? 'Pronto' : 'Indisponível'}
                      </Badge>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog(tool.id);
                      }}
                    >
                      Abrir Ferramenta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações Importantes */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">🚀 Preparação para Lançamento MVP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-blue-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">✅ Funcionalidades Implementadas:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Sistema de comentários completo</li>
                  <li>• Validação robusta de geolocalização</li>
                  <li>• Notificações inteligentes</li>
                  <li>• Ciclo completo de OS</li>
                  <li>• Dashboards funcionais</li>
                  <li>• Sistema de valores integrado</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔧 Próximos Passos:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Execute os testes do sistema</li>
                  <li>• Verifique o checklist MVP</li>
                  <li>• Monitore tentativas de localização</li>
                  <li>• Execute migração de valores (se necessário)</li>
                  <li>• Teste com usuários reais</li>
                  <li>• Prepare documentação básica</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {managementTools.map((tool) => {
        const DialogComponent = tool.component;
        return (
          <DialogComponent
            key={tool.id}
            open={activeDialog === tool.id}
            onOpenChange={(open) => !open && closeDialog()}
          />
        );
      })}
    </div>
  );
}
