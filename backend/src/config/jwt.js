const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!ACCESS_SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente.');
}

/**
 * Gera um access token JWT (curta duração).
 * @param {{ id: string, role: string, nome: string }} payload
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    issuer: 'senador-valim-api',
  });

/**
 * Gera um refresh token JWT (longa duração).
 * @param {{ id: string }} payload
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    issuer: 'senador-valim-api',
  });

/**
 * Verifica e decodifica um token JWT.
 * Lança erro se inválido ou expirado.
 * @param {string} token
 */
const verifyToken = (token) =>
  jwt.verify(token, ACCESS_SECRET, { issuer: 'senador-valim-api' });

/**
 * Calcula a data de expiração do refresh token (Date object).
 * Usado para persistir no banco.
 */
const refreshTokenExpiresAt = () => {
  const days = parseInt(REFRESH_EXPIRES) || 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  refreshTokenExpiresAt,
};
