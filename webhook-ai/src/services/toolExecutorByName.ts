import { buildQuote, getAvailability, createAppointment, cancelAppointment, getOrderStatus } from './toolsRuntime.js';
import { buildQuoteMW, getAvailabilityMW, createAppointmentMW, cancelAppointmentMW, getOrderStatusMW } from './toolsRuntimeMiddleware.js';

const USE_MIDDLEWARE = (process.env.USE_BOT_MIDDLEWARE || 'false') === 'true';

export async function tryExecuteToolByName(name: string, input: any){
  const fn = async (n: string, i: any) => {
    if (!USE_MIDDLEWARE) {
      switch (n) {
        case 'buildQuote': return await buildQuote(i); // remoto padrão
        case 'getAvailability': return await getAvailability(i);
        case 'createAppointment': return await createAppointment(i);
        case 'cancelAppointment': return await cancelAppointment(i);
        case 'getOrderStatus': return await getOrderStatus(i?.id || i);
      }
    } else {
      switch (n) {
        case 'buildQuote': return await buildQuoteMW(i); // remoto via middleware
        case 'getAvailability': return await getAvailabilityMW(i);
        case 'createAppointment': return await createAppointmentMW(i);
        case 'cancelAppointment': return await cancelAppointmentMW(i);
        case 'getOrderStatus': return await getOrderStatusMW(i?.id || i);
      }
    }
    throw new Error('Tool not found');
  };
  return await fn(name, input);
}


// Experimental: usar catálogo local para prévia de orçamento quando input.localPreview === true
export async function tryExecuteToolByNameWithLocalPreview(name: string, input: any){
  if (name !== 'buildQuote' || !input?.localPreview) return tryExecuteToolByName(name, input);
  const { buildLocalQuoteMessage } = await import('./quoteLocal.js');
  try {
    const message = buildLocalQuoteMessage(input);
    return message;
  } catch {
    return tryExecuteToolByName(name, input);
  }
}

