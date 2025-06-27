import { authenticationAudit } from './authenticationAudit';
import { adminAccountSetup } from './adminAccountSetup';

/**
 * Script para executar auditoria completa de autenticação
 */
export const runAuthAudit = {
  /**
   * Executa auditoria completa e exibe resultados
   */
  async execute(): Promise<void> {
    console.log('🚀 [RunAuthAudit] Iniciando auditoria completa de autenticação...');
    
    try {
      // 1. Executar auditoria
      const report = await authenticationAudit.runCompleteAudit();
      
      // 2. Exibir resultados no console
      console.log(report.summary);
      
      // 3. Exibir detalhes dos testes
      console.log('\n📋 DETALHES DOS TESTES:');
      console.log('═══════════════════════════════════════════');
      
      report.tests.forEach((test, index) => {
        const statusIcon = {
          'passed': '✅',
          'failed': '❌',
          'warning': '⚠️',
          'pending': '⏳'
        }[test.status];
        
        console.log(`\n${index + 1}. ${statusIcon} ${test.name} (${test.duration}ms)`);
        test.details.forEach(detail => {
          console.log(`   • ${detail}`);
        });
      });
      
      // 4. Ações recomendadas
      if (report.recommendations.length > 0) {
        console.log('\n🔧 AÇÕES RECOMENDADAS:');
        console.log('═══════════════════════════════════════════');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }
      
      // 5. Verificar se precisa criar conta admin
      if (report.recommendations.includes('Criar conta administrativa principal')) {
        console.log('\n🔧 [RunAuthAudit] Criando conta administrativa...');
        const adminCreated = await adminAccountSetup.ensureAdminAccount();
        
        if (adminCreated) {
          console.log('✅ [RunAuthAudit] Conta admin criada com sucesso!');
        } else {
          console.log('❌ [RunAuthAudit] Falha ao criar conta admin');
        }
      }
      
      // 6. Status final
      if (report.failed === 0) {
        console.log('\n🎉 [RunAuthAudit] AUDITORIA CONCLUÍDA COM SUCESSO!');
        console.log('✅ Sistema de autenticação está 100% conforme com Supabase');
      } else {
        console.log('\n⚠️ [RunAuthAudit] AUDITORIA CONCLUÍDA COM PROBLEMAS');
        console.log(`❌ ${report.failed} teste(s) falharam`);
        console.log('🔧 Corrija os problemas identificados antes de prosseguir');
      }
      
    } catch (error) {
      console.error('❌ [RunAuthAudit] Erro durante a auditoria:', error);
    }
  },

  /**
   * Executa apenas verificação rápida
   */
  async quickCheck(): Promise<boolean> {
    console.log('⚡ [RunAuthAudit] Verificação rápida de autenticação...');
    
    try {
      const report = await authenticationAudit.runCompleteAudit();
      
      const isHealthy = report.failed === 0;
      
      if (isHealthy) {
        console.log('✅ [RunAuthAudit] Sistema de autenticação saudável');
      } else {
        console.log(`❌ [RunAuthAudit] ${report.failed} problema(s) encontrado(s)`);
      }
      
      return isHealthy;
      
    } catch (error) {
      console.error('❌ [RunAuthAudit] Erro na verificação rápida:', error);
      return false;
    }
  },

  /**
   * Gera relatório em formato JSON
   */
  async generateJsonReport(): Promise<string> {
    try {
      const report = await authenticationAudit.runCompleteAudit();
      return JSON.stringify(report, null, 2);
    } catch (error) {
      console.error('❌ [RunAuthAudit] Erro ao gerar relatório JSON:', error);
      return JSON.stringify({ error: error.toString() }, null, 2);
    }
  },

  /**
   * Salva relatório em arquivo (para desenvolvimento)
   */
  async saveReport(): Promise<void> {
    try {
      const report = await this.generateJsonReport();
      
      // Em ambiente de desenvolvimento, salvar no localStorage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `auth_audit_report_${timestamp}`;
      
      localStorage.setItem(key, report);
      console.log(`📄 [RunAuthAudit] Relatório salvo em localStorage: ${key}`);
      
    } catch (error) {
      console.error('❌ [RunAuthAudit] Erro ao salvar relatório:', error);
    }
  }
};

// Adicionar ao console global para facilitar uso
declare global {
  interface Window {
    runAuthAudit: typeof runAuthAudit;
  }
}

// Disponibilizar globalmente em desenvolvimento
if (typeof window !== 'undefined') {
  window.runAuthAudit = runAuthAudit;
}
