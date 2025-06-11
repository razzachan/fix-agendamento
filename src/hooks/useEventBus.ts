import { useCallback } from 'react';

// Tipo para os eventos
type EventCallback = (data?: any) => void;

// Armazenamento global de eventos
const eventListeners: Record<string, EventCallback[]> = {};

/**
 * Hook para implementar um sistema de eventos (Event Bus)
 * Permite que componentes se comuniquem sem acoplamento direto
 */
export const useEventBus = () => {
  /**
   * Publica um evento para todos os assinantes
   * @param eventName Nome do evento
   * @param data Dados opcionais a serem enviados com o evento
   */
  const publish = useCallback((eventName: string, data?: any) => {
    console.log(`[EventBus] Publicando evento: ${eventName}`, data);
    
    if (!eventListeners[eventName]) {
      return;
    }
    
    eventListeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Erro ao executar callback para evento ${eventName}:`, error);
      }
    });
  }, []);

  /**
   * Assina um evento
   * @param eventName Nome do evento
   * @param callback Função a ser chamada quando o evento for publicado
   * @returns Função para cancelar a assinatura
   */
  const subscribe = useCallback((eventName: string, callback: EventCallback) => {
    console.log(`[EventBus] Assinando evento: ${eventName}`);
    
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = [];
    }
    
    eventListeners[eventName].push(callback);
    
    // Retorna uma função para cancelar a assinatura
    return () => {
      console.log(`[EventBus] Cancelando assinatura do evento: ${eventName}`);
      
      if (!eventListeners[eventName]) {
        return;
      }
      
      const index = eventListeners[eventName].indexOf(callback);
      if (index !== -1) {
        eventListeners[eventName].splice(index, 1);
      }
    };
  }, []);

  return {
    publish,
    subscribe
  };
};
