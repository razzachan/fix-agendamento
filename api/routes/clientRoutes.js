import express from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import clientController from '../controllers/clientController.js';

const router = express.Router();

// Obter todos os clientes
router.get('/', 
  requireAuth,
  clientController.getAllClients
);

// Obter um cliente específico
router.get('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  clientController.getClientById
);

// Criar um novo cliente
router.post('/',
  requireAuth,
  [
    body('name').isString().notEmpty(),
    body('email').isEmail().optional({ nullable: true }),
    body('phone').isString().optional({ nullable: true }),
    body('address').isString().optional({ nullable: true }),
    body('city').isString().optional({ nullable: true }),
    body('state').isString().optional({ nullable: true }),
    body('zipCode').isString().optional({ nullable: true }),
    body('cpfCnpj').isString().optional({ nullable: true })
  ],
  clientController.createClient
);

// Atualizar um cliente
router.put('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  clientController.updateClient
);

// Excluir um cliente
router.delete('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  clientController.deleteClient
);

// Buscar clientes por nome
router.get('/search/name',
  requireAuth,
  clientController.searchClientsByName
);

export default router;
