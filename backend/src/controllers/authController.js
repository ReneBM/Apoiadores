const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const FUNCIONALIDADES = require('../config/funcionalidades');
const { sendPasswordResetCodeEmail } = require('../utils/mailer');
const { enviarCodigoRecuperacao, whatsappConfigurado } = require('../utils/whatsapp');
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
      'SELECT id, nome, email, senha_hash, role, tipo, ativo, primeiro_acesso, pesquisa_concluida, perfil_id FROM users WHERE email = $1',
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

    const isPesquisaConcluida = user.pesquisa_concluida === true || user.role === 'admin' || user.role === 'coordenador';

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
        pesquisa_concluida: isPesquisaConcluida,
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

    // Payload idêntico ao do login ({ id, role, nome }) para consistência —
    // `tipo` não é lido a partir do token em nenhum lugar do backend.
    const newPayload = { id: record.user_id, role: record.role, nome: record.nome };
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
      'SELECT id, nome, email, role, tipo, perfil_id, primeiro_acesso, pesquisa_concluida, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = rows[0];
    const permissoes = await loadUserPermissions(user.perfil_id);

    const isPesquisaConcluida = user.pesquisa_concluida === true || user.role === 'admin' || user.role === 'coordenador';

    res.json({
      ...user,
      pesquisa_concluida: isPesquisaConcluida,
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

// ── Esqueci a Senha ────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { identificador } = req.body;
    if (!identificador) {
      return res.status(400).json({ error: 'Informe o e-mail cadastrado na sua conta.' });
    }

    const email = String(identificador).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }

    const { rows } = await db.query(
      'SELECT id, nome, email, telefone, ativo FROM users WHERE email = $1',
      [email]
    );

    // Mensagem única para todos os casos: não revela quais e-mails existem.
    // Cita o WhatsApp quando ele está ligado no sistema — isso é constante
    // para todo mundo, então não vaza nada sobre a conta consultada.
    const respostaGenerica = (await whatsappConfigurado())
      ? 'Se o e-mail estiver cadastrado, um código foi enviado. Confira o e-mail e o WhatsApp.'
      : 'Se o e-mail estiver cadastrado, um código foi enviado.';

    const user = rows[0];
    if (!user || !user.ativo) {
      return res.json({ message: respostaGenerica });
    }

    // Gera PIN numérico de 6 dígitos (CSPRNG)
    const pin = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await db.query(
      'UPDATE users SET reset_password_code = $1, reset_password_expires = $2 WHERE id = $3',
      [pin, expiresAt.toISOString(), user.id]
    );

    // Dois canais em paralelo: basta um chegar. Quem trocou de e-mail ainda
    // recebe pelo WhatsApp, e vice-versa.
    const [porEmail, porWhatsapp] = await Promise.all([
      sendPasswordResetCodeEmail(user.email, user.nome, pin)
        .then(() => ({ ok: true }))
        .catch((err) => ({ ok: false, erro: err.message })),
      user.telefone
        ? enviarCodigoRecuperacao(user.telefone, pin)
        : Promise.resolve({ ok: false, erro: 'Usuário sem telefone cadastrado.' }),
    ]);

    if (!porEmail.ok && !porWhatsapp.ok) {
      // Nenhum canal entregou: o usuário precisa saber, em vez de esperar por
      // um código que nunca chega. Limpa o PIN órfão.
      await db.query(
        'UPDATE users SET reset_password_code = NULL, reset_password_expires = NULL WHERE id = $1',
        [user.id]
      ).catch(() => {});
      logger.error('Falha ao enviar código de redefinição', {
        email: porEmail.erro, whatsapp: porWhatsapp.erro,
      });
      return res.status(502).json({
        error: 'Não foi possível enviar o código no momento. Tente novamente em alguns minutos ou fale com a coordenação.',
      });
    }

    if (!porEmail.ok || !porWhatsapp.ok) {
      logger.warn('Código de redefinição entregue por apenas um canal', {
        email: porEmail.ok ? 'ok' : porEmail.erro,
        whatsapp: porWhatsapp.ok ? 'ok' : porWhatsapp.erro,
      });
    }

    res.json({ message: respostaGenerica });
  } catch (err) {
    next(err);
  }
};

/**
 * Confere o PIN de redefinição.
 * Exige código armazenado não-nulo e payload com 6 dígitos: evita que uma
 * comparação entre nulos (conta sem código + `codigo: null`) passe adiante.
 * @returns {null|{status:number, error:string}} erro, ou null se válido
 */
const conferirCodigo = (user, codigo) => {
  const informado = String(codigo ?? '').trim();
  if (!user || !user.reset_password_code || !/^\d{6}$/.test(informado)) {
    return { status: 400, error: 'Código inválido.' };
  }
  if (String(user.reset_password_code) !== informado) {
    return { status: 400, error: 'Código inválido.' };
  }
  if (!user.reset_password_expires || new Date() > new Date(user.reset_password_expires)) {
    return { status: 400, error: 'Código expirado. Solicite novamente.' };
  }
  return null;
};

const verifyResetCode = async (req, res, next) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    const { rows } = await db.query(
      'SELECT id, reset_password_code, reset_password_expires FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );

    const falha = conferirCodigo(rows[0], codigo);
    if (falha) return res.status(falha.status).json({ error: falha.error });

    res.json({ success: true, message: 'Código válido.' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, codigo, novaSenha } = req.body;
    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }
    if (String(novaSenha).length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const { rows } = await db.query(
      'SELECT id, reset_password_code, reset_password_expires FROM users WHERE email = $1',
      [String(email).toLowerCase().trim()]
    );

    const user = rows[0];
    const falha = conferirCodigo(user, codigo);
    if (falha) return res.status(falha.status).json({ error: falha.error });

    const novoHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
    
    // Atualiza a senha e limpa o PIN
    await db.query(
      'UPDATE users SET senha_hash = $1, primeiro_acesso = FALSE, updated_at = now() WHERE id = $2',
      [novoHash, user.id]
    );
    await db.query(
      'UPDATE users SET reset_password_code = NULL, reset_password_expires = NULL WHERE id = $1',
      [user.id]
    );

    // Invalida sessões antigas
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

    res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me, changePassword, forgotPassword, verifyResetCode, resetPassword };
