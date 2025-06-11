import React from 'react';

/**
 * Sistema de eventos para notificações em tempo real
 * Permite comunicação entre diferentes partes do sistema
 */

type NotificationEventListener = () => void;

class NotificationEventManager {
  private listeners: NotificationEventListener[] = [];

  /**
   * Adiciona um listener para eventos de notificação
   */
  addListener(listener: NotificationEventListener) {
    this.listeners.push(listener);
    
    // Retorna função para remover o listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Dispara evento para todos os listeners
   */
  emit() {
    console.log('📢 [NotificationEvents] Disparando evento para', this.listeners.length, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('❌ [NotificationEvents] Erro ao executar listener:', error);
      }
    });
  }

  /**
   * Remove todos os listeners
   */
  clear() {
    this.listeners = [];
  }
}

// Instância global
export const notificationEvents = new NotificationEventManager();

/**
 * Hook para escutar eventos de notificação
 */
export function useNotificationEvents(callback: NotificationEventListener) {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    const removeListener = notificationEvents.addListener(() => {
      callbackRef.current();
    });

    return removeListener;
  }, []);
}

/**
 * Função para disparar evento de nova notificação
 */
export function triggerNotificationUpdate() {
  console.log('⚡ [NotificationEvents] Disparando atualização de notificações');
  notificationEvents.emit();
}
