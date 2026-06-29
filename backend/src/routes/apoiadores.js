const router = require('express').Router();
const {
  list, getById, create, update, remove, listCidades, createPublic, approve, alterarTipo,
} = require('../controllers/apoiadorController');
const { authenticate } = require('../middleware/auth');
const { requireRole, ownResourceOnly, requirePermission } = require('../middleware/rbac');
const { validate, apoiadorSchema, apoiadorUpdateSchema } = require('../middleware/validate');

// Rota pública de cadastro de simpatizantes (indicação) — sem autenticação
router.post('/publico', createPublic);

// Todas as outras rotas exigem autenticação
router.use(authenticate);

// GET /api/apoiadores/cidades — lista cidades para filtros (todos os roles)
router.get('/cidades', listCidades);

// GET /api/apoiadores — todos os roles (multiplicador filtrado automaticamente)
router.get(
  '/',
  requirePermission('Apoiadores', 'visualizar'),
  ownResourceOnly,
  list
);

// GET /api/apoiadores/:id
router.get(
  '/:id',
  requirePermission('Apoiadores', 'visualizar'),
  ownResourceOnly,
  getById
);

// POST /api/apoiadores — todos os roles podem cadastrar
router.post(
  '/',
  requirePermission('Apoiadores', 'criar'),
  validate(apoiadorSchema),
  create
);

// PUT /api/apoiadores/:id/tipo — alterar tipo de apoiador (promover/demover) - Requer permissão de Equipe.editar!
router.put(
  '/:id/tipo',
  requirePermission('Equipe', 'editar'),
  alterarTipo
);

// PUT /api/apoiadores/:id/aprovar — aprovar cadastro pendente (Requer Apoiadores.editar)
router.put(
  '/:id/aprovar',
  requirePermission('Apoiadores', 'editar'),
  approve
);

// PUT /api/apoiadores/:id — editar apoiador
router.put(
  '/:id',
  requirePermission('Apoiadores', 'editar'),
  ownResourceOnly,
  validate(apoiadorUpdateSchema),
  update
);

// DELETE /api/apoiadores/:id — excluir apoiador
router.delete(
  '/:id',
  requirePermission('Apoiadores', 'excluir'),
  remove
);

module.exports = router;

