import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://hdyucwabemspehokoiks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceLogoutJoao() {
  try {
    console.log('🚨 Forçando logout e limpeza para João da oficina...');

    // 1. Verificar dados atuais do João
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'joaooficina@fixfogoes.com.br')
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar profile:', profileError);
    } else {
      console.log('🔍 Profile atual do João:', profile);
    }

    // 2. Atualizar role no profile para garantir que seja workshop
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'workshop',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'joaooficina@fixfogoes.com.br');

    if (updateError) {
      console.error('❌ Erro ao atualizar profile:', updateError);
    } else {
      console.log('✅ Profile atualizado para role: workshop');
    }

    // 3. Verificar se há sessões ativas no auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao listar usuários auth:', authError);
    } else {
      const joaoUser = authUsers.users.find(u => u.email === 'joaooficina@fixfogoes.com.br');
      if (joaoUser) {
        console.log('🔍 Usuário auth encontrado:', {
          id: joaoUser.id,
          email: joaoUser.email,
          role: joaoUser.user_metadata?.role,
          last_sign_in: joaoUser.last_sign_in_at
        });

        // Atualizar metadados do usuário
        const { error: metadataError } = await supabase.auth.admin.updateUserById(
          joaoUser.id,
          {
            user_metadata: {
              role: 'workshop',
              name: 'Oficina João'
            }
          }
        );

        if (metadataError) {
          console.error('❌ Erro ao atualizar metadados:', metadataError);
        } else {
          console.log('✅ Metadados do usuário atualizados');
        }
      }
    }

    console.log('✅ Processo de limpeza concluído!');
    console.log('');
    console.log('🎯 INSTRUÇÕES PARA O USUÁRIO:');
    console.log('1. Abra o navegador');
    console.log('2. Pressione F12 para abrir DevTools');
    console.log('3. Vá para a aba Console');
    console.log('4. Digite: localStorage.clear()');
    console.log('5. Digite: sessionStorage.clear()');
    console.log('6. Feche o navegador completamente');
    console.log('7. Abra novamente e faça login');

  } catch (error) {
    console.error('❌ Erro no processo:', error);
  }
}

forceLogoutJoao();
