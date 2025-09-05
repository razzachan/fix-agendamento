export function botAuth(req, res, next) {
  const token = req.headers['x-bot-token'];
  const expected = process.env.BOT_TOKEN;
  if (!expected) {
    // If token not configured, default to allow but warn (dev convenience)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[botAuth] BOT_TOKEN not set. Allowing request in non-production.');
      return next();
    }
    return res.status(500).json({ ok:false, error:'bot_token_not_configured' });
  }
  if (!token || token !== expected) {
    return res.status(401).json({ ok:false, error:'unauthorized_bot' });
  }
  return next();
}

