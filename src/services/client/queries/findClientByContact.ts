import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { mapClientData } from '../utils';

/**
 * Busca um cliente por telefone, email ou CPF
 * Retorna o primeiro cliente encontrado que corresponda a qualquer um dos critérios
 * 
 * @param phone Número de telefone do cliente
 * @param email Email do cliente
 * @param cpfCnpj CPF ou CNPJ do cliente
 * @returns O cliente encontrado ou null se nenhum for encontrado
 */
export async function findClientByContact(
  phone?: string | null,
  email?: string | null,
  cpfCnpj?: string | null
): Promise<Client | null> {
  try {
    if (!phone && !email && !cpfCnpj) {
      console.log('Nenhum critério de busca fornecido para findClientByContact');
      return null;
    }

    console.log(`Buscando cliente por contato: phone=${phone}, email=${email}, cpfCnpj=${cpfCnpj}`);
    
    // Construir a consulta base
    let query = supabase.from('clients').select('*');
    
    // Adicionar filtros se os valores forem fornecidos
    const filters = [];
    
    if (phone) {
      // Normalizar o telefone para comparação (remover formatação)
      const normalizedPhone = phone.replace(/\D/g, '');
      filters.push(`phone.ilike.%${normalizedPhone}%`);
    }
    
    if (email) {
      filters.push(`email.ilike.%${email}%`);
    }
    
    if (cpfCnpj) {
      // Normalizar o CPF/CNPJ para comparação (remover formatação)
      const normalizedCpfCnpj = cpfCnpj.replace(/\D/g, '');
      filters.push(`cpf_cnpj.ilike.%${normalizedCpfCnpj}%`);
    }
    
    // Aplicar os filtros com OR
    if (filters.length > 0) {
      query = query.or(filters.join(','));
    }
    
    // Executar a consulta
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar cliente por contato:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('Nenhum cliente encontrado com os critérios fornecidos');
      return null;
    }
    
    console.log(`Cliente encontrado: ${data[0].name} (ID: ${data[0].id})`);
    return mapClientData(data[0]);
  } catch (error) {
    console.error('Erro ao buscar cliente por contato:', error);
    return null;
  }
}
