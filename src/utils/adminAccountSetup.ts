import { supabase } from '@/integrations/supabase/client';

/**
 * Utilitário para verificar e configurar a conta administrativa principal
 */
export const adminAccountSetup = {
  /**
   * Verifica se a conta admin@fixfogoes.com.br existe
   */
  async checkAdminAccount(): Promise<boolean> {
    try {
      console.log('🔍 [AdminSetup] Verificando conta admin@fixfogoes.com.br...');
      
      // Verificar na tabela users
      const { data: userExists, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', 'admin@fixfogoes.com.br')
        .eq('role', 'admin')
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('❌ [AdminSetup] Erro ao verificar usuário:', userError);
        return false;
      }

      if (userExists) {
        console.log('✅ [AdminSetup] Conta admin encontrada na tabela users:', userExists.id);
        
        // Verificar se também existe no Supabase Auth
        try {
          const { data: authSession } = await supabase.auth.signInWithPassword({
            email: 'admin@fixfogoes.com.br',
            password: '123456'
          });

          if (authSession.user) {
            console.log('✅ [AdminSetup] Conta admin funcional no Supabase Auth');
            // Fazer logout imediatamente após teste
            await supabase.auth.signOut();
            return true;
          }
        } catch (authError) {
          console.warn('⚠️ [AdminSetup] Conta existe na tabela users mas não no Auth');
        }
      }

      console.log('❌ [AdminSetup] Conta admin não encontrada ou não funcional');
      return false;
    } catch (error) {
      console.error('❌ [AdminSetup] Erro ao verificar conta admin:', error);
      return false;
    }
  },

  /**
   * Cria a conta administrativa principal
   */
  async createAdminAccount(): Promise<boolean> {
    try {
      console.log('🔧 [AdminSetup] Criando conta admin@fixfogoes.com.br...');

      // 1. Criar no Supabase Auth usando admin.createUser
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@fixfogoes.com.br',
        password: '123456789', // Senha padrão simples
        email_confirm: true,
        user_metadata: {
          name: 'Administrador Fix Fogões',
          role: 'admin'
        }
      });

      if (authError) {
        console.error('❌ [AdminSetup] Erro ao criar no Auth:', authError);
        return false;
      }

      if (!authData.user) {
        console.error('❌ [AdminSetup] Usuário não foi criado no Auth');
        return false;
      }

      console.log('✅ [AdminSetup] Usuário criado no Auth:', authData.user.id);

      // 2. Criar entrada na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: 'Administrador Fix Fogões',
          email: 'admin@fixfogoes.com.br',
          password: '123456789', // Senha padrão simples
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ [AdminSetup] Erro ao criar na tabela users:', userError);
        return false;
      }

      // 3. Criar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: 'admin@fixfogoes.com.br',
          name: 'Administrador Fix Fogões',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('⚠️ [AdminSetup] Erro ao criar perfil (não crítico):', profileError);
      }

      console.log('✅ [AdminSetup] Conta admin criada com sucesso!');
      console.log('📧 Email: admin@fixfogoes.com.br');
      console.log('🔑 Senha: 123456');
      
      return true;
    } catch (error) {
      console.error('❌ [AdminSetup] Erro ao criar conta admin:', error);
      return false;
    }
  },

  /**
   * Verifica e cria a conta admin se necessário
   */
  async ensureAdminAccount(): Promise<boolean> {
    const exists = await this.checkAdminAccount();
    
    if (exists) {
      console.log('✅ [AdminSetup] Conta admin já existe e está funcional');
      return true;
    }

    console.log('🔧 [AdminSetup] Conta admin não existe, criando...');
    return await this.createAdminAccount();
  },

  /**
   * Lista todas as contas administrativas
   */
  async listAdminAccounts(): Promise<any[]> {
    try {
      const { data: admins, error } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .eq('role', 'admin');

      if (error) {
        console.error('❌ [AdminSetup] Erro ao listar admins:', error);
        return [];
      }

      console.log('📋 [AdminSetup] Contas administrativas encontradas:', admins?.length || 0);
      admins?.forEach(admin => {
        console.log(`  - ${admin.name} (${admin.email})`);
      });

      return admins || [];
    } catch (error) {
      console.error('❌ [AdminSetup] Erro ao listar admins:', error);
      return [];
    }
  }
};
