const router = require('express').Router();
const { list, getById, create, update, remove } = require('../controllers/perfilController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Middleware para garantir acesso exclusivo ao admin
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar perfis de acesso.' });
  }
  next();
};

// Todas as rotas de perfis exigem autenticação
router.use(authenticate);

// Listar perfis de acesso — disponível para quem pode visualizar a equipe (para selects de formulários)
router.get('/', requirePermission('Equipe', 'visualizar'), list);

// Obter detalhes de um perfil de acesso
router.get('/:id', requirePermission('Equipe', 'visualizar'), getById);

// Criar novo perfil - Exclusivo Admin
router.post('/', requireAdmin, create);

// Atualizar perfil - Exclusivo Admin
router.put('/:id', requireAdmin, update);

// Remover perfil - Exclusivo Admin
router.delete('/:id', requireAdmin, remove);

module.exports = router;
