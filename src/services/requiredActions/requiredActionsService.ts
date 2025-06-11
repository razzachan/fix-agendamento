/**
 * Serviço para gerenciar ações obrigatórias nas transições de status
 */

import { supabase } from '@/integrations/supabase/client';
import { serviceOrderService } from '@/services';
import { CompletedAction, ActionData } from '@/types/requiredActions';
import { generateUUID } from '@/utils/uuid';

export interface SavedRequiredAction {
  id: string;
  serviceOrderId: string;
  actionType: string;
  fromStatus: string;
  toStatus: string;
  data: ActionData;
  skipped: boolean;
  skipReason?: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Salva as ações obrigatórias realizadas durante uma transição de status
 */
export const saveRequiredActions = async (
  serviceOrderId: string,
  fromStatus: string,
  toStatus: string,
  actions: CompletedAction[],
  technicianId: string,
  skipped: boolean = false,
  skipReason?: string
): Promise<SavedRequiredAction[]> => {
  try {
    const savedActions: SavedRequiredAction[] = [];
    
    // Se foi pulado, salvar apenas um registro indicando isso
    if (skipped) {
      const skipRecord = {
        id: crypto.randomUUID(),
        service_order_id: serviceOrderId,
        action_type: 'SKIPPED',
        from_status: fromStatus,
        to_status: toStatus,
        data: {
          type: 'skip' as any,
          value: skipReason,
          timestamp: new Date().toISOString(),
          technicianId,
          metadata: { skipped: true, reason: skipReason }
        },
        skipped: true,
        skip_reason: skipReason,
        created_by: technicianId
      };
      
      const { data, error } = await supabase
        .from('service_order_actions')
        .insert([skipRecord])
        .select()
        .single();
        
      if (error) throw error;
      
      return [{
        id: data.id,
        serviceOrderId: data.service_order_id,
        actionType: data.action_type,
        fromStatus: data.from_status,
        toStatus: data.to_status,
        data: data.data,
        skipped: data.skipped,
        skipReason: data.skip_reason,
        createdAt: data.created_at,
        createdBy: data.created_by
      }];
    }
    
    // Processar cada ação
    for (const action of actions) {
      let processedData = { ...action.data };
      
      // Se for foto, fazer upload das imagens
      if (action.actionType === 'photo' && action.data.value && Array.isArray(action.data.value)) {
        const uploadedImages = await uploadActionPhotos(
          serviceOrderId, 
          action.data.value as File[],
          `${fromStatus}_to_${toStatus}`
        );
        
        processedData.value = uploadedImages;
      }
      
      // Garantir que o technicianId está preenchido
      processedData.technicianId = technicianId;
      
      const actionRecord = {
        id: generateUUID(),
        service_order_id: serviceOrderId,
        action_type: action.actionType,
        from_status: fromStatus,
        to_status: toStatus,
        data: processedData,
        skipped: action.skipped,
        skip_reason: action.skipReason,
        created_by: technicianId
      };
      
      const { data, error } = await supabase
        .from('service_order_actions')
        .insert([actionRecord])
        .select()
        .single();
        
      if (error) throw error;
      
      savedActions.push({
        id: data.id,
        serviceOrderId: data.service_order_id,
        actionType: data.action_type,
        fromStatus: data.from_status,
        toStatus: data.to_status,
        data: data.data,
        skipped: data.skipped,
        skipReason: data.skip_reason,
        createdAt: data.created_at,
        createdBy: data.created_by
      });
    }
    
    console.log(`✅ Ações obrigatórias salvas para OS ${serviceOrderId}:`, savedActions.length);
    return savedActions;
    
  } catch (error) {
    console.error('❌ Erro ao salvar ações obrigatórias:', error);
    throw error;
  }
};

/**
 * Faz upload das fotos das ações obrigatórias
 */
const uploadActionPhotos = async (
  serviceOrderId: string, 
  photos: File[], 
  actionContext: string
): Promise<string[]> => {
  try {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileName = `${serviceOrderId}_${actionContext}_${i + 1}_${Date.now()}.${photo.name.split('.').pop()}`;
      
      // Upload para o bucket do Supabase
      const { data, error } = await supabase.storage
        .from('service_order_images')
        .upload(fileName, photo);

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('service_order_images')
        .getPublicUrl(fileName);
        
      uploadedUrls.push(urlData.publicUrl);
      
      // Salvar também na tabela de imagens da OS (para compatibilidade)
      await serviceOrderService.saveImages(serviceOrderId, [
        {
          id: generateUUID(),
          url: urlData.publicUrl,
          name: `Ação Obrigatória: ${actionContext}`
        }
      ]);
    }
    
    console.log(`📸 ${photos.length} fotos de ação obrigatória enviadas para OS ${serviceOrderId}`);
    return uploadedUrls;
    
  } catch (error) {
    console.error('❌ Erro ao fazer upload das fotos:', error);
    throw error;
  }
};

/**
 * Busca as ações obrigatórias de uma ordem de serviço
 */
export const getRequiredActionsByOrderId = async (serviceOrderId: string): Promise<SavedRequiredAction[]> => {
  try {
    const { data, error } = await supabase
      .from('service_order_actions')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    return data.map(item => ({
      id: item.id,
      serviceOrderId: item.service_order_id,
      actionType: item.action_type,
      fromStatus: item.from_status,
      toStatus: item.to_status,
      data: item.data,
      skipped: item.skipped,
      skipReason: item.skip_reason,
      createdAt: item.created_at,
      createdBy: item.created_by
    }));
    
  } catch (error) {
    console.error('❌ Erro ao buscar ações obrigatórias:', error);
    return [];
  }
};

/**
 * Busca ações obrigatórias por transição específica
 */
export const getActionsByTransition = async (
  serviceOrderId: string,
  fromStatus: string,
  toStatus: string
): Promise<SavedRequiredAction[]> => {
  try {
    const { data, error } = await supabase
      .from('service_order_actions')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .eq('from_status', fromStatus)
      .eq('to_status', toStatus)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    return data.map(item => ({
      id: item.id,
      serviceOrderId: item.service_order_id,
      actionType: item.action_type,
      fromStatus: item.from_status,
      toStatus: item.to_status,
      data: item.data,
      skipped: item.skipped,
      skipReason: item.skip_reason,
      createdAt: item.created_at,
      createdBy: item.created_by
    }));
    
  } catch (error) {
    console.error('❌ Erro ao buscar ações por transição:', error);
    return [];
  }
};
