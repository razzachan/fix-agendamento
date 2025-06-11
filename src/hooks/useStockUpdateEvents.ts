import { useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar eventos de atualização de estoque
 * Permite comunicação entre componentes para atualização automática
 */

// Tipos de eventos de estoque
export type StockEventType = 
  | 'stock_consumed'
  | 'stock_replenished' 
  | 'stock_requested'
  | 'stock_updated';

export interface StockEvent {
  type: StockEventType;
  technicianId: string;
  itemCode?: string;
  quantity?: number;
  timestamp: number;
  source: string; // Componente que disparou o evento
}

// Event emitter customizado para estoque
class StockEventEmitter {
  private listeners: Map<StockEventType, Set<(event: StockEvent) => void>> = new Map();

  /**
   * Adiciona listener para um tipo de evento
   */
  on(eventType: StockEventType, callback: (event: StockEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  /**
   * Remove listener
   */
  off(eventType: StockEventType, callback: (event: StockEvent) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Dispara evento para todos os listeners
   */
  emit(event: StockEvent) {
    console.log(`🔔 [StockEvents] Disparando evento: ${event.type} por ${event.source}`);
    
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`❌ Erro ao processar evento ${event.type}:`, error);
        }
      });
    }

    // Também disparar para listeners de 'stock_updated' (evento genérico)
    if (event.type !== 'stock_updated') {
      const genericListeners = this.listeners.get('stock_updated');
      if (genericListeners) {
        genericListeners.forEach(callback => {
          try {
            callback({ ...event, type: 'stock_updated' });
          } catch (error) {
            console.error(`❌ Erro ao processar evento genérico:`, error);
          }
        });
      }
    }
  }

  /**
   * Remove todos os listeners
   */
  clear() {
    this.listeners.clear();
  }
}

// Instância global do event emitter
const stockEventEmitter = new StockEventEmitter();

/**
 * Hook para emitir eventos de estoque
 */
export function useStockEventEmitter() {
  const emitStockEvent = useCallback((
    type: StockEventType,
    technicianId: string,
    source: string,
    data?: {
      itemCode?: string;
      quantity?: number;
    }
  ) => {
    const event: StockEvent = {
      type,
      technicianId,
      itemCode: data?.itemCode,
      quantity: data?.quantity,
      timestamp: Date.now(),
      source
    };

    stockEventEmitter.emit(event);
  }, []);

  return { emitStockEvent };
}

/**
 * Hook para escutar eventos de estoque
 */
export function useStockEventListener(
  eventTypes: StockEventType | StockEventType[],
  callback: (event: StockEvent) => void,
  technicianId?: string
) {
  const wrappedCallback = useCallback((event: StockEvent) => {
    // Filtrar por técnico se especificado
    if (technicianId && event.technicianId !== technicianId) {
      return;
    }
    
    callback(event);
  }, [callback, technicianId]);

  useEffect(() => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    
    // Adicionar listeners
    types.forEach(type => {
      stockEventEmitter.on(type, wrappedCallback);
    });

    // Cleanup
    return () => {
      types.forEach(type => {
        stockEventEmitter.off(type, wrappedCallback);
      });
    };
  }, [eventTypes, wrappedCallback]);
}

/**
 * Hook para atualização automática de estoque
 * Combina emissão e escuta de eventos
 */
export function useStockAutoUpdate(
  technicianId: string,
  onStockUpdate: () => void,
  source: string = 'unknown'
) {
  const { emitStockEvent } = useStockEventEmitter();

  // Escutar eventos de atualização
  useStockEventListener(
    'stock_updated',
    useCallback((event) => {
      console.log(`🔄 [StockAutoUpdate] Evento recebido em ${source}:`, event);
      // Adicionar delay para garantir que o banco foi atualizado
      setTimeout(() => {
        onStockUpdate();
      }, 500);
    }, [onStockUpdate, source]),
    technicianId
  );

  // Função para notificar atualização
  const notifyStockUpdate = useCallback((
    type: StockEventType = 'stock_updated',
    data?: { itemCode?: string; quantity?: number }
  ) => {
    emitStockEvent(type, technicianId, source, data);
  }, [emitStockEvent, technicianId, source]);

  return { notifyStockUpdate };
}

/**
 * Hook para debug de eventos de estoque
 */
export function useStockEventDebug(enabled: boolean = false) {
  useStockEventListener(
    ['stock_consumed', 'stock_replenished', 'stock_requested', 'stock_updated'],
    useCallback((event) => {
      if (enabled) {
        console.log(`🐛 [StockEventDebug] Evento:`, event);
      }
    }, [enabled])
  );
}

export default stockEventEmitter;
