import { supabase } from '@/integrations/supabase/client';
import {
  ServiceOrderComment,
  CreateCommentRequest,
  CommentFilters,
  COMMENT_CONSTANTS
} from '@/types/comments';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';
import { toast } from 'sonner';

/**
 * Serviço para gerenciar comentários das ordens de serviço
 */
export class CommentService {
  
  /**
   * Buscar comentários de uma OS
   */
  static async getCommentsByOrderId(
    serviceOrderId: string,
    userRole: string,
    filters?: CommentFilters
  ): Promise<ServiceOrderComment[]> {
    try {
      console.log(`🔍 [CommentService] Buscando comentários para OS ${serviceOrderId}`);
      
      let query = supabase
        .from('service_order_comments')
        .select(`
          id,
          service_order_id,
          user_id,
          user_name,
          user_role,
          message,
          is_internal,
          is_urgent,
          created_at,
          updated_at
        `)
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });

      // Filtrar comentários internos para clientes
      if (userRole === 'client') {
        query = query.eq('is_internal', false);
      }

      // Aplicar filtros adicionais
      if (filters?.is_internal !== undefined) {
        query = query.eq('is_internal', filters.is_internal);
      }
      
      if (filters?.is_urgent !== undefined) {
        query = query.eq('is_urgent', filters.is_urgent);
      }
      
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [CommentService] Erro ao buscar comentários:', error);
        throw error;
      }

      console.log(`✅ [CommentService] ${data?.length || 0} comentários encontrados`);
      return data || [];

    } catch (error) {
      console.error('❌ [CommentService] Erro ao buscar comentários:', error);
      throw error;
    }
  }

  /**
   * Criar novo comentário
   */
  static async createComment(
    request: CreateCommentRequest,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<ServiceOrderComment | null> {
    try {
      console.log(`📝 [CommentService] Criando comentário para OS ${request.service_order_id}`);
      
      // Validações
      if (!request.message.trim()) {
        toast.error('Mensagem não pode estar vazia');
        return null;
      }

      if (request.message.length > COMMENT_CONSTANTS.MAX_MESSAGE_LENGTH) {
        toast.error(`Mensagem muito longa (máximo ${COMMENT_CONSTANTS.MAX_MESSAGE_LENGTH} caracteres)`);
        return null;
      }

      const commentData = {
        service_order_id: request.service_order_id,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        message: request.message.trim(),
        is_internal: request.is_internal || false,
        is_urgent: request.is_urgent || false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('service_order_comments')
        .insert(commentData)
        .select()
        .single();

      if (error) {
        console.error('❌ [CommentService] Erro ao criar comentário:', error);
        throw error;
      }

      console.log(`✅ [CommentService] Comentário criado: ${data.id}`);

      // Disparar notificações
      await this.triggerCommentNotifications(data as ServiceOrderComment);

      return data as ServiceOrderComment;

    } catch (error) {
      console.error('❌ [CommentService] Erro ao criar comentário:', error);
      toast.error('Erro ao adicionar comentário');
      return null;
    }
  }

  /**
   * Atualizar comentário existente
   */
  static async updateComment(
    commentId: string,
    message: string,
    userId: string
  ): Promise<boolean> {
    try {
      console.log(`✏️ [CommentService] Atualizando comentário ${commentId}`);
      
      if (!message.trim()) {
        toast.error('Mensagem não pode estar vazia');
        return false;
      }

      const { error } = await supabase
        .from('service_order_comments')
        .update({
          message: message.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId); // Só pode editar próprios comentários

      if (error) {
        console.error('❌ [CommentService] Erro ao atualizar comentário:', error);
        throw error;
      }

      console.log(`✅ [CommentService] Comentário atualizado: ${commentId}`);
      return true;

    } catch (error) {
      console.error('❌ [CommentService] Erro ao atualizar comentário:', error);
      toast.error('Erro ao atualizar comentário');
      return false;
    }
  }

  /**
   * Deletar comentário
   */
  static async deleteComment(
    commentId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    try {
      console.log(`🗑️ [CommentService] Deletando comentário ${commentId}`);
      
      let query = supabase
        .from('service_order_comments')
        .delete()
        .eq('id', commentId);

      // Apenas admin pode deletar qualquer comentário
      if (userRole !== 'admin') {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('❌ [CommentService] Erro ao deletar comentário:', error);
        throw error;
      }

      console.log(`✅ [CommentService] Comentário deletado: ${commentId}`);
      return true;

    } catch (error) {
      console.error('❌ [CommentService] Erro ao deletar comentário:', error);
      toast.error('Erro ao deletar comentário');
      return false;
    }
  }

  /**
   * Contar comentários não lidos por OS
   */
  static async getUnreadCommentsCount(
    serviceOrderId: string,
    userId: string
  ): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('service_order_comments')
        .select('*', { count: 'exact', head: true })
        .eq('service_order_id', serviceOrderId)
        .neq('user_id', userId) // Não contar próprios comentários
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

      if (error) throw error;
      return count || 0;

    } catch (error) {
      console.error('❌ [CommentService] Erro ao contar comentários:', error);
      return 0;
    }
  }

  /**
   * Disparar notificações para comentário
   */
  private static async triggerCommentNotifications(comment: ServiceOrderComment): Promise<void> {
    try {
      console.log(`🔔 [CommentService] Disparando notificações para comentário: ${comment.id}`);

      // Buscar dados da ordem de serviço
      const { data: order } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', comment.service_order_id)
        .single();

      if (!order) {
        console.warn(`⚠️ [CommentService] Ordem de serviço não encontrada: ${comment.service_order_id}`);
        return;
      }

      const commentData = {
        id: comment.id,
        message: comment.message,
        user_name: comment.user_name,
        user_role: comment.user_role,
        is_internal: comment.is_internal
      };

      // Disparar notificação apropriada
      if (comment.is_urgent) {
        await notificationTriggers.onUrgentCommentAdded(order, commentData);
      } else {
        await notificationTriggers.onCommentAdded(order, commentData);
      }

    } catch (error) {
      console.error('❌ [CommentService] Erro ao disparar notificações:', error);
    }
  }

  /**
   * Buscar comentários recentes do usuário
   */
  static async getRecentCommentsByUser(
    userId: string,
    limit: number = 10
  ): Promise<ServiceOrderComment[]> {
    try {
      const { data, error } = await supabase
        .from('service_order_comments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('❌ [CommentService] Erro ao buscar comentários recentes:', error);
      return [];
    }
  }
}
