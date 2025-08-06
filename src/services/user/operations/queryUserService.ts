
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

// Update to use zip_code instead of zipCode
export const fetchUserById = async (userId: string): Promise<User | null> => {
  try {
    // Primeiro tentar na tabela profiles
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Se não encontrar na profiles, tentar na users como fallback
    if (error && error.code === 'PGRST116') {
      console.log(`🔍 [fetchUserById] Não encontrado em profiles, tentando users para ID: ${userId}`);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        data = userData;
        error = null;
        console.log(`✅ [fetchUserById] Encontrado em users para ID: ${userId}`);
      }
    }

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null, // Mantém o formato do banco de dados
        avatar: data.avatar || null
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    // Primeiro tentar na tabela profiles
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    // Se não encontrar na profiles, tentar na users como fallback
    if (error && error.code === 'PGRST116') {
      console.log(`🔍 [findUserByEmail] Não encontrado em profiles, tentando users para email: ${email}`);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!userError && userData) {
        data = userData;
        error = null;
        console.log(`✅ [findUserByEmail] Encontrado em users para email: ${email}`);
      }
    }

    if (error) throw error;

    return data as User;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

export const queryUserService = { fetchUserById, findUserByEmail };
