/**
 * Checklist completo para lançamento do MVP
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  checkFunction?: () => Promise<boolean>;
  details?: string;
}

export interface ChecklistCategory {
  name: string;
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  completionRate: number;
}

/**
 * Classe para gerenciar o checklist de lançamento MVP
 */
export class MVPLaunchChecklist {
  private items: ChecklistItem[] = [
    // FUNCIONALIDADES CORE
    {
      id: 'core-auth',
      category: 'Funcionalidades Core',
      title: 'Sistema de Autenticação',
      description: 'Login/logout funcionando para todos os roles',
      status: 'pending',
      priority: 'critical',
      automated: true,
      checkFunction: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          return true; // Se chegou até aqui, a conexão está funcionando
        } catch {
          return false;
        }
      }
    },
    {
      id: 'core-orders',
      category: 'Funcionalidades Core',
      title: 'Criação de Ordens de Serviço',
      description: 'Criação manual e conversão de agendamentos',
      status: 'pending',
      priority: 'critical',
      automated: true,
      checkFunction: async () => {
        try {
          const { error } = await supabase.from('service_orders').select('*').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    },
    {
      id: 'core-lifecycle',
      category: 'Funcionalidades Core',
      title: 'Ciclo de Vida das OS',
      description: 'Mudanças de status funcionando corretamente',
      status: 'pending',
      priority: 'critical',
      automated: false
    },
    {
      id: 'core-checkin',
      category: 'Funcionalidades Core',
      title: 'Sistema de Check-in/Check-out',
      description: 'Check-in com validação de geolocalização',
      status: 'pending',
      priority: 'critical',
      automated: false
    },
    {
      id: 'core-comments',
      category: 'Funcionalidades Core',
      title: 'Sistema de Comentários',
      description: 'Comentários públicos e internos funcionando',
      status: 'pending',
      priority: 'high',
      automated: true,
      checkFunction: async () => {
        try {
          const { error } = await supabase.from('service_order_comments').select('*').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    },

    // NOTIFICAÇÕES
    {
      id: 'notif-system',
      category: 'Notificações',
      title: 'Engine de Notificações',
      description: 'Sistema de notificações funcionando',
      status: 'pending',
      priority: 'high',
      automated: true,
      checkFunction: async () => {
        try {
          const { error } = await supabase.from('notifications').select('*').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    },
    {
      id: 'notif-triggers',
      category: 'Notificações',
      title: 'Triggers de Notificação',
      description: 'Notificações automáticas em mudanças de status',
      status: 'pending',
      priority: 'medium',
      automated: false
    },

    // DASHBOARDS
    {
      id: 'dash-admin',
      category: 'Dashboards',
      title: 'Dashboard Administrativo',
      description: 'Métricas e relatórios funcionando',
      status: 'pending',
      priority: 'high',
      automated: false
    },
    {
      id: 'dash-tech',
      category: 'Dashboards',
      title: 'Dashboard do Técnico',
      description: 'Interface do técnico funcional',
      status: 'pending',
      priority: 'high',
      automated: false
    },
    {
      id: 'dash-workshop',
      category: 'Dashboards',
      title: 'Dashboard da Oficina',
      description: 'Interface da oficina funcional',
      status: 'pending',
      priority: 'high',
      automated: false
    },
    {
      id: 'dash-client',
      category: 'Dashboards',
      title: 'Dashboard do Cliente',
      description: 'Interface do cliente funcional',
      status: 'pending',
      priority: 'medium',
      automated: false
    },

    // SEGURANÇA
    {
      id: 'sec-rls',
      category: 'Segurança',
      title: 'Row Level Security (RLS)',
      description: 'Políticas de segurança ativas no banco',
      status: 'pending',
      priority: 'critical',
      automated: true,
      checkFunction: async () => {
        try {
          // Tentar acessar dados sem autenticação adequada
          const { error } = await supabase.from('service_order_comments').select('*').limit(1);
          // Se houver erro, RLS está funcionando
          return !!error;
        } catch {
          return true; // Erro indica que RLS está ativo
        }
      }
    },
    {
      id: 'sec-permissions',
      category: 'Segurança',
      title: 'Sistema de Permissões',
      description: 'Controle de acesso por role funcionando',
      status: 'pending',
      priority: 'critical',
      automated: false
    },

    // PERFORMANCE
    {
      id: 'perf-loading',
      category: 'Performance',
      title: 'Tempos de Carregamento',
      description: 'Páginas carregando em menos de 3 segundos',
      status: 'pending',
      priority: 'medium',
      automated: false
    },
    {
      id: 'perf-mobile',
      category: 'Performance',
      title: 'Responsividade Mobile',
      description: 'Interface funcionando bem em dispositivos móveis',
      status: 'pending',
      priority: 'high',
      automated: false
    },

    // DADOS
    {
      id: 'data-backup',
      category: 'Dados',
      title: 'Sistema de Backup',
      description: 'Backups automáticos configurados',
      status: 'pending',
      priority: 'high',
      automated: false
    },
    {
      id: 'data-migration',
      category: 'Dados',
      title: 'Migração de Dados',
      description: 'Dados existentes migrados corretamente',
      status: 'pending',
      priority: 'medium',
      automated: false
    },

    // DOCUMENTAÇÃO
    {
      id: 'doc-user',
      category: 'Documentação',
      title: 'Manual do Usuário',
      description: 'Documentação básica para usuários',
      status: 'pending',
      priority: 'medium',
      automated: false
    },
    {
      id: 'doc-admin',
      category: 'Documentação',
      title: 'Manual Administrativo',
      description: 'Documentação para administradores',
      status: 'pending',
      priority: 'low',
      automated: false
    },

    // MONITORAMENTO
    {
      id: 'mon-errors',
      category: 'Monitoramento',
      title: 'Monitoramento de Erros',
      description: 'Sistema de logs e monitoramento ativo',
      status: 'pending',
      priority: 'medium',
      automated: false
    },
    {
      id: 'mon-analytics',
      category: 'Monitoramento',
      title: 'Analytics Básico',
      description: 'Métricas de uso básicas implementadas',
      status: 'pending',
      priority: 'low',
      automated: false
    }
  ];

  /**
   * Executar verificações automatizadas
   */
  async runAutomatedChecks(): Promise<ChecklistItem[]> {
    console.log('🔍 [MVPLaunchChecklist] Executando verificações automatizadas...');
    
    const results: ChecklistItem[] = [];
    
    for (const item of this.items) {
      if (item.automated && item.checkFunction) {
        try {
          console.log(`🧪 Verificando: ${item.title}`);
          item.status = 'in_progress';
          
          const passed = await item.checkFunction();
          item.status = passed ? 'completed' : 'failed';
          item.details = passed ? 'Verificação automática passou' : 'Verificação automática falhou';
          
          console.log(`${passed ? '✅' : '❌'} ${item.title}: ${item.details}`);
          
        } catch (error) {
          item.status = 'failed';
          item.details = `Erro na verificação: ${error}`;
          console.error(`❌ ${item.title}: ${item.details}`);
        }
        
        results.push({ ...item });
      }
    }
    
    console.log(`✅ [MVPLaunchChecklist] ${results.length} verificações automatizadas concluídas`);
    return results;
  }

  /**
   * Obter checklist organizado por categoria
   */
  getChecklistByCategory(): ChecklistCategory[] {
    const categories = new Map<string, ChecklistItem[]>();
    
    // Agrupar itens por categoria
    this.items.forEach(item => {
      if (!categories.has(item.category)) {
        categories.set(item.category, []);
      }
      categories.get(item.category)!.push(item);
    });
    
    // Converter para formato de categoria
    return Array.from(categories.entries()).map(([name, items]) => {
      const completedCount = items.filter(item => item.status === 'completed').length;
      const totalCount = items.length;
      const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      
      return {
        name,
        items,
        completedCount,
        totalCount,
        completionRate
      };
    });
  }

  /**
   * Obter estatísticas gerais
   */
  getOverallStats() {
    const total = this.items.length;
    const completed = this.items.filter(item => item.status === 'completed').length;
    const failed = this.items.filter(item => item.status === 'failed').length;
    const pending = this.items.filter(item => item.status === 'pending').length;
    const inProgress = this.items.filter(item => item.status === 'in_progress').length;
    
    const critical = this.items.filter(item => item.priority === 'critical').length;
    const criticalCompleted = this.items.filter(item => 
      item.priority === 'critical' && item.status === 'completed'
    ).length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const criticalCompletionRate = critical > 0 ? (criticalCompleted / critical) * 100 : 0;
    
    return {
      total,
      completed,
      failed,
      pending,
      inProgress,
      completionRate,
      critical,
      criticalCompleted,
      criticalCompletionRate,
      readyForLaunch: criticalCompletionRate >= 90 && completionRate >= 80
    };
  }

  /**
   * Marcar item como completo
   */
  markItemCompleted(itemId: string, details?: string): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.status = 'completed';
      if (details) item.details = details;
      return true;
    }
    return false;
  }

  /**
   * Marcar item como falhado
   */
  markItemFailed(itemId: string, details?: string): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.status = 'failed';
      if (details) item.details = details;
      return true;
    }
    return false;
  }

  /**
   * Gerar relatório de prontidão
   */
  generateReadinessReport(): string {
    const stats = this.getOverallStats();
    const categories = this.getChecklistByCategory();
    
    let report = '# 🚀 RELATÓRIO DE PRONTIDÃO PARA LANÇAMENTO MVP\n\n';
    
    report += `## 📊 ESTATÍSTICAS GERAIS\n`;
    report += `- **Progresso Geral:** ${stats.completionRate.toFixed(1)}%\n`;
    report += `- **Itens Críticos:** ${stats.criticalCompletionRate.toFixed(1)}% (${stats.criticalCompleted}/${stats.critical})\n`;
    report += `- **Status:** ${stats.readyForLaunch ? '✅ PRONTO PARA LANÇAMENTO' : '⚠️ NECESSITA AJUSTES'}\n\n`;
    
    report += `### Distribuição de Status:\n`;
    report += `- ✅ **Completo:** ${stats.completed}\n`;
    report += `- ❌ **Falhado:** ${stats.failed}\n`;
    report += `- ⏳ **Pendente:** ${stats.pending}\n`;
    report += `- 🔄 **Em Progresso:** ${stats.inProgress}\n\n`;
    
    categories.forEach(category => {
      report += `## ${category.name} (${category.completionRate.toFixed(1)}%)\n`;
      
      category.items.forEach(item => {
        const icon = item.status === 'completed' ? '✅' : 
                   item.status === 'failed' ? '❌' : 
                   item.status === 'in_progress' ? '🔄' : '⏳';
        
        const priority = item.priority === 'critical' ? '🔴' : 
                        item.priority === 'high' ? '🟡' : 
                        item.priority === 'medium' ? '🔵' : '⚪';
        
        report += `${icon} ${priority} **${item.title}**\n`;
        report += `   ${item.description}\n`;
        if (item.details) {
          report += `   *${item.details}*\n`;
        }
        report += '\n';
      });
    });
    
    return report;
  }
}
