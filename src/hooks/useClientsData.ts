
import { useState, useEffect, useCallback } from 'react';
import { clientService } from '@/services';
import { Client } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useClientsData = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Function to fetch clients
  const fetchClients = useCallback(async (showToast = true) => {
    try {
      if (showToast) {
        setRefreshing(true);
        toast.info("Atualizando lista de clientes...");
      }
      
      console.log("Iniciando busca por clientes...");
      setIsLoading(true);
      
      // Try to get clients using the service
      const data = await clientService.getAll();
      console.log("Clientes retornados do serviço:", data);
      
      // Update state with the retrieved clients
      setClients(data);
      
      // Show appropriate toast based on result
      if (showToast) {
        if (data.length > 0) {
          toast.success(`${data.length} clientes encontrados`);
        } else {
          toast.info(`Nenhum cliente encontrado no banco de dados.`);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      if (showToast) toast.error("Erro ao carregar dados dos clientes.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm))
  );
  
  useEffect(() => {
    // Initial load
    fetchClients();
    
    // Listen for real-time updates to the clients table
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' }, 
        (payload) => {
          console.log('Real-time update received:', payload);
          // Force a complete update
          fetchClients(false);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  return {
    clients,
    filteredClients,
    isLoading,
    refreshing,
    searchTerm,
    setSearchTerm,
    fetchClients,
  };
};
