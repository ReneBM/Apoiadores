const { verifyToken } = require('../config/jwt');

/**
 * Middleware de autenticação JWT.
 * Extrai o Bearer token do header Authorization,
 * valida e injeta req.user com id, role e nome.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      nome: decoded.nome,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Faça login novamente.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

module.exports = { authenticate };
