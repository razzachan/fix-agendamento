export async function sendPush(params: { userId?: string; title?: string; body?: string; icon?: string }) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-send`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_KEY || '',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_KEY || ''}`
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Falha ao enviar push');
  return res.json();
}

