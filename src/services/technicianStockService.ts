import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TechnicianStockItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  unit_cost: number;
  sale_price: number;
  weight_kg?: number;
  dimensions?: string;
  supplier?: string;
  is_active: boolean;
}

export interface TechnicianStock {
  id: string;
  technician_id: string;
  item_id: string;
  current_quantity: number;
  min_quantity: number;
  max_quantity: number;
  location_in_vehicle?: string;
  last_updated: string;
  item: TechnicianStockItem;
  stock_status: 'out_of_stock' | 'low_stock' | 'normal' | 'full_stock';
  total_value: number;
}

export interface StockMovement {
  id: string;
  technician_id: string;
  item_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  service_order_id?: string;
  location?: string;
  created_by: string;
  created_at: string;
  item: TechnicianStockItem;
}

export interface StockRequest {
  id: string;
  technician_id: string;
  item_id: string;
  requested_quantity: number;
  current_quantity: number;
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
  delivered_at?: string;
  notes?: string;
  item: TechnicianStockItem;
}

export interface StockAlert {
  technician_id: string;
  technician_email: string;
  code: string;
  name: string;
  category: string;
  current_quantity: number;
  min_quantity: number;
  quantity_needed: number;
  stock_status: 'out_of_stock' | 'low_stock';
  last_updated: string;
}

/**
 * Serviço para gerenciar estoque móvel dos técnicos
 */
export const technicianStockService = {
  /**
   * Buscar todos os itens disponíveis para estoque
   */
  async getAvailableItems(): Promise<TechnicianStockItem[]> {
    try {
      const { data, error } = await supabase
        .from('technician_stock_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar itens disponíveis:', error);
      toast.error('Erro ao carregar itens disponíveis.');
      return [];
    }
  },

  /**
   * Buscar estoque atual de um técnico
   */
  async getTechnicianStock(technicianId: string): Promise<TechnicianStock[]> {
    try {
      const { data, error } = await supabase
        .from('v_technician_stock_current')
        .select('*')
        .eq('technician_id', technicianId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Usar dados reais da view
      return (data || []).map(item => ({
        id: `${item.technician_id}-${item.code}`,
        technician_id: item.technician_id,
        item_id: item.code,
        current_quantity: item.current_quantity,
        min_quantity: item.min_quantity,
        max_quantity: item.max_quantity,
        location_in_vehicle: item.location_in_vehicle,
        last_updated: item.last_updated,
        stock_status: item.stock_status as any,
        total_value: parseFloat(item.total_value || '0'),
        item: {
          id: item.code,
          code: item.code,
          name: item.name,
          description: '',
          category: item.category,
          unit_cost: parseFloat(item.unit_cost || '0'),
          sale_price: parseFloat(item.sale_price || '0'),
          is_active: true
        }
      }));
    } catch (error) {
      console.error('Erro ao buscar estoque do técnico:', error);
      toast.error('Erro ao carregar estoque.');
      return [];
    }
  },

  /**
   * Buscar alertas de estoque baixo
   */
  async getStockAlerts(technicianId?: string): Promise<StockAlert[]> {
    try {
      let query = supabase.from('v_technician_stock_alerts').select('*');
      
      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error } = await query.order('stock_status', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar alertas de estoque:', error);
      toast.error('Erro ao carregar alertas.');
      return [];
    }
  },

  /**
   * Consumir item do estoque (usado durante atendimento)
   */
  async consumeStock(
    technicianId: string,
    itemCode: string,
    quantity: number,
    serviceOrderId: string,
    reason: string,
    location?: string
  ): Promise<boolean> {
    try {
      console.log('🔧 Consumindo estoque:', { technicianId, itemCode, quantity, serviceOrderId });

      // Buscar estoque atual
      const { data: currentStock, error: stockError } = await supabase
        .from('technician_stock')
        .select(`
          *,
          technician_stock_items!inner(code)
        `)
        .eq('technician_id', technicianId)
        .eq('technician_stock_items.code', itemCode)
        .single();

      if (stockError || !currentStock) {
        toast.error('Item não encontrado no estoque.');
        return false;
      }

      if (currentStock.current_quantity < quantity) {
        toast.error('Quantidade insuficiente no estoque.');
        return false;
      }

      const newQuantity = currentStock.current_quantity - quantity;

      // Atualizar estoque
      const { error: updateError } = await supabase
        .from('technician_stock')
        .update({ 
          current_quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', currentStock.id);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('technician_stock_movements')
        .insert({
          technician_id: technicianId,
          item_id: currentStock.item_id,
          movement_type: 'out',
          quantity: quantity,
          previous_quantity: currentStock.current_quantity,
          new_quantity: newQuantity,
          reason: reason,
          service_order_id: serviceOrderId === 'manual' ? null : serviceOrderId,
          location: location,
          created_by: technicianId
        });

      if (movementError) throw movementError;

      console.log('✅ Estoque consumido com sucesso');
      return true;

    } catch (error) {
      console.error('Erro ao consumir estoque:', error);
      toast.error('Erro ao consumir item do estoque.');
      return false;
    }
  },

  /**
   * Adicionar item ao estoque (reposição)
   */
  async addStock(
    technicianId: string,
    itemCode: string,
    quantity: number,
    reason: string,
    location?: string
  ): Promise<boolean> {
    try {
      console.log('📦 Adicionando ao estoque:', { technicianId, itemCode, quantity });

      // Buscar ou criar registro de estoque
      const { data: existingStock, error: stockError } = await supabase
        .from('technician_stock')
        .select(`
          *,
          technician_stock_items!inner(code)
        `)
        .eq('technician_id', technicianId)
        .eq('technician_stock_items.code', itemCode)
        .single();

      let currentQuantity = 0;
      let stockId = null;

      if (existingStock) {
        currentQuantity = existingStock.current_quantity;
        stockId = existingStock.id;
      } else {
        // Buscar item para criar novo registro
        const { data: item, error: itemError } = await supabase
          .from('technician_stock_items')
          .select('id')
          .eq('code', itemCode)
          .single();

        if (itemError || !item) {
          toast.error('Item não encontrado no catálogo.');
          return false;
        }

        // Criar novo registro de estoque
        const { data: newStock, error: createError } = await supabase
          .from('technician_stock')
          .insert({
            technician_id: technicianId,
            item_id: item.id,
            current_quantity: 0,
            min_quantity: 5, // padrão
            max_quantity: 50 // padrão
          })
          .select()
          .single();

        if (createError || !newStock) throw createError;
        stockId = newStock.id;
      }

      const newQuantity = currentQuantity + quantity;

      // Atualizar estoque
      const { error: updateError } = await supabase
        .from('technician_stock')
        .update({ 
          current_quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', stockId);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { data: item } = await supabase
        .from('technician_stock_items')
        .select('id')
        .eq('code', itemCode)
        .single();

      const { error: movementError } = await supabase
        .from('technician_stock_movements')
        .insert({
          technician_id: technicianId,
          item_id: item?.id,
          movement_type: 'in',
          quantity: quantity,
          previous_quantity: currentQuantity,
          new_quantity: newQuantity,
          reason: reason,
          location: location,
          created_by: technicianId
        });

      if (movementError) throw movementError;

      console.log('✅ Item adicionado ao estoque com sucesso');
      return true;

    } catch (error) {
      console.error('Erro ao adicionar ao estoque:', error);
      toast.error('Erro ao adicionar item ao estoque.');
      return false;
    }
  },

  /**
   * Buscar histórico de movimentações
   */
  async getMovements(technicianId: string, limit: number = 50): Promise<StockMovement[]> {
    try {
      const { data, error } = await supabase
        .from('technician_stock_movements')
        .select(`
          *,
          technician_stock_items!inner(*)
        `)
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(movement => ({
        ...movement,
        item: movement.technician_stock_items
      }));
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      toast.error('Erro ao carregar histórico.');
      return [];
    }
  },

  /**
   * Solicitar reposição de estoque
   */
  async requestRestock(
    technicianId: string,
    itemCode: string,
    requestedQuantity: number,
    reason: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<boolean> {
    try {
      // Buscar item e estoque atual
      const { data: item, error: itemError } = await supabase
        .from('technician_stock_items')
        .select('id')
        .eq('code', itemCode)
        .single();

      if (itemError || !item) {
        toast.error('Item não encontrado.');
        return false;
      }

      const { data: stock } = await supabase
        .from('technician_stock')
        .select('current_quantity')
        .eq('technician_id', technicianId)
        .eq('item_id', item.id)
        .single();

      const currentQuantity = stock?.current_quantity || 0;

      // Criar solicitação
      const { error } = await supabase
        .from('technician_stock_requests')
        .insert({
          technician_id: technicianId,
          item_id: item.id,
          requested_quantity: requestedQuantity,
          current_quantity: currentQuantity,
          reason: reason,
          priority: priority
        });

      if (error) throw error;

      toast.success('Solicitação de reposição enviada com sucesso!');
      return true;

    } catch (error) {
      console.error('Erro ao solicitar reposição:', error);
      toast.error('Erro ao enviar solicitação.');
      return false;
    }
  },

  /**
   * Verificar se técnico pode resolver problema com estoque atual
   */
  async canResolveWithCurrentStock(
    technicianId: string,
    requiredItems: { code: string; quantity: number }[]
  ): Promise<{ canResolve: boolean; missingItems: string[] }> {
    try {
      const stock = await this.getTechnicianStock(technicianId);
      const missingItems: string[] = [];

      for (const required of requiredItems) {
        const stockItem = stock.find(s => s.item.code === required.code);
        if (!stockItem || stockItem.current_quantity < required.quantity) {
          missingItems.push(required.code);
        }
      }

      return {
        canResolve: missingItems.length === 0,
        missingItems
      };
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return { canResolve: false, missingItems: [] };
    }
  }
};

export default technicianStockService;
