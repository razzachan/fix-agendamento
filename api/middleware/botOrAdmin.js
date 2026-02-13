import { supabase } from '../config/supabase.js';

/**
 * Permite acesso via BOT_TOKEN (integrações/Claude) OU via token Supabase de um usuário admin.
 *
 * Aceita:
 * - Authorization: Bearer <token>
 * - x-bot-token: <token>
 */
export async function requireBotOrAdmin(req, res, next) {
  try {
    const botToken = String(process.env.BOT_TOKEN || '').trim();

    const authHeader = req.headers.authorization || req.headers.Authorization;
    const xBotToken = req.headers['x-bot-token'] || req.headers['X-Bot-Token'];

    let bearerToken = null;
    if (authHeader && String(authHeader).toLowerCase().startsWith('bearer ')) {
      bearerToken = String(authHeader).slice(7).trim();
    }

    // 1) Se BOT_TOKEN não está configurado, não bloqueia (comportamento compatível com botAuth)
    if (!botToken) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[requireBotOrAdmin] BOT_TOKEN ausente. Permitindo acesso temporariamente.');
      }
      return next();
    }

    // 2) Se bater BOT_TOKEN, libera
    if (bearerToken && bearerToken === botToken) return next();
    if (xBotToken && String(xBotToken).trim() === botToken) return next();

    // 3) Caso contrário, tenta validar como usuário Supabase admin
    if (!bearerToken) {
      return res.status(401).json({
        error: true,
        message: 'Token não fornecido',
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(bearerToken);

    if (error || !user) {
      return res.status(401).json({
        error: true,
        message: 'Token inválido ou expirado',
      });
    }

    // Role may live in different places depending on how the account was created.
    // Prefer auth metadata, but fallback to DB tables used by the frontend auth layer.
    let role = user?.user_metadata?.role || user?.app_metadata?.role;

    if (role !== 'admin') {
      try {
        const userId = user.id;

        // 1) users table (some installs use this)
        const { data: usersRow } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        role = usersRow?.role || role;

        // 2) profiles table (common Supabase pattern)
        if (role !== 'admin') {
          const { data: profilesRow } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
          role = profilesRow?.role || role;
        }
      } catch (e) {
        // If lookup fails, keep original role and deny below.
        console.warn('[requireBotOrAdmin] failed to resolve role from DB:', e);
      }
    }

    if (role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'Acesso negado. Permissão de administrador necessária.',
      });
    }

    req.user = user;
    return next();
  } catch (e) {
    console.error('[requireBotOrAdmin] error:', e);
    return res.status(500).json({
      error: true,
      message: 'Erro ao processar autenticação',
    });
  }
}

export default { requireBotOrAdmin };
