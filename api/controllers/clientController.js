import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const clientController = {
  // Listar todos os clientes
  getAllClients: async (req, res) => {
    try {
      const { page = 0, limit = 20, search = null } = req.query;
      const offset = page * limit;
      
      let query = supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (search) {
        query = query.or(`name.ilike.%${search}%, phone.ilike.%${search}%, email.ilike.%${search}%`);
      }
      
      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .limit(limit);
      
      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar clientes',
          details: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        data: data.map(client => mapClient(client)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count
        }
      });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar clientes',
        details: error.message
      });
    }
  },
  
  // Obter um cliente específico
  getClientById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({
          error: true,
          message: 'Cliente não encontrado',
          details: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        data: mapClient(data)
      });
    } catch (error) {
      console.error(`Erro ao buscar cliente ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar cliente',
        details: error.message
      });
    }
  },
  
  // Criar um novo cliente
  createClient: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const clientData = req.body;
      const id = clientData.id || uuidv4();
      const createdAt = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          id,
          name: clientData.name,
          email: clientData.email || null,
          phone: clientData.phone || null,
          cpf_cnpj: clientData.cpfCnpj || null,
          address: clientData.address || null,
          address_complement: clientData.addressComplement || null,
          address_reference: clientData.addressReference || null,
          city: clientData.city || null,
          state: clientData.state || null,
          zip_code: clientData.zipCode || null,
          notes: clientData.notes || null,
          created_at: createdAt,
          updated_at: createdAt
        })
        .select()
        .single();
      
      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar cliente',
          details: error.message
        });
      }
      
      return res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data: mapClient(data)
      });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar cliente',
        details: error.message
      });
    }
  },
  
  // Atualizar um cliente
  updateClient: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const clientData = req.body;
      const updatedAt = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('clients')
        .update({
          name: clientData.name,
          email: clientData.email || null,
          phone: clientData.phone || null,
          cpf_cnpj: clientData.cpfCnpj || null,
          address: clientData.address || null,
          address_complement: clientData.addressComplement || null,
          address_reference: clientData.addressReference || null,
          city: clientData.city || null,
          state: clientData.state || null,
          zip_code: clientData.zipCode || null,
          notes: clientData.notes || null,
          updated_at: updatedAt
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar cliente',
          details: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: mapClient(data)
      });
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar cliente',
        details: error.message
      });
    }
  },
  
  // Excluir um cliente
  deleteClient: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao excluir cliente',
          details: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Cliente excluído com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao excluir cliente ${req.params.id}:`, error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao excluir cliente',
        details: error.message
      });
    }
  },
  
  // Buscar clientes por nome
  searchClientsByName: async (req, res) => {
    try {
      const { name } = req.query;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({
          error: true,
          message: 'Nome de busca não fornecido'
        });
      }
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', `%${name}%`)
        .order('name', { ascending: true })
        .limit(20);
      
      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao buscar clientes',
          details: error.message
        });
      }
      
      return res.status(200).json({
        success: true,
        data: data.map(client => mapClient(client))
      });
    } catch (error) {
      console.error('Erro ao buscar clientes por nome:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar clientes por nome',
        details: error.message
      });
    }
  }
};

// Função auxiliar para mapear os dados do cliente
function mapClient(data) {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    cpfCnpj: data.cpf_cnpj,
    address: data.address,
    addressComplement: data.address_complement,
    addressReference: data.address_reference,
    city: data.city,
    state: data.state,
    zipCode: data.zip_code,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export default clientController;
