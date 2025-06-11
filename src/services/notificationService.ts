
// Fix the function on line 70 to use userId instead of user_id
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types';

// Link do Google Reviews da EletroFix Hub Pro
export const GOOGLE_REVIEWS_LINK = 'https://g.page/r/CfjiXeK7gOSLEAg/review';

export const createNotification = async (notification: Omit<Notification, 'id' | 'time' | 'read'>) => {
  try {
    // Ensure userId is used instead of user_id
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: notification.title,
        description: notification.description,
        type: notification.type || 'info',
        user_id: notification.userId, // Use user_id to match database column
        time: new Date().toISOString(),
        read: false
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in createNotification:', err);
    return null;
  }
};

// Add exports for other notification service functions
export const getAll = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('time', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro ao buscar notificações:', err);
    return [];
  }
};

export const markAsRead = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
      
    return !error;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return false;
  }
};

export const markAllAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    return !error;
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return false;
  }
};

export const deleteAllNotifications = async (userId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ [notificationService] Deletando todas as notificações para usuário: ${userId}`);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (!error) {
      console.log(`✅ [notificationService] Todas as notificações deletadas com sucesso`);
      return true;
    } else {
      console.error(`❌ [notificationService] Erro ao deletar notificações:`, error);
      return false;
    }
  } catch (err) {
    console.error('❌ [notificationService] Erro ao deletar todas as notificações:', err);
    return false;
  }
};

export const subscribeToNotifications = (userId: string, callback: (notification: Notification) => void) => {
  return supabase
    .channel('notification-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, payload => {
      const newNotification = payload.new as Notification;
      callback(newNotification);
    })
    .subscribe();
};

/**
 * Envia SMS para o cliente
 */
export const sendSMS = async (phone: string, message: string, serviceOrderId?: string): Promise<boolean> => {
  try {
    console.log('📱 [SMS] Enviando para:', phone);
    console.log('📱 [SMS] Mensagem:', message);

    // TODO: Integrar com provedor de SMS (Twilio, AWS SNS, etc.)
    // Por enquanto, apenas log para demonstração

    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);
    return false;
  }
};

/**
 * Envia Email para o cliente
 */
export const sendEmail = async (email: string, subject: string, message: string, htmlContent?: string, serviceOrderId?: string): Promise<boolean> => {
  try {
    console.log('📧 [EMAIL] Enviando para:', email);
    console.log('📧 [EMAIL] Assunto:', subject);
    console.log('📧 [EMAIL] Mensagem:', message);

    // TODO: Integrar com provedor de email (SendGrid, AWS SES, etc.)
    // Por enquanto, apenas log para demonstração

    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return false;
  }
};

/**
 * Envia solicitação de avaliação Google Reviews
 */
export const sendGoogleReviewsRequest = async (
  clientName: string,
  clientPhone?: string,
  clientEmail?: string,
  serviceOrderId?: string
): Promise<boolean> => {
  try {
    const message = `Olá ${clientName}! 👋

Seu serviço foi concluído com sucesso!

🌟 Que tal avaliar nosso atendimento?
${GOOGLE_REVIEWS_LINK}

Sua opinião é muito importante para nós!

EletroFix Hub Pro
Assistência Técnica de Confiança`;

    const emailSubject = '🌟 Avalie nosso atendimento - EletroFix Hub Pro';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Olá ${clientName}! 👋</h2>

        <p>Seu serviço foi concluído com sucesso!</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #059669;">🌟 Que tal avaliar nosso atendimento?</h3>
          <p>Sua opinião é muito importante para nós e ajuda outros clientes!</p>
          <a href="${GOOGLE_REVIEWS_LINK}"
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
            ⭐ Avaliar no Google
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>EletroFix Hub Pro</strong><br>
          Assistência Técnica de Confiança
        </p>
      </div>
    `;

    let smsSuccess = true;
    let emailSuccess = true;

    // Enviar SMS se tiver telefone
    if (clientPhone) {
      smsSuccess = await sendSMS(clientPhone, message, serviceOrderId);
    }

    // Enviar Email se tiver email
    if (clientEmail) {
      emailSuccess = await sendEmail(clientEmail, emailSubject, message, htmlContent, serviceOrderId);
    }

    // Sucesso se pelo menos um canal funcionou
    return smsSuccess || emailSuccess;

  } catch (error) {
    console.error('❌ Erro ao enviar solicitação de avaliação:', error);
    return false;
  }
};

// Group all exports into a single notificationService object for consistency
export const notificationService = {
  createNotification,
  getAll,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  subscribeToNotifications,
  sendSMS,
  sendEmail,
  sendGoogleReviewsRequest
};
