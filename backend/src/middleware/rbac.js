const db = require('../config/database');

/**
 * Middleware de Controle de Acesso por Role (RBAC).
 *
 * Hierarquia:
 *   admin > coordenador > multiplicador
 *
 * Uso: router.get('/rota', authenticate, requireRole('admin', 'coordenador'), handler)
 *
 * @param {...string} roles — roles permitidas para acessar a rota
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acesso negado. Você não tem permissão para acessar este recurso.',
    });
  }

  next();
};

/**
 * Middleware que garante que um multiplicador só acessa
 * seus próprios recursos. Admins e coordenadores passam livremente.
 *
 * Requer que a rota defina :multiplicadorId como parâmetro,
 * ou que o controller faça a injeção do filtro via req.user.
 */
const ownResourceOnly = (req, res, next) => {
  const { role, id } = req.user;

  // Admin e coordenador enxergam tudo
  if (role === 'admin' || role === 'coordenador') {
    return next();
  }

  // Multiplicador: injeta filtro automático nos controllers
  req.filterByUserId = id;
  next();
};

/**
 * Middleware de Controle de Permissões baseadas em Perfis de Acesso.
 *
 * Uso: router.get('/apoiadores', authenticate, requirePermission('Apoiadores', 'visualizar'), handler)
 *
 * @param {string} funcionalidade — Ex: 'Apoiadores', 'Equipe', etc.
 * @param {string} acao — Ex: 'visualizar', 'criar', 'editar', 'excluir'
 */
const requirePermission = (funcionalidade, acao) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  // Administrador Geral passa por qualquer validação
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const { rows } = await db.query(
      `SELECT p.visualizar, p.criar, p.editar, p.excluir
       FROM users u
       JOIN perfil_permissoes p ON p.perfil_id = u.perfil_id
       WHERE u.id = $1 AND LOWER(p.funcionalidade) = LOWER($2)`,
      [req.user.id, funcionalidade]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error: `Acesso negado. Seu perfil de acesso não possui permissões configuradas para a funcionalidade: ${funcionalidade}.`
      });
    }

    const permission = rows[0];
    const allowed = permission[acao] === true;

    if (!allowed) {
      return res.status(403).json({
        error: `Acesso negado. Seu perfil não tem permissão de "${acao}" na funcionalidade: ${funcionalidade}.`
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireRole, ownResourceOnly, requirePermission };

