import { supabase } from '@/integrations/supabase/client';

export interface CustomerRating {
  id: string;
  service_order_id: string;
  technician_id: string;
  customer_id: string;
  overall_rating: number;
  punctuality_rating?: number;
  quality_rating?: number;
  communication_rating?: number;
  comment?: string;
  would_recommend: boolean;
  created_at: string;
}

export interface RatingStats {
  average_overall: number;
  average_punctuality: number;
  average_quality: number;
  average_communication: number;
  total_ratings: number;
  recommendation_rate: number;
}

/**
 * Serviço para gerenciar avaliações de clientes
 */
export class CustomerRatingService {
  /**
   * Verificar se uma ordem já foi avaliada
   */
  static async hasRating(serviceOrderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('customer_ratings')
        .select('id')
        .eq('service_order_id', serviceOrderId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao verificar avaliação:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro geral ao verificar avaliação:', error);
      return false;
    }
  }

  /**
   * Buscar avaliações de um técnico
   */
  static async getTechnicianRatings(
    technicianId: string,
    limit: number = 50
  ): Promise<CustomerRating[]> {
    try {
      const { data, error } = await supabase
        .from('customer_ratings')
        .select('*')
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar avaliações do técnico:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro geral ao buscar avaliações:', error);
      return [];
    }
  }

  /**
   * Calcular estatísticas de avaliação de um técnico
   */
  static async getTechnicianStats(technicianId: string): Promise<RatingStats> {
    try {
      const ratings = await this.getTechnicianRatings(technicianId, 1000);

      if (ratings.length === 0) {
        return {
          average_overall: 0,
          average_punctuality: 0,
          average_quality: 0,
          average_communication: 0,
          total_ratings: 0,
          recommendation_rate: 0
        };
      }

      const stats = ratings.reduce((acc, rating) => {
        acc.overall += rating.overall_rating;
        if (rating.punctuality_rating) acc.punctuality += rating.punctuality_rating;
        if (rating.quality_rating) acc.quality += rating.quality_rating;
        if (rating.communication_rating) acc.communication += rating.communication_rating;
        if (rating.would_recommend) acc.recommendations++;
        return acc;
      }, {
        overall: 0,
        punctuality: 0,
        quality: 0,
        communication: 0,
        recommendations: 0
      });

      const punctualityCount = ratings.filter(r => r.punctuality_rating).length;
      const qualityCount = ratings.filter(r => r.quality_rating).length;
      const communicationCount = ratings.filter(r => r.communication_rating).length;

      return {
        average_overall: Number((stats.overall / ratings.length).toFixed(1)),
        average_punctuality: punctualityCount > 0 ? Number((stats.punctuality / punctualityCount).toFixed(1)) : 0,
        average_quality: qualityCount > 0 ? Number((stats.quality / qualityCount).toFixed(1)) : 0,
        average_communication: communicationCount > 0 ? Number((stats.communication / communicationCount).toFixed(1)) : 0,
        total_ratings: ratings.length,
        recommendation_rate: Number(((stats.recommendations / ratings.length) * 100).toFixed(1))
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        average_overall: 0,
        average_punctuality: 0,
        average_quality: 0,
        average_communication: 0,
        total_ratings: 0,
        recommendation_rate: 0
      };
    }
  }

  /**
   * Buscar avaliações recentes (para dashboard)
   */
  static async getRecentRatings(limit: number = 10): Promise<CustomerRating[]> {
    try {
      const { data, error } = await supabase
        .from('customer_ratings')
        .select(`
          *,
          service_orders!inner(
            id,
            equipment_type,
            equipment_model
          ),
          technician:users!customer_ratings_technician_id_fkey(
            id,
            name
          ),
          customer:users!customer_ratings_customer_id_fkey(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar avaliações recentes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro geral ao buscar avaliações recentes:', error);
      return [];
    }
  }

  /**
   * Disparar solicitação de avaliação (via notificação)
   */
  static async requestRating(serviceOrderId: string): Promise<boolean> {
    try {
      // Buscar dados da ordem (incluindo telefone para ClienteChat)
      const { data: order, error: orderError } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_name,
          client_phone,
          equipment_type,
          equipment_model,
          technician_id,
          customer_id,
          technician:users!service_orders_technician_id_fkey(name)
        `)
        .eq('id', serviceOrderId)
        .single();

      if (orderError || !order) {
        console.error('Erro ao buscar ordem para avaliação:', orderError);
        return false;
      }

      // Verificar se já foi avaliada
      const hasRating = await this.hasRating(serviceOrderId);
      if (hasRating) {
        console.log('Ordem já foi avaliada, não enviando solicitação');
        return true;
      }

      // Criar notificação para o cliente
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: order.customer_id,
          title: 'Avalie nosso serviço',
          message: `Como foi o atendimento do técnico ${order.technician?.name} para seu ${order.equipment_type}?`,
          type: 'rating_request',
          data: {
            service_order_id: serviceOrderId,
            technician_id: order.technician_id,
            technician_name: order.technician?.name,
            equipment_type: order.equipment_type,
            equipment_model: order.equipment_model
          }
        });

      if (notificationError) {
        console.error('Erro ao criar notificação de avaliação:', notificationError);
        return false;
      }

      // 🤖 INTEGRAÇÃO CLIENTECHAT: Disparar avaliação via middleware
      try {
        console.log('🤖 [CustomerRatingService] Disparando avaliação via ClienteChat...');

        const middlewareResponse = await fetch('https://fix-agendamento-production.up.railway.app/solicitar-avaliacao-google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            os_numero: order.order_number || `#${serviceOrderId.slice(-3).padStart(3, '0')}`, // Usar order_number real
            cliente_nome: order.client_name,
            telefone: order.client_phone || '',
          })
        });

        if (middlewareResponse.ok) {
          const middlewareData = await middlewareResponse.json();
          console.log('✅ [CustomerRatingService] Avaliação ClienteChat enviada:', middlewareData.message?.substring(0, 100) + '...');
        } else {
          console.warn('⚠️ [CustomerRatingService] Falha ao enviar via ClienteChat (continuando)');
        }
      } catch (middlewareError) {
        console.warn('⚠️ [CustomerRatingService] Erro ao chamar middleware (continuando):', middlewareError);
        // Não falhar se middleware não responder
      }

      console.log('✅ Solicitação de avaliação enviada para ordem:', serviceOrderId);
      return true;
    } catch (error) {
      console.error('Erro geral ao solicitar avaliação:', error);
      return false;
    }
  }

  /**
   * Buscar estatísticas gerais da empresa
   */
  static async getCompanyStats(): Promise<RatingStats> {
    try {
      const { data, error } = await supabase
        .from('customer_ratings')
        .select('*');

      if (error) {
        console.error('Erro ao buscar estatísticas da empresa:', error);
        return {
          average_overall: 0,
          average_punctuality: 0,
          average_quality: 0,
          average_communication: 0,
          total_ratings: 0,
          recommendation_rate: 0
        };
      }

      const ratings = data || [];
      if (ratings.length === 0) {
        return {
          average_overall: 0,
          average_punctuality: 0,
          average_quality: 0,
          average_communication: 0,
          total_ratings: 0,
          recommendation_rate: 0
        };
      }

      const stats = ratings.reduce((acc, rating) => {
        acc.overall += rating.overall_rating;
        if (rating.punctuality_rating) acc.punctuality += rating.punctuality_rating;
        if (rating.quality_rating) acc.quality += rating.quality_rating;
        if (rating.communication_rating) acc.communication += rating.communication_rating;
        if (rating.would_recommend) acc.recommendations++;
        return acc;
      }, {
        overall: 0,
        punctuality: 0,
        quality: 0,
        communication: 0,
        recommendations: 0
      });

      const punctualityCount = ratings.filter(r => r.punctuality_rating).length;
      const qualityCount = ratings.filter(r => r.quality_rating).length;
      const communicationCount = ratings.filter(r => r.communication_rating).length;

      return {
        average_overall: Number((stats.overall / ratings.length).toFixed(1)),
        average_punctuality: punctualityCount > 0 ? Number((stats.punctuality / punctualityCount).toFixed(1)) : 0,
        average_quality: qualityCount > 0 ? Number((stats.quality / qualityCount).toFixed(1)) : 0,
        average_communication: communicationCount > 0 ? Number((stats.communication / communicationCount).toFixed(1)) : 0,
        total_ratings: ratings.length,
        recommendation_rate: Number(((stats.recommendations / ratings.length) * 100).toFixed(1))
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas da empresa:', error);
      return {
        average_overall: 0,
        average_punctuality: 0,
        average_quality: 0,
        average_communication: 0,
        total_ratings: 0,
        recommendation_rate: 0
      };
    }
  }
}
