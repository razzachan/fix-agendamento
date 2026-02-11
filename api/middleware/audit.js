export function auditLogger(req, _res, next) {
  try {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    console.log(`[audit] ${req.method} ${req.originalUrl} ip=${ip}`);
  } catch {
    // ignore logging errors
  }

  next();
}
