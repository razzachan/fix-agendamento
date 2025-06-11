import { supabase } from '../config/supabase.js';

// Middleware para verificar se o usuário está autenticado
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: 'Token de autenticação não fornecido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: true,
        message: 'Token de autenticação inválido ou expirado'
      });
    }
    
    // Adicionar o usuário ao objeto de requisição
    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao processar autenticação'
    });
  }
};

// Middleware para verificar se o usuário é administrador
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.user_metadata.role !== 'admin') {
    return res.status(403).json({
      error: true,
      message: 'Acesso negado. Permissão de administrador necessária.'
    });
  }
  
  next();
};

// Middleware para verificar se o usuário é técnico
export const requireTechnician = (req, res, next) => {
  if (!req.user || (req.user.user_metadata.role !== 'technician' && req.user.user_metadata.role !== 'admin')) {
    return res.status(403).json({
      error: true,
      message: 'Acesso negado. Permissão de técnico necessária.'
    });
  }
  
  next();
};

export default { requireAuth, requireAdmin, requireTechnician };
