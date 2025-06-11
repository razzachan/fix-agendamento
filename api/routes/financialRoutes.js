import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import financialController from '../controllers/financialController.js';

const router = express.Router();

// Obter todas as transações financeiras
router.get('/', 
  requireAuth,
  requireAdmin,
  financialController.getAllTransactions
);

// Obter uma transação financeira específica
router.get('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  financialController.getTransactionById
);

// Obter transações por ordem de serviço
router.get('/service-order/:serviceOrderId',
  requireAuth,
  param('serviceOrderId').isString().notEmpty(),
  financialController.getTransactionsByServiceOrderId
);

// Obter transações por tipo (receita/despesa)
router.get('/type/:type',
  requireAuth,
  requireAdmin,
  param('type').isIn(['income', 'expense']),
  financialController.getTransactionsByType
);

// Obter transações por status de pagamento
router.get('/status/:status',
  requireAuth,
  requireAdmin,
  param('status').isIn(['paid', 'pending', 'overdue']),
  financialController.getTransactionsByStatus
);

// Criar uma nova transação financeira
router.post('/',
  requireAuth,
  requireAdmin,
  [
    body('description').isString().notEmpty(),
    body('amount').isNumeric().notEmpty(),
    body('type').isIn(['income', 'expense']).notEmpty(),
    body('category').isString().notEmpty(),
    body('date').isISO8601().notEmpty(),
    body('paidStatus').isIn(['paid', 'pending', 'overdue']).notEmpty(),
    body('serviceOrderId').isString().optional({ nullable: true })
  ],
  financialController.createTransaction
);

// Atualizar uma transação financeira
router.put('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  financialController.updateTransaction
);

// Excluir uma transação financeira
router.delete('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  financialController.deleteTransaction
);

// Atualizar status de pagamento de uma transação
router.patch('/:id/status',
  requireAuth,
  requireAdmin,
  [
    param('id').isString().notEmpty(),
    body('paidStatus').isIn(['paid', 'pending', 'overdue']).notEmpty()
  ],
  financialController.updateTransactionStatus
);

// Obter resumo financeiro
router.get('/summary/overview',
  requireAuth,
  requireAdmin,
  financialController.getFinancialSummary
);

export default router;
