const router = require('express').Router();
const {
  list, getById, create, update, remove, listCidades, createPublic, approve, alterarTipo,
} = require('../controllers/apoiadorController');
const { authenticate } = require('../middleware/auth');
const { requireRole, ownResourceOnly, requirePermission } = require('../middleware/rbac');
const { validate, apoiadorSchema, apoiadorUpdateSchema } = require('../middleware/validate');
const db = require('../config/database');

// Rota pública de cadastro de simpatizantes (indicação) — sem autenticação
router.post('/publico', createPublic);

// Middleware to allow viewing supporters to users who have permission to manage supporters OR approvals
const canViewApoiadoresList = async (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  try {
    const { rows } = await db.query(
      `SELECT p.funcionalidade, p.visualizar 
       FROM users u
       JOIN perfil_permissoes p ON p.perfil_id = u.perfil_id
       WHERE u.id = $1 AND p.visualizar = true AND LOWER(p.funcionalidade) IN ('apoiadores', 'apoiadores - aprovar cadastros')`,
      [req.user.id]
    );
    if (rows.length > 0) {
      return next();
    }
    return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar apoiadores.' });
  } catch (err) {
    next(err);
  }
};

// Todas as outras rotas exigem autenticação
router.use(authenticate);

// GET /api/apoiadores/cidades — lista cidades para filtros (todos os roles)
router.get('/cidades', listCidades);

// GET /api/apoiadores — todos os roles (multiplicador filtrado automaticamente)
router.get(
  '/',
  canViewApoiadoresList,
  ownResourceOnly,
  list
);

// GET /api/apoiadores/:id
router.get(
  '/:id',
  canViewApoiadoresList,
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

// PUT /api/apoiadores/:id/aprovar — aprovar cadastro pendente (Requer Apoiadores - Aprovar Cadastros.editar)
router.put(
  '/:id/aprovar',
  requirePermission('Apoiadores - Aprovar Cadastros', 'editar'),
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

