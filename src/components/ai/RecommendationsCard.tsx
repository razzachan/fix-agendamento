// ===================================================================
// 🤖 CARD DE RECOMENDAÇÕES INTELIGENTES (MVP 4)
// ===================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

/**
 * Card para exibir recomendações inteligentes
 */
export function RecommendationsCard() {
  // Dados simulados para desenvolvimento
  const mockRecommendations = [
    {
      id: '1',
      category: 'Estoque',
      title: 'Otimizar Distribuição de Peças',
      description: 'Redistribuir peças entre técnicos para reduzir tempo de espera',
      impact: 'Alto',
      effort: 'Baixo',
      priority: 1,
      estimatedSavings: 2500,
      timeline: '1-2 dias',
      icon: Package,
      color: 'bg-blue-500',
      actions: [
        'Transferir 5 resistências do Técnico A para Técnico B',
        'Mover 3 termostatos da oficina para técnicos de campo',
        'Atualizar sistema de controle de estoque'
      ]
    },
    {
      id: '2',
      category: 'Recursos Humanos',
      title: 'Realocação de Técnicos',
      description: 'Redistribuir técnicos para equilibrar carga de trabalho',
      impact: 'Médio',
      effort: 'Médio',
      priority: 2,
      estimatedSavings: 1800,
      timeline: '3-5 dias',
      icon: Users,
      color: 'bg-green-500',
      actions: [
        'Mover 1 técnico da região Norte para Centro',
        'Ajustar rotas para otimizar deslocamentos',
        'Treinar técnico em novos equipamentos'
      ]
    },
    {
      id: '3',
      category: 'Financeiro',
      title: 'Oportunidade de Upsell',
      description: 'Clientes com potencial para serviços adicionais',
      impact: 'Alto',
      effort: 'Baixo',
      priority: 1,
      estimatedSavings: 4200,
      timeline: '1 semana',
      icon: DollarSign,
      color: 'bg-purple-500',
      actions: [
        'Contatar 12 clientes para manutenção preventiva',
        'Oferecer pacotes de serviços anuais',
        'Implementar programa de fidelidade'
      ]
    }
  ];

  /**
   * Obter cor do badge baseado no impacto
   */
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Alto':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'Médio':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'Baixo':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200';
    }
  };

  /**
   * Obter cor do badge baseado no esforço
   */
  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'Baixo':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'Médio':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'Alto':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Recomendações Inteligentes
          </h2>
          <p className="text-muted-foreground">
            Sugestões automáticas para otimizar sua operação
          </p>
        </div>
      </div>

      {/* Estatísticas das recomendações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Economia Potencial</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {mockRecommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Lightbulb className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recomendações Ativas</p>
                <p className="text-2xl font-bold">{mockRecommendations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alta Prioridade</p>
                <p className="text-2xl font-bold">
                  {mockRecommendations.filter(rec => rec.priority === 1).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de recomendações */}
      <div className="space-y-4">
        {mockRecommendations.map((recommendation) => {
          const Icon = recommendation.icon;
          
          return (
            <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${recommendation.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{recommendation.title}</h3>
                        <p className="text-sm text-muted-foreground">{recommendation.category}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getImpactColor(recommendation.impact)}>
                          Impacto {recommendation.impact}
                        </Badge>
                        <Badge className={getEffortColor(recommendation.effort)}>
                          Esforço {recommendation.effort}
                        </Badge>
                        <Badge variant="outline">
                          Prioridade {recommendation.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-4">{recommendation.description}</p>
                    
                    {/* Métricas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Economia Estimada</p>
                        <p className="font-semibold text-green-600">
                          R$ {recommendation.estimatedSavings.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="font-semibold">{recommendation.timeline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROI Estimado</p>
                        <p className="font-semibold text-blue-600">
                          {Math.round((recommendation.estimatedSavings / 1000) * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Ações sugeridas */}
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-2">Ações Sugeridas:</h4>
                      <div className="space-y-1">
                        {recommendation.actions.map((action, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Implementar
                      </Button>
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        Adiar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estado vazio */}
      {mockRecommendations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma recomendação disponível</h3>
            <p className="text-muted-foreground mb-4">
              O sistema está analisando seus dados para gerar recomendações personalizadas
            </p>
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              Gerar Recomendações
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
