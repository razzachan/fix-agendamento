
import { Json } from '@/integrations/supabase/types';

// Conversor de snake_case para camelCase
export const toCamelCase = <T>(obj: any): T => {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }

  return result as T;
};

// Helper to parse location from JSON
export const parseLocation = (location: Json | null): { lat: number; lng: number } | null => {
  if (!location) return null;
  
  // If it's already an object with lat and lng
  if (typeof location === 'object' && location !== null && 'lat' in location && 'lng' in location) {
    return {
      lat: Number((location as any).lat),
      lng: Number((location as any).lng)
    };
  }
  
  // If it's a string, try to parse it
  if (typeof location === 'string') {
    try {
      const parsed = JSON.parse(location);
      if (parsed && typeof parsed === 'object' && 'lat' in parsed && 'lng' in parsed) {
        return {
          lat: Number(parsed.lat),
          lng: Number(parsed.lng)
        };
      }
    } catch (e) {
      console.error('Failed to parse location:', e);
    }
  }
  
  return null;
};
