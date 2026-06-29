const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const FUNCIONALIDADES = require('../config/funcionalidades');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  refreshTokenExpiresAt,
} = require('../config/jwt');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = 12;

// Helper to load profile-based permissions
const loadUserPermissions = async (perfilId) => {
  const permissoes = {};
  FUNCIONALIDADES.forEach((f) => {
    permissoes[f] = { visualizar: false, criar: false, editar: false, excluir: false };
  });

  if (!perfilId) return permissoes;

  const { rows } = await db.query(
    'SELECT funcionalidade, visualizar, criar, editar, excluir FROM perfil_permissoes WHERE perfil_id = $1',
    [perfilId]
  );

  rows.forEach((r) => {
    if (permissoes[r.funcionalidade]) {
      permissoes[r.funcionalidade] = {
        visualizar: r.visualizar,
        criar: r.criar,
        editar: r.editar,
        excluir: r.excluir,
      };
    }
  });

  return permissoes;
};

// ── Login ──────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    // Busca usuário ativo
    const { rows } = await db.query(
      'SELECT id, nome, email, senha_hash, role, tipo, ativo, primeiro_acesso, perfil_id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = rows[0];

    if (!user || !user.ativo) {
      // Resposta genérica para não revelar se o e-mail existe
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Gera tokens
    const payload = { id: user.id, role: user.role, nome: user.nome };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Persiste refresh token no banco
    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), user.id, refreshToken, refreshTokenExpiresAt()]
    );

    // Busca perfil do multiplicador se necessário
    let multiplicadorId = null;
    if (user.role === 'multiplicador') {
      const { rows: mRows } = await db.query(
        'SELECT id FROM multiplicadores WHERE user_id = $1',
        [user.id]
      );
      multiplicadorId = mRows[0]?.id || null;
    }

    // Carrega as permissões do perfil
    const permissoes = await loadUserPermissions(user.perfil_id);

    logger.info(`Login bem-sucedido: ${user.email} [${user.role}]`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tipo: user.tipo,
        primeiro_acesso: user.primeiro_acesso,
        perfil_id: user.perfil_id,
        multiplicadorId,
        permissoes,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ── Refresh Token ──────────────────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token não fornecido.' });
    }

    // Verifica assinatura JWT
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
    }

    // Verifica se o token ainda existe no banco (não foi revogado)
    const { rows } = await db.query(
      `SELECT rt.id, rt.user_id, u.nome, u.role, u.tipo, u.ativo
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > now()`,
      [refreshToken]
    );

    const record = rows[0];
    if (!record || !record.ativo) {
      return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    }

    // Rotação: invalida o token antigo e gera um novo par
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [record.id]);

    const newPayload = { id: record.user_id, role: record.role, tipo: record.tipo, nome: record.nome };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken({ id: record.user_id });

    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), record.user_id, newRefreshToken, refreshTokenExpiresAt()]
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// ── Logout ─────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Logout realizado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// ── Me (perfil do usuário logado) ──────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, email, role, tipo, perfil_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = rows[0];
    const permissoes = await loadUserPermissions(user.perfil_id);

    res.json({
      ...user,
      permissoes,
    });
  } catch (err) {
    next(err);
  }
};

// ── Alterar própria senha ──────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    const { rows } = await db.query(
      'SELECT senha_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const senhaValida = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    const novoHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    await db.query(
      'UPDATE users SET senha_hash = $1, primeiro_acesso = FALSE, updated_at = now() WHERE id = $2',
      [novoHash, req.user.id]
    );

    // Invalida todos os refresh tokens do usuário ao trocar senha
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me, changePassword };
