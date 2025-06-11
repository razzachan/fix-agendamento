import express from 'express';
import { body } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import authController from '../controllers/authController.js';

const router = express.Router();

// Login
router.post('/login',
  [
    body('email').isEmail().notEmpty(),
    body('password').isString().notEmpty()
  ],
  authController.login
);

// Registro
router.post('/register',
  [
    body('email').isEmail().notEmpty(),
    body('password').isString().notEmpty().isLength({ min: 6 }),
    body('name').isString().notEmpty(),
    body('role').isIn(['admin', 'technician', 'client']).optional()
  ],
  authController.register
);

// Logout
router.post('/logout',
  requireAuth,
  authController.logout
);

// Obter usuário atual
router.get('/me',
  requireAuth,
  authController.getCurrentUser
);

// Atualizar perfil do usuário
router.put('/profile',
  requireAuth,
  authController.updateProfile
);

// Alterar senha
router.post('/change-password',
  requireAuth,
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword').isString().notEmpty().isLength({ min: 6 })
  ],
  authController.changePassword
);

// Solicitar redefinição de senha
router.post('/forgot-password',
  body('email').isEmail().notEmpty(),
  authController.forgotPassword
);

// Redefinir senha
router.post('/reset-password',
  [
    body('token').isString().notEmpty(),
    body('password').isString().notEmpty().isLength({ min: 6 })
  ],
  authController.resetPassword
);

// Criar usuário (apenas admin)
router.post('/users',
  requireAuth,
  requireAdmin,
  [
    body('email').isEmail().notEmpty(),
    body('password').isString().notEmpty().isLength({ min: 6 }),
    body('name').isString().notEmpty(),
    body('role').isIn(['admin', 'technician', 'client']).notEmpty()
  ],
  authController.createUser
);

export default router;
