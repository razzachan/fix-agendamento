/**
 * Utility function to generate UUIDs with fallback for environments
 * where crypto.randomUUID is not available (like some mobile browsers via IP)
 */

/**
 * Generates a UUID v4 string
 * Uses crypto.randomUUID if available, otherwise falls back to a polyfill
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID failed, falling back to polyfill:', error);
    }
  }
  
  // Fallback implementation for environments without crypto.randomUUID
  return uuidv4Polyfill();
}

/**
 * Polyfill implementation of UUID v4
 * Based on RFC 4122 specification
 */
function uuidv4Polyfill(): string {
  // Use crypto.getRandomValues if available
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const array = new Uint8Array(1);
      crypto.getRandomValues(array);
      const r = array[0] % 16;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Final fallback using Math.random (less secure but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Alternative export for compatibility with existing uuid library usage
 */
export const uuidv4 = generateUUID;

/**
 * Default export
 */
export default generateUUID;
