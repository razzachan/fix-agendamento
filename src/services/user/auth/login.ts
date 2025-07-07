
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { saveUserSession } from './persistentSession';

/**
 * Autentica um usuário com email e senha
 */
export async function login(email: string, password: string): Promise<User | null> {
  try {
    console.log(`Tentando login para: ${email}`);

    // Special demo accounts handling
    // These accounts should work regardless of Supabase auth
    if (email === 'admin' && password === 'admin') {
      console.log('Usando conta demo de admin');
      const user = {
        id: 'admin-demo-id', // Changed to avoid UUID format errors
        name: 'Administrador',
        email: 'admin',
        role: 'admin',
        avatar: undefined,
      };

      // Salvar sessão no localStorage
      saveUserSession(user);

      return user;
    }

    // Special account for oficina demo
    if (email === 'oficina' && password === 'oficina') {
      console.log('Usando conta demo de oficina');
      const user = {
        id: 'workshop-demo-id',
        name: 'Técnico Oficina',
        email: 'oficina',
        role: 'workshop',
        avatar: undefined,
      };

      // Salvar sessão no localStorage
      saveUserSession(user);

      return user;
    }

    // Special account for technician demo
    if (email === 'pedro@eletrofix.com' && password === '1234') {
      console.log('Usando conta demo de técnico');
      const user = {
        id: '00000000-0000-0000-0000-000000000003', // UUID correto do Pedro Santos
        name: 'Pedro Santos',
        email: 'pedro@eletrofix.com',
        role: 'technician',
        avatar: undefined,
      };

      // Salvar sessão no localStorage
      saveUserSession(user);

      return user;
    }

    // Special accounts for testing
    // These accounts should try auth first but have fallbacks
    if (email === 'betonipaulo@gmail.com' && password === '1234') {
      try {
        // Try to authenticate with Supabase first
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data.user) {
          console.log('Autenticado com Supabase para betonipaulo@gmail.com');

          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user = {
            id: data.user.id,
            name: profileData?.name || 'Paulo Betoni',
            email: data.user.email || 'betonipaulo@gmail.com',
            role: profileData?.role || 'client',
            avatar: profileData?.avatar || undefined,
          };

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        } else {
          // Fallback to demo account if Supabase auth fails
          console.log('Fallback para conta demo de betonipaulo@gmail.com');
          const user = {
            id: 'user-betoni-demo-id', // Changed to avoid UUID format errors
            name: 'Paulo Betoni',
            email: 'betonipaulo@gmail.com',
            role: 'client',
            avatar: undefined,
          };

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        }
      } catch (e) {
        // Fallback to demo account if error occurs
        console.error('Erro ao autenticar betonipaulo@gmail.com, usando fallback:', e);
        const user = {
          id: 'user-betoni-demo-id', // Changed to avoid UUID format errors
          name: 'Paulo Betoni',
          email: 'betonipaulo@gmail.com',
          role: 'client',
          avatar: undefined,
        };

        // Salvar sessão no localStorage
        saveUserSession(user);

        return user;
      }
    }

    if (email === 'joaooficina@gmail.com' && password === '1234') {
      try {
        // Try to authenticate with Supabase first
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data.user) {
          console.log('Autenticado com Supabase para joaooficina@gmail.com');

          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user = {
            id: data.user.id,
            name: profileData?.name || 'João Oficina',
            email: data.user.email || 'joaooficina@gmail.com',
            role: profileData?.role || 'workshop',
            avatar: profileData?.avatar || undefined,
          };

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        } else {
          // Fallback to demo account if Supabase auth fails
          console.log('Fallback para conta demo de joaooficina@gmail.com');
          const user = {
            id: 'user-joao-demo-id',
            name: 'João Oficina',
            email: 'joaooficina@gmail.com',
            role: 'workshop',
            avatar: undefined,
          };

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        }
      } catch (e) {
        // Fallback to demo account if error occurs
        console.error('Erro ao autenticar joaooficina@gmail.com, usando fallback:', e);
        const user = {
          id: 'user-joao-demo-id',
          name: 'João Oficina',
          email: 'joaooficina@gmail.com',
          role: 'workshop',
          avatar: undefined,
        };

        // Salvar sessão no localStorage
        saveUserSession(user);

        return user;
      }
    }

    // Special account for Oficina Central created via admin panel
    if (email === 'oficina.central@eletrofix.com' && (password === '123456' || password === 'FixFogoes@2024')) {
      try {
        // Try to authenticate with Supabase first
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data.user) {
          console.log('Autenticado com Supabase para oficina.central@eletrofix.com');

          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const user = {
            id: data.user.id,
            name: profileData?.name || 'Oficina Central',
            email: data.user.email || 'oficina.central@eletrofix.com',
            role: profileData?.role || 'workshop',
            avatar: profileData?.avatar || undefined,
          };

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        } else {
          // Fallback to demo account if Supabase auth fails
          console.log('Fallback para conta demo de oficina.central@eletrofix.com');
          const user = {
            id: 'c3c3f807-03ce-406e-a0c2-c0549b804ea9', // Real ID from database
            name: 'Oficina Central',
            email: 'oficina.central@eletrofix.com',
            role: 'workshop',
            avatar: undefined,
          };

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        }
      } catch (e) {
        // Fallback to demo account if error occurs
        console.error('Erro ao autenticar oficina.central@eletrofix.com, usando fallback:', e);
        const user = {
          id: 'c3c3f807-03ce-406e-a0c2-c0549b804ea9', // Real ID from database
          name: 'Oficina Central',
          email: 'oficina.central@eletrofix.com',
          role: 'workshop',
          avatar: undefined,
        };

        // Salvar sessão no localStorage
        saveUserSession(user);

        return user;
      }
    }

    // Special account for Oficina Norte created via admin panel
    if (email === 'oficina.norte@eletrofix.com' && (password === '123456' || password === 'FixFogoes@2024')) {
      console.log('🏢 [Login] Processando login específico para Oficina Norte');
      try {
        // Try to authenticate with Supabase first
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data.user) {
          console.log('✅ [Login] Autenticado com Supabase para oficina.norte@eletrofix.com');

          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          console.log('🔍 [Login] Dados do perfil Oficina Norte:', profileData);

          const user = {
            id: data.user.id,
            name: profileData?.name || 'Oficina Norte',
            email: data.user.email || 'oficina.norte@eletrofix.com',
            role: profileData?.role || 'workshop',
            avatar: profileData?.avatar || undefined,
          };

          console.log('✅ [Login] Usuário Oficina Norte criado:', {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          });

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        } else {
          // Fallback to demo account if Supabase auth fails
          console.log('⚠️ [Login] Fallback para conta demo de oficina.norte@eletrofix.com');
          const user = {
            id: '7bf2fcd0-461e-4381-a75d-68875b6457e4', // Real ID from database
            name: 'Oficina Norte',
            email: 'oficina.norte@eletrofix.com',
            role: 'workshop',
            avatar: undefined,
          };

          console.log('✅ [Login] Usuário Oficina Norte (fallback) criado:', {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          });

          // Salvar sessão no localStorage
          saveUserSession(user);

          return user;
        }
      } catch (e) {
        // Fallback to demo account if error occurs
        console.error('❌ [Login] Erro ao autenticar oficina.norte@eletrofix.com, usando fallback:', e);
        const user = {
          id: '7bf2fcd0-461e-4381-a75d-68875b6457e4', // Real ID from database
          name: 'Oficina Norte',
          email: 'oficina.norte@eletrofix.com',
          role: 'workshop',
          avatar: undefined,
        };

        console.log('✅ [Login] Usuário Oficina Norte (erro fallback) criado:', {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        });

        // Salvar sessão no localStorage
        saveUserSession(user);

        return user;
      }
    }

    // Standard login using Supabase Authentication
    console.log(`🔍 [Login] Tentando login padrão para: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Erro ao fazer login:', error);
      return null;
    }

    if (!data.user) {
      return null;
    }

    console.log(`🔍 [Login] Login padrão bem-sucedido para: ${email}, ID: ${data.user.id}`);

    // Buscar dados do usuário na tabela profiles primeiro
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil na tabela profiles:', profileError);

      // Tentar buscar na tabela users como fallback
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar perfil na tabela users:', userError);
      } else {
        console.log('✅ [Login] Dados encontrados na tabela users:', userData);
      }
    } else {
      console.log('✅ [Login] Dados encontrados na tabela profiles:', profileData);
    }

    const user = {
      id: data.user.id,
      name: profileData?.name || data.user.user_metadata.name || 'Usuário',
      email: data.user.email || '',
      role: profileData?.role || 'client',
      avatar: profileData?.avatar || undefined,
      phone: profileData?.phone || undefined,
      address: profileData?.address || undefined,
      city: profileData?.city || undefined,
      state: profileData?.state || undefined,
      zip_code: profileData?.zip_code || undefined,
    };

    console.log('✅ [Login] Usuário final criado:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    // Limpar cache antigo se necessário
    if (email === 'admin@fixfogoes.com.br' && user.role !== 'admin') {
      console.log('🚨 [Login] Role incorreto detectado para admin, limpando cache...');
      localStorage.clear();
      sessionStorage.clear();
      // Forçar reload da página
      window.location.reload();
      return null;
    }

    // Salvar sessão no localStorage
    saveUserSession(user);

    return user;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return null;
  }
}
