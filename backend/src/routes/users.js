const router = require('express').Router();
const {
  list, getById, create, update, deactivate, listCoordenadores,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validate, userSchema, userUpdateSchema } = require('../middleware/validate');

// Todas as rotas exigem autenticação
router.use(authenticate);

// GET /api/users — visualizar equipe
router.get('/', requirePermission('Equipe', 'visualizar'), list);

// GET /api/users/coordenadores — lista coordenadores para select
router.get('/coordenadores', requirePermission('Equipe', 'visualizar'), listCoordenadores);

// GET /api/users/:id — visualizar integrante
router.get('/:id', requirePermission('Equipe', 'visualizar'), getById);

// POST /api/users — criar integrante
router.post('/', requirePermission('Equipe', 'criar'), validate(userSchema), create);

// PUT /api/users/:id — editar integrante
router.put('/:id', requirePermission('Equipe', 'editar'), validate(userUpdateSchema), update);

// DELETE /api/users/:id (soft delete) — desativar integrante
router.delete('/:id', requirePermission('Equipe', 'excluir'), deactivate);

module.exports = router;

