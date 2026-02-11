import dotenv from 'dotenv';

// Garante que variáveis de ambiente estejam carregadas em ambientes locais
dotenv.config();

// Middleware de autenticação para rotas de bot (/api/bot, /api/bot/tools, etc.)
// Aceita simultaneamente:
// - Header legado: x-bot-token: <token>
// - Header padrão: Authorization: Bearer <token>
export const botAuth = (req, res, next) => {
  try {
    const expectedToken = process.env.BOT_TOKEN || '';

    // Se não existir BOT_TOKEN configurado, não bloqueia (mas loga aviso em produção)
    if (!expectedToken) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[botAuth] BOT_TOKEN não configurado. Permitindo acesso temporariamente.');
      }
      return next();
    }

    const headerToken = extractTokenFromHeaders(req.headers);

    if (!headerToken || headerToken !== expectedToken) {
      return res.status(401).json({
        ok: false,
        error: 'bot_unauthorized',
        message: 'Token de bot inválido ou ausente',
      });
    }

    return next();
  } catch (err) {
    console.error('[botAuth] erro inesperado', err);
    return res.status(500).json({
      ok: false,
      error: 'bot_auth_error',
      message: 'Erro interno na autenticação do bot',
    });
  }
};

function extractTokenFromHeaders(headers = {}) {
  // Header legado usado pelo sistema atual
  const xBotToken = headers['x-bot-token'] || headers['X-Bot-Token'];
  if (typeof xBotToken === 'string' && xBotToken.trim()) {
    return xBotToken.trim();
  }

  // Novo padrão: Authorization: Bearer <token>
  const auth = headers.authorization || headers.Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }

  return null;
}

export default { botAuth };
