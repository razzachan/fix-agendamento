// ===================================================================
// 🔑 VAPID KEYS PARA PUSH NOTIFICATIONS - FIX FOGÕES
// ===================================================================

/**
 * VAPID Keys para identificação do servidor de push notifications
 * 
 * Para gerar novas chaves, use:
 * npx web-push generate-vapid-keys
 * 
 * Ou online: https://vapidkeys.com/
 */

// Chaves VAPID para Fix Fogões (exemplo - substitua pelas suas)
export const VAPID_KEYS = {
  // Chave pública (pode ser exposta no frontend)
  publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLuxazjqAKVXTmS_PbkdQeeQHcgC0QwlAsTxqNTnhcE3ClShru1TQU',
  
  // Chave privada (NUNCA expor no frontend - apenas no backend)
  privateKey: 'p1XKlzQhF5GQ5i3g0DA8AP__4UVPaQVr9ZmGv8p7YeA'
};

/**
 * Configuração do VAPID para o Fix Fogões
 */
export const VAPID_CONFIG = {
  subject: 'mailto:admin@fixfogoes.com.br',
  publicKey: VAPID_KEYS.publicKey,
  // privateKey não deve estar aqui no frontend
};

/**
 * Converter chave VAPID para Uint8Array (necessário para subscription)
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verificar se as chaves VAPID são válidas
 */
export function validateVapidKeys(): boolean {
  try {
    const publicKeyArray = urlBase64ToUint8Array(VAPID_KEYS.publicKey);
    return publicKeyArray.length === 65; // Chave VAPID deve ter 65 bytes
  } catch (error) {
    console.error('❌ [VAPID] Chaves VAPID inválidas:', error);
    return false;
  }
}

/**
 * Obter configuração VAPID para o ambiente atual
 */
export function getVapidConfig() {
  const isProduction = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1' &&
                      window.location.hostname !== '192.168.0.10';

  return {
    ...VAPID_CONFIG,
    subject: isProduction 
      ? 'mailto:admin@fixfogoes.com.br'
      : 'mailto:dev@fixfogoes.com.br'
  };
}
