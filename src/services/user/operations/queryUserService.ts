
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

// Update to use zip_code instead of zipCode
export const fetchUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    return data as User;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

export const queryUserService = { fetchUserById, findUserByEmail };
