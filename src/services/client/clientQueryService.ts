
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { toast } from 'sonner';
import { mapClientData } from './utils';
import { findClientByContact } from './queries/findClientByContact';

export const clientQueryService = {
  async getAll(): Promise<Client[]> {
    try {
      // Use a timestamp parameter to force a fresh request
      const cacheParam = new Date().getTime().toString();
      console.log(`Buscando clientes (cache: ${cacheParam})...`);

      // First try the RPC method which bypasses RLS
      console.log('Tentando buscar clientes via função RPC...');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_all_clients');

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log(`Encontrados ${rpcData.length} clientes via RPC.`);
        return rpcData.map(client => mapClientData(client));
      }

      if (rpcError) {
        console.log('RPC não disponível ou erro:', rpcError);
      }

      // If RPC fails, try direct query with service role (if available)
      console.log('Realizando consulta direta de clientes...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        throw error;
      }

      // Add more detailed logging about the data received
      if (data) {
        console.log(`Encontrados ${data.length} clientes na consulta direta.`);

        // If we have data, map and return it
        if (data.length > 0) {
          console.log('Primeiro cliente encontrado:', data[0]);
          const mappedClients = data.map(client => mapClientData(client));
          console.log('Clientes mapeados (primeiros 3):', mappedClients.slice(0, 3));
          return mappedClients;
        } else {
          console.log('Nenhum cliente encontrado na tabela');
        }
      } else {
        console.log('Nenhum dado retornado da consulta');
      }

      // As a fallback, try fetching without any filters or sorting
      console.log('Tentando consulta alternativa sem filtros...');
      const { data: alternativeData, error: alternativeError } = await supabase
        .from('clients')
        .select('*');

      if (alternativeError) {
        console.error('Erro na consulta alternativa:', alternativeError);
      } else if (alternativeData && alternativeData.length > 0) {
        console.log(`Encontrados ${alternativeData.length} clientes na consulta alternativa.`);
        return alternativeData.map(client => mapClientData(client));
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Client | null> {
    try {
      console.log(`Buscando cliente com ID: ${id}`);

      // First try the maybeSingle direct query
      console.log('Tentando consulta direta pelo ID...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`Erro ao buscar cliente ${id} por consulta direta:`, error);
      } else if (data) {
        console.log(`Cliente encontrado por consulta direta:`, data);
        return mapClientData(data);
      } else {
        console.log(`Cliente com ID ${id} não encontrado na consulta direta`);
      }

      // If direct query fails, try the RPC approach
      console.log('Tentando buscar cliente via função RPC...');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_all_clients');

      if (rpcError) {
        console.error('Erro na consulta RPC:', rpcError);
      } else if (rpcData && rpcData.length > 0) {
        const rpcClient = rpcData.find((c: any) => c.id === id);

        if (rpcClient) {
          console.log(`Cliente encontrado via RPC:`, rpcClient);
          return mapClientData(rpcClient);
        } else {
          console.log(`Cliente com ID ${id} não encontrado nos dados RPC`);
        }
      }

      console.log(`Cliente com ID ${id} não encontrado em nenhuma consulta`);
      return null;
    } catch (error) {
      console.error(`Erro ao buscar cliente ${id}:`, error);
      return null;
    }
  },

  async getByUserId(userId: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data ? mapClientData(data) : null;
    } catch (error) {
      console.error(`Erro ao buscar cliente por userId ${userId}:`, error);
      return null;
    }
  },

  /**
   * Busca um cliente por telefone, email ou CPF/CNPJ
   */
  findByContact: findClientByContact
};
