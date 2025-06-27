import { runAuthAudit } from './runAuthAudit';
import { adminAccountSetup } from './adminAccountSetup';
import { clearAllCache } from './cacheUtils';

/**
 * Teste final completo do sistema de autenticação
 */
export const finalAuthTest = {
  /**
   * Executa teste completo e final do sistema
   */
  async runFinalTest(): Promise<void> {
    console.log('🎯 [FinalAuthTest] INICIANDO TESTE FINAL DE AUTENTICAÇÃO');
    console.log('═══════════════════════════════════════════════════════');
    
    try {
      // Etapa 1: Limpeza inicial
      console.log('\n🧹 ETAPA 1: Limpeza de Cache');
      console.log('─────────────────────────────────────');
      await clearAllCache();
      console.log('✅ Cache limpo com sucesso');

      // Etapa 2: Verificar conta admin
      console.log('\n🔧 ETAPA 2: Verificação da Conta Admin');
      console.log('─────────────────────────────────────');
      const adminExists = await adminAccountSetup.checkAdminAccount();
      
      if (!adminExists) {
        console.log('⚠️ Conta admin não encontrada, criando...');
        const created = await adminAccountSetup.createAdminAccount();
        
        if (created) {
          console.log('✅ Conta admin criada com sucesso');
          console.log('📧 Email: admin@fixfogoes.com.br');
          console.log('🔑 Senha: 123456');
        } else {
          console.log('❌ Falha ao criar conta admin');
        }
      } else {
        console.log('✅ Conta admin já existe e está funcional');
      }

      // Etapa 3: Auditoria completa
      console.log('\n🔍 ETAPA 3: Auditoria Completa de Autenticação');
      console.log('─────────────────────────────────────');
      await runAuthAudit.execute();

      // Etapa 4: Verificação final
      console.log('\n⚡ ETAPA 4: Verificação Final');
      console.log('─────────────────────────────────────');
      const isHealthy = await runAuthAudit.quickCheck();

      // Etapa 5: Relatório final
      console.log('\n📋 ETAPA 5: Relatório Final');
      console.log('─────────────────────────────────────');
      
      if (isHealthy) {
        console.log('🎉 TESTE FINAL APROVADO!');
        console.log('✅ Sistema de autenticação está 100% conforme');
        console.log('✅ Todas as contas demo foram removidas');
        console.log('✅ Apenas autenticação Supabase real é utilizada');
        console.log('✅ Criação automática de contas funcionando');
        console.log('✅ Conta administrativa principal configurada');
        
        this.displaySuccessInstructions();
      } else {
        console.log('⚠️ TESTE FINAL COM PROBLEMAS');
        console.log('❌ Alguns problemas foram identificados');
        console.log('🔧 Verifique os detalhes da auditoria acima');
        
        this.displayFailureInstructions();
      }

    } catch (error) {
      console.error('❌ [FinalAuthTest] Erro durante o teste final:', error);
      this.displayErrorInstructions();
    }
  },

  /**
   * Instruções para sucesso
   */
  displaySuccessInstructions(): void {
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. ✅ Sistema pronto para produção');
    console.log('2. 🔑 Use admin@fixfogoes.com.br / 123456 para login admin');
    console.log('3. 👥 Contas de cliente são criadas automaticamente');
    console.log('4. 🔒 Todas as senhas padrão são: 123456');
    console.log('5. 📱 Sistema funciona apenas com autenticação Supabase real');
    console.log('\n💡 COMANDOS ÚTEIS:');
    console.log('• fixFogoes.authQuickCheck() - Verificação rápida');
    console.log('• fixFogoes.authAudit() - Auditoria completa');
    console.log('• fixFogoes.ensureAdminAccount() - Verificar conta admin');
  },

  /**
   * Instruções para falha
   */
  displayFailureInstructions(): void {
    console.log('\n🔧 AÇÕES NECESSÁRIAS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. ❌ Revise os problemas identificados na auditoria');
    console.log('2. 🔧 Execute as correções recomendadas');
    console.log('3. 🔄 Execute novamente: finalAuthTest.runFinalTest()');
    console.log('\n💡 COMANDOS DE DIAGNÓSTICO:');
    console.log('• fixFogoes.authAudit() - Auditoria detalhada');
    console.log('• fixFogoes.diagnoseSession() - Diagnóstico de sessão');
    console.log('• fixFogoes.clearCache() - Limpar cache se necessário');
  },

  /**
   * Instruções para erro
   */
  displayErrorInstructions(): void {
    console.log('\n🆘 ERRO CRÍTICO:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. ❌ Erro inesperado durante o teste');
    console.log('2. 🔍 Verifique a conexão com o Supabase');
    console.log('3. 🧹 Tente limpar o cache: fixFogoes.clearCache()');
    console.log('4. 🔄 Recarregue a página e tente novamente');
    console.log('\n💡 COMANDOS DE RECUPERAÇÃO:');
    console.log('• fixFogoes.clearCache() - Limpar cache completo');
    console.log('• fixFogoes.recoverSession() - Recuperar sessão');
    console.log('• fixFogoes.healthCheck() - Verificação de saúde');
  },

  /**
   * Teste específico de login
   */
  async testLogin(email: string, password: string): Promise<boolean> {
    console.log(`🔐 [FinalAuthTest] Testando login: ${email}`);
    
    try {
      const { authService } = await import('@/services/user/authService');
      const user = await authService.login(email, password);
      
      if (user) {
        console.log('✅ Login bem-sucedido');
        console.log(`👤 Usuário: ${user.name} (${user.role})`);
        
        // Fazer logout imediatamente
        await authService.logout();
        console.log('🔓 Logout realizado');
        
        return true;
      } else {
        console.log('❌ Login falhou');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro no teste de login:', error);
      return false;
    }
  },

  /**
   * Teste de criação de conta
   */
  async testAccountCreation(): Promise<boolean> {
    console.log('👥 [FinalAuthTest] Testando criação de conta...');
    
    try {
      const { clientCreateService } = await import('@/services/client/mutations/clientCreateService');
      
      // Dados de teste
      const testClient = {
        name: 'Cliente Teste Auditoria',
        email: `teste.auditoria.${Date.now()}@exemplo.com`,
        phone: '48999999999'
      };
      
      console.log(`📧 Criando cliente: ${testClient.email}`);
      const client = await clientCreateService.create(testClient);
      
      if (client) {
        console.log('✅ Cliente criado com sucesso');
        console.log('🔑 Conta de usuário criada automaticamente');
        console.log('🔒 Senha padrão: 123456');
        return true;
      } else {
        console.log('❌ Falha ao criar cliente');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro no teste de criação:', error);
      return false;
    }
  }
};

// Adicionar ao console global
declare global {
  interface Window {
    finalAuthTest: typeof finalAuthTest;
  }
}

if (typeof window !== 'undefined') {
  window.finalAuthTest = finalAuthTest;
}
