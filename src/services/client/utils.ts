
import { Client } from '@/types';

/**
 * Mapeia os dados do cliente do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
 * @param data Dados do cliente no formato do banco de dados
 * @returns Cliente no formato do frontend
 */
export const mapClientData = (data: any): Client => {
  const client: Client = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zip_code || null, // Mapeia zip_code para zipCode
    cpfCnpj: data.cpf_cnpj || null, // Mapeia cpf_cnpj para cpfCnpj
    addressComplement: data.address_complement || null, // Mapeia address_complement para addressComplement
    addressReference: data.address_reference || null, // Mapeia address_reference para addressReference
  };

  return client;
};
