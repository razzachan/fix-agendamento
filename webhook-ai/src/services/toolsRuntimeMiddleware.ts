import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BOT_TOKEN = process.env.BOT_TOKEN || '';

async function post(path: string, body: any) {
  const resp = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-token': BOT_TOKEN },
    body: JSON.stringify(body || {}),
  });
  if (!resp.ok) throw new Error(`Middleware call failed: ${resp.status} ${path}`);
  return await resp.json();
}

export async function buildQuoteMW(input: {
  service_type: string;
  region?: string | null;
  urgency?: string | null;
}) {
  const { result } = await post('/api/bot/tools/buildQuote', input);
  return result;
}

export async function getAvailabilityMW(params: {
  date: string;
  region?: string | null;
  service_type?: string | null;
  duration?: number;
}) {
  return await post('/api/bot/tools/getAvailability', params);
}

export async function createAppointmentMW(input: {
  client_name: string;
  start_time: string;
  end_time: string;
  address?: string;
}) {
  return await post('/api/bot/tools/createAppointment', input);
}

export async function cancelAppointmentMW(input: { id: string; reason?: string }) {
  return await post('/api/bot/tools/cancelAppointment', input);
}

export async function getOrderStatusMW(id: string) {
  return await post('/api/bot/tools/getOrderStatus', { id });
}
