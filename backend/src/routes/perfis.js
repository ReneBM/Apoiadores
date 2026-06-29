const router = require('express').Router();
const { list, getById, create, update, remove } = require('../controllers/perfilController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const db = require('../config/database');

// Middleware to allow listing access profiles to users who have permission to manage Team OR Access Profiles
const canViewPerfisList = async (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  try {
    const { rows } = await db.query(
      `SELECT p.funcionalidade, p.visualizar 
       FROM users u
       JOIN perfil_permissoes p ON p.perfil_id = u.perfil_id
       WHERE u.id = $1 AND p.visualizar = true AND LOWER(p.funcionalidade) IN ('equipe', 'perfis de acesso')`,
      [req.user.id]
    );
    if (rows.length > 0) {
      return next();
    }
    return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar perfis de acesso.' });
  } catch (err) {
    next(err);
  }
};

// Todas as rotas de perfis exigem autenticação
router.use(authenticate);

// Listar perfis de acesso — disponível para selects de formulários e listagem principal
router.get('/', canViewPerfisList, list);

// Obter detalhes de um perfil de acesso
router.get('/:id', requirePermission('Perfis de Acesso', 'visualizar'), getById);

// Criar novo perfil
router.post('/', requirePermission('Perfis de Acesso', 'criar'), create);

// Atualizar perfil
router.put('/:id', requirePermission('Perfis de Acesso', 'editar'), update);

// Remover perfil
router.delete('/:id', requirePermission('Perfis de Acesso', 'excluir'), remove);

module.exports = router;
