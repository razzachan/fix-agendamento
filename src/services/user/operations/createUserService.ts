
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

// Update to use zip_code instead of zipCode
export const createUser = async (userData: Partial<User>): Promise<User | null> => {
  try {
    // Ensure using zip_code instead of zipCode
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          phone: userData.phone,
          address: userData.address,
          city: userData.city,
          state: userData.state,
          zip_code: userData.zip_code, // Use zip_code instead of zipCode
          avatar: userData.avatar
        }
      ])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const createUserService = { createUser };
