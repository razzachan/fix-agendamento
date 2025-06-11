
import { supabase } from '@/integrations/supabase/client';
import { Technician } from '@/types';
import { toast } from 'sonner';
import { userService } from '@/services';
import { mapTechnicianData } from './technicianDataMapper';

/**
 * Creates a technician with an associated user account
 */
export async function createTechnicianWithUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  specialties?: string[];
}): Promise<Technician | null> {
  try {
    console.log('Criando usuário com papel de técnico...');
    const user = await userService.createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'technician'
    });

    if (!user) {
      throw new Error('Falha ao criar conta de usuário para o técnico');
    }

    console.log('Usuário técnico criado com sucesso:', user.id);

    const { data: techData, error: techError } = await supabase
      .from('technicians')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        specialties: data.specialties || [],
        user_id: user.id
      })
      .select('*')
      .single();

    if (techError) {
      console.error('Erro ao criar técnico:', techError);
      throw techError;
    }
    
    console.log('Técnico criado com sucesso:', techData);
    toast.success('Técnico cadastrado com sucesso!');
    
    return mapTechnicianData(techData);
  } catch (error) {
    console.error('Erro ao criar técnico com usuário:', error);
    throw error;
  }
}
