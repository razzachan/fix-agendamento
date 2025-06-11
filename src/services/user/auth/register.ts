
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
import { AuthResult, ProfileData } from './types';

/**
 * Registra um novo usuário com email e senha
 */
export async function register(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'client',
  additionalProfileData: ProfileData = {}
): Promise<AuthResult> {
  try {
    console.log(`Registrando usuário: ${name}, email: ${email}, role: ${role}`);

    let authData, authError;

    // Usar admin.createUser para todos os roles para evitar validação de email
    console.log('Usando admin.createUser para role:', role);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name,
        role,
        ...additionalProfileData
      }
    });
    authData = data;
    authError = error;

    if (authError) {
      console.error('Erro de autenticação no registro:', authError);
      throw authError;
    }

    // Verificar se o usuário foi criado com sucesso
    if (!authData.user) {
      console.error('Falha ao criar usuário: authData.user é null');
      throw new Error('Falha ao criar usuário');
    }

    console.log('Usuário registrado com sucesso no Auth, id:', authData.user.id);
    
    // Buscar o perfil do usuário que foi criado pelo trigger
    const { data: profileQueryData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil recém-criado:', profileError);
      // Não falhar completamente, o trigger pode estar atrasado
    } else {
      console.log('Perfil encontrado:', profileQueryData);
    }

    // Verificar se precisamos atualizar dados adicionais no perfil
    if (profileQueryData && (profileQueryData.role !== role || Object.keys(additionalProfileData).length > 0)) {
      const updates = {
        role,
        ...additionalProfileData
      };
      
      console.log('Atualizando perfil com dados adicionais:', updates);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authData.user.id);
        
      if (updateError) {
        console.error('Erro ao atualizar perfil com dados adicionais:', updateError);
      } else {
        console.log('Perfil atualizado com sucesso');
      }
    }

    // Se tudo deu certo, retornar o usuário formatado
    if (authData.user) {
      const user: User = {
        id: authData.user.id,
        email: authData.user.email || '',
        name: name,
        role: role,
        avatar: profileQueryData?.avatar || undefined,
        phone: profileQueryData?.phone || undefined,
        address: profileQueryData?.address || undefined,
        city: profileQueryData?.city || undefined,
        state: profileQueryData?.state || undefined,
        zip_code: profileQueryData?.zip_code || undefined,
      };
      
      console.log('Retornando usuário completo:', user);
      
      return {
        user,
        error: null
      };
    }
    
    return { user: null, error: new Error('Falha ao criar usuário') };
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return { user: null, error };
  }
}
