const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { sendTempPasswordEmail } = require('../utils/mailer');

const BCRYPT_ROUNDS = 12;

/**
 * Gera uma senha temporária segura que passa na validação do Zod:
 * formato: Mult@XXXXXX (letra maiúscula + número + 6 chars aleatórios)
 */
function gerarSenhaTemporaria() {
  const chars = 'abcdefghijkmnopqrstuvwxyz';
  const nums  = '23456789';
  const rand  = crypto.randomBytes(6).toString('hex').slice(0, 6);
  const num   = nums[Math.floor(Math.random() * nums.length)];
  return `Mult@${num}${rand}`;
}

// ── Listar usuários ────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { role, tipo, ativo, busca, municipio, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) {
      conditions.push(`u.role = $${idx++}`);
      params.push(role);
    }
    if (tipo && tipo !== 'todos') {
      conditions.push(`u.tipo = $${idx++}`);
      params.push(tipo);
    }
    if (ativo !== undefined) {
      conditions.push(`u.ativo = $${idx++}`);
      params.push(ativo === 'true');
    }
    if (busca) {
      conditions.push(`(u.nome ILIKE $${idx} OR u.email ILIKE $${idx} OR m.telefone ILIKE $${idx})`);
      params.push(`%${busca}%`);
      idx++;
    }
    if (municipio) {
      conditions.push(`m.municipio ILIKE $${idx++}`);
      params.push(`%${municipio}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) 
       FROM users u 
       LEFT JOIN multiplicadores m ON m.user_id = u.id
       ${where}`,
      params
    );

    const limitIdx = idx++;
    const offsetIdx = idx++;
    params.push(parseInt(limit), offset);

    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.role, u.tipo, u.ativo, u.created_at, u.perfil_id,
              p.nome AS perfil_nome,
              m.id AS multiplicador_id,
              m.municipio, m.telefone, m.meta_apoiadores,
              (SELECT COUNT(*) FROM apoiadores a WHERE a.multiplicador_id = m.id AND a.status = 'ativo') AS total_apoiadores
       FROM users u
       LEFT JOIN multiplicadores m ON m.user_id = u.id
       LEFT JOIN perfis p ON p.id = u.perfil_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    res.json({
      data: rows,
      total: parseInt(countResult.rows[0]?.count || 0),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// ── Buscar usuário por ID ──────────────────────────────────────────────────
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.role, u.tipo, u.ativo, u.created_at, u.perfil_id,
              p.nome AS perfil_nome,
              m.id AS multiplicador_id, m.municipio, m.telefone,
              m.meta_apoiadores, m.coordenador_id,
              (SELECT a.id FROM apoiadores a WHERE LOWER(a.email) = LOWER(u.email) LIMIT 1) AS apoiador_id
       FROM users u
       LEFT JOIN multiplicadores m ON m.user_id = u.id
       LEFT JOIN perfis p ON p.id = u.perfil_id
       WHERE u.id = $1`,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── Criar usuário / multiplicador ──────────────────────────────────────────
const create = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      nome, email, senha, role, tipo, perfil_id,
      municipio, telefone, coordenador_id, meta_apoiadores,
    } = req.body;

    const emailNorm = email.toLowerCase().trim();

    // Verifica e-mail duplicado
    const exists = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [emailNorm]
    );
    if (exists.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    // Resolve profile details
    let finalPerfilId = perfil_id || null;
    let finalRole = role;
    let finalTipo = tipo;

    if (finalPerfilId) {
      const { rows: pRows } = await client.query('SELECT nome, base_role FROM perfis WHERE id = $1', [finalPerfilId]);
      if (pRows[0]) {
        finalRole = pRows[0].base_role;
        finalTipo = pRows[0].nome;
      }
    } else if (role) {
      if (role === 'admin') {
        finalPerfilId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
        finalTipo = 'Admin';
      } else if (role === 'coordenador') {
        finalPerfilId = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
        finalTipo = 'Supervisor';
      } else if (role === 'multiplicador') {
        finalPerfilId = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
        finalTipo = tipo || 'Operador';
      }
    }

    const isMultiplicador = finalRole === 'multiplicador';
    const senhaFinal  = isMultiplicador ? gerarSenhaTemporaria() : senha;
    const senhaHash   = await bcrypt.hash(senhaFinal, BCRYPT_ROUNDS);
    const userId      = uuidv4();

    await client.query(
      `INSERT INTO users (id, nome, email, senha_hash, role, primeiro_acesso, tipo, perfil_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, nome, emailNorm, senhaHash, finalRole, isMultiplicador, finalTipo, finalPerfilId]
    );

    // Sincroniza o tipo na tabela apoiadores se existir
    await client.query(
      "UPDATE apoiadores SET tipo = $1, updated_at = now() WHERE LOWER(email) = LOWER($2)",
      [finalTipo, emailNorm]
    );

    // Se for multiplicador, cria o perfil correspondente
    let multiplicadorId = null;
    if (isMultiplicador) {
      multiplicadorId = uuidv4();
      await client.query(
        `INSERT INTO multiplicadores (id, user_id, coordenador_id, municipio, telefone, meta_apoiadores)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [multiplicadorId, userId, coordenador_id || null, municipio || null, telefone || null, meta_apoiadores || 0]
      );
    }

    await client.query('COMMIT');

    logger.info(`Usuário criado: ${emailNorm} [${finalRole}] por ${req.user.id}`);

    // Envia e-mail com senha temporária (assíncrono, sem bloquear a resposta)
    if (isMultiplicador) {
      sendTempPasswordEmail(emailNorm, nome, senhaFinal);
    }

    res.status(201).json({
      message: isMultiplicador
        ? 'Multiplicador criado com sucesso! A senha de acesso foi enviada para o e-mail cadastrado.'
        : 'Usuário criado com sucesso.',
      id: userId,
      multiplicadorId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── Atualizar usuário ──────────────────────────────────────────────────────
const update = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { nome, email, senha, role, tipo, perfil_id, ativo, municipio, telefone, coordenador_id, meta_apoiadores } = req.body;

    const userResult = await client.query(
      `SELECT u.*, m.municipio, m.telefone, m.coordenador_id, m.meta_apoiadores
       FROM users u
       LEFT JOIN multiplicadores m ON m.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    const existing = userResult.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let perfilIdVal = perfil_id !== undefined ? perfil_id : existing.perfil_id;
    let roleVal = role !== undefined ? role : existing.role;
    let tipoVal = tipo !== undefined ? tipo : existing.tipo;

    if (perfil_id !== undefined) {
      if (perfil_id) {
        const { rows: pRows } = await client.query('SELECT nome, base_role FROM perfis WHERE id = $1', [perfil_id]);
        if (pRows[0]) {
          roleVal = pRows[0].base_role;
          tipoVal = pRows[0].nome;
        }
      } else {
        perfilIdVal = null;
      }
    } else if (role !== undefined && role !== existing.role) {
      if (role === 'admin') {
        perfilIdVal = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
        tipoVal = 'Admin';
      } else if (role === 'coordenador') {
        perfilIdVal = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
        tipoVal = 'Supervisor';
      } else if (role === 'multiplicador') {
        perfilIdVal = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
        tipoVal = 'Operador';
      }
    }

    const nomeVal = nome !== undefined ? nome : existing.nome;
    const emailVal = email !== undefined ? email : existing.email;
    const ativoVal = ativo !== undefined ? ativo : existing.ativo;

    // Rebaixar para apoiador só ocorre quando o frontend envia explicitamente
    // role='apoiador' OU perfil_id=null com tipo='Apoiador' — nunca por nome de perfil
    const isExplicitDemotion = (role === 'apoiador') || (req.body._demote === true);
    if (isExplicitDemotion) {
      // Se for rebaixado para Apoiador, remove o acesso à plataforma e volta pra lista geral
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
      await client.query('DELETE FROM multiplicadores WHERE user_id = $1', [id]);
      await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      if (emailVal) {
        await client.query(
          "UPDATE apoiadores SET tipo = 'Apoiador', status = 'ativo', updated_at = now() WHERE LOWER(email) = LOWER($1)",
          [emailVal.toLowerCase().trim()]
        );
      }
      
      await client.query('COMMIT');
      return res.json({ message: 'Acesso removido. Voluntário retornou à lista de Apoiadores.' });
    }

    await client.query(
      `UPDATE users SET nome = $1, email = $2, role = $3, tipo = $4, ativo = $5, perfil_id = $6, updated_at = now()
       WHERE id = $7`,
      [nomeVal, emailVal?.toLowerCase().trim(), roleVal, tipoVal, ativoVal, perfilIdVal, id]
    );

    // Sincroniza o status ativo e o tipo do usuário com o apoiador correspondente
    if (emailVal) {
      const emailNorm = emailVal.toLowerCase().trim();
      const statusDest = ativoVal ? 'ativo' : 'inativo';
      await client.query(
        "UPDATE apoiadores SET status = $1, tipo = $2, updated_at = now() WHERE LOWER(email) = LOWER($3)",
        [statusDest, tipoVal, emailNorm]
      );
      
      // Se desativou, remove refresh tokens
      if (!ativoVal) {
        await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
      }
    }

    if (senha) {
      const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
      await client.query(
        'UPDATE users SET senha_hash = $1, updated_at = now() WHERE id = $2',
        [senhaHash, id]
      );
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }

    // Se trocou o perfil, revoga refresh tokens do usuário para atualizar a sessão
    if (perfil_id !== undefined && perfil_id !== existing.perfil_id) {
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }

    // Atualiza perfil do multiplicador se existir, ou cria se virou multiplicador
    const mResult = await client.query(
      'SELECT id FROM multiplicadores WHERE user_id = $1',
      [id]
    );

    if (mResult.rows[0]) {
      const municipioVal = municipio !== undefined ? municipio : existing.municipio;
      const telefoneVal = telefone !== undefined ? telefone : existing.telefone;
      const coordenadorVal = coordenador_id !== undefined ? coordenador_id : existing.coordenador_id;
      const metaVal = meta_apoiadores !== undefined ? meta_apoiadores : existing.meta_apoiadores;

      await client.query(
        `UPDATE multiplicadores SET
         municipio = $1,
         telefone = $2,
         coordenador_id = $3,
         meta_apoiadores = $4
         WHERE user_id = $5`,
        [municipioVal, telefoneVal, coordenadorVal, metaVal, id]
      );
    } else if (roleVal === 'multiplicador') {
      const multId = uuidv4();
      await client.query(
        `INSERT INTO multiplicadores (id, user_id, coordenador_id, municipio, telefone, meta_apoiadores)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [multId, id, coordenador_id || null, municipio || null, telefone || null, meta_apoiadores || 0]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Usuário atualizado com sucesso.', perfil_id: perfilIdVal, role: roleVal, tipo: tipoVal });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── Desativar (soft delete) ────────────────────────────────────────────────
const deactivate = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Impede desativar a si mesmo
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode desativar sua própria conta.' });
    }

    // 1. Obter o e-mail do usuário para atualizar o apoiador correspondente
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    const userEmail = userRes.rows[0]?.email;

    const { rowCount } = await db.query(
      'UPDATE users SET ativo = false, updated_at = now() WHERE id = $1',
      [id]
    );

    if (rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // 2. Se houver e-mail, atualiza o status do apoiador correspondente para 'inativo'
    if (userEmail) {
      await db.query(
        "UPDATE apoiadores SET status = 'inativo', updated_at = now() WHERE LOWER(email) = LOWER($1)",
        [userEmail]
      );
    }

    // Revoga todos os tokens do usuário desativado
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

    res.json({ message: 'Usuário desativado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// ── Listar coordenadores (para select nos formulários) ─────────────────────
const listCoordenadores = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email FROM users WHERE role = 'coordenador' AND ativo = true ORDER BY nome`,
      []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, deactivate, listCoordenadores };
