
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

// Fix zipCode to zip_code
export const updateUser = async (userId: string, userData: Partial<User>): Promise<User | null> => {
  try {
    // Ensure using zip_code instead of zipCode
    const { data, error } = await supabase
      .from('users')
      .update({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        city: userData.city, 
        state: userData.state,
        zip_code: userData.zip_code, // Use zip_code instead of zipCode
        role: userData.role,
        avatar: userData.avatar
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};

export const updateUserService = { updateUser };
