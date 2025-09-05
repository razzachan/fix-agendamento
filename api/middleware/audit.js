export function auditLogger(req, res, next){
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.on('finish', ()=>{
    const ms = Date.now() - start;
    const entry = { ts: new Date().toISOString(), method, url: originalUrl, status: res.statusCode, ms, ip };
    if (process.env.NODE_ENV !== 'test') console.log('[AUDIT]', JSON.stringify(entry));
  });
  next();
}

