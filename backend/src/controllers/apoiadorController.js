const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const logger = require('../utils/logger');
const { validarCPF } = require('../utils/cpf');
const { gerarSenhaTemporaria } = require('../utils/password');
const { sendTempPasswordEmail } = require('../utils/mailer');

// ── Helper: registra no audit_log ─────────────────────────────────────────
const audit = async (userId, acao, entidade, entidadeId, detalhes, ip) => {
  try {
    await db.query(
      `INSERT INTO audit_log (id, user_id, acao, entidade, entidade_id, detalhes, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), userId, acao, entidade, entidadeId, JSON.stringify(detalhes), ip]
    );
  } catch (err) {
    logger.error('Falha ao registrar audit_log:', { message: err.message });
  }
};

const getMultiplicadorIdByUserId = async (userId) => {
  const { rows } = await db.query(
    'SELECT id FROM multiplicadores WHERE user_id = $1',
    [userId]
  );
  return rows[0]?.id || null;
};

// ── Listar apoiadores (com filtros e paginação) ────────────────────────────
const list = async (req, res, next) => {
  try {
    const {
      cidade, multiplicador_id, status, busca,
      data_inicio, data_fim,
      page = 1, limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    // Restrição por multiplicador (RBAC)
    if (req.filterByUserId) {
      const mId = await getMultiplicadorIdByUserId(req.filterByUserId);
      if (!mId) return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      conditions.push(`a.multiplicador_id = $${idx++}`);
      params.push(mId);
    } else if (multiplicador_id) {
      conditions.push(`a.multiplicador_id = $${idx++}`);
      params.push(multiplicador_id);
    }

    // Filtro removido para que apoiadores promovidos continuem aparecendo na lista geral

    if (cidade) {
      conditions.push(`LOWER(a.cidade) ILIKE $${idx++}`);
      params.push(`%${cidade.toLowerCase()}%`);
    }
    if (status) {
      conditions.push(`a.status = $${idx++}`);
      params.push(status);
    }
    if (req.query.origem) {
      conditions.push(`a.origem = $${idx++}`);
      params.push(req.query.origem);
    }
    if (busca) {
      conditions.push(`(LOWER(a.nome) ILIKE $${idx} OR a.telefone ILIKE $${idx})`);
      params.push(`%${busca.toLowerCase()}%`);
      idx++;
    }
    if (data_inicio) {
      conditions.push(`a.created_at >= $${idx++}`);
      params.push(data_inicio);
    }
    if (data_fim) {
      conditions.push(`a.created_at <= $${idx++}`);
      params.push(data_fim);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM apoiadores a ${where}`,
      params
    );

    params.push(parseInt(limit), offset);
    const { rows } = await db.query(
      `SELECT a.id, a.nome, a.email, a.telefone, a.cidade, a.bairro, a.status,
              a.consentimento_lgpd, a.created_at, a.tipo, a.origem,
              u.nome AS cadastrado_por_nome,
              m_user.nome AS multiplicador_nome,
              usr_acc.role AS acc_role,
              usr_acc.ativo AS acc_ativo,
              usr_acc.id AS acc_user_id,
              usr_acc.tipo AS acc_tipo,
              (SELECT COUNT(*) FROM apoiadores WHERE multiplicador_id = (SELECT id FROM multiplicadores WHERE user_id = usr_acc.id) AND status = 'ativo') AS acc_total_apoiadores
       FROM apoiadores a
       LEFT JOIN users u ON u.id = a.cadastrado_por
       LEFT JOIN multiplicadores m ON m.id = a.multiplicador_id
       LEFT JOIN users m_user ON m_user.id = m.user_id
       LEFT JOIN users usr_acc ON LOWER(usr_acc.email) = LOWER(a.email)
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      data: rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// ── Buscar apoiador por ID ─────────────────────────────────────────────────
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT a.*, u.nome AS cadastrado_por_nome,
              m_user.nome AS multiplicador_nome,
              usr_acc.role AS acc_role,
              usr_acc.ativo AS acc_ativo,
              usr_acc.id AS acc_user_id,
              usr_acc.tipo AS acc_tipo,
              (SELECT COUNT(*) FROM apoiadores WHERE multiplicador_id = (SELECT id FROM multiplicadores WHERE user_id = usr_acc.id) AND status = 'ativo') AS acc_total_apoiadores
       FROM apoiadores a
       LEFT JOIN users u ON u.id = a.cadastrado_por
       LEFT JOIN multiplicadores m ON m.id = a.multiplicador_id
       LEFT JOIN users m_user ON m_user.id = m.user_id
       LEFT JOIN users usr_acc ON LOWER(usr_acc.email) = LOWER(a.email)
       WHERE a.id = $1`,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Apoiador não encontrado.' });

    // Multiplicador só acessa o próprio
    if (req.filterByUserId) {
      const mId = await getMultiplicadorIdByUserId(req.filterByUserId);
      if (rows[0].multiplicador_id !== mId) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── Criar apoiador ─────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const {
      nome, email, telefone, cidade, bairro, interesse,
      observacoes, consentimento_lgpd, multiplicador_id, status, senha,
      cpf, sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais
    } = req.body;

    if (cpf) {
      if (!validarCPF(cpf)) {
        return res.status(400).json({ error: 'CPF inválido.' });
      }
      const cpfCheck = await db.query('SELECT id FROM apoiadores WHERE cpf = $1', [cpf]);
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um cadastro com este CPF.' });
      }
    }

    let multiplicadorId = multiplicador_id || null;
    if (req.user.role === 'multiplicador') {
      multiplicadorId = await getMultiplicadorIdByUserId(req.user.id);
      if (!multiplicadorId) {
        return res.status(403).json({ error: 'Perfil de multiplicador não encontrado.' });
      }
    }

    let senhaHash = null;
    if (senha && senha.length >= 6) {
      senhaHash = await bcrypt.hash(senha, 12);
    }

    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO apoiadores
         (id, nome, email, telefone, cidade, bairro, interesse, observacoes,
          consentimento_lgpd, data_consentimento, status, multiplicador_id, cadastrado_por,
          cpf, sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais, senha_inicial, origem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'Painel Administrativo')
       RETURNING id`,
      [
        id, nome, email || null, telefone || null, cidade, bairro || null,
        interesse || null, observacoes || null,
        consentimento_lgpd, status || 'ativo',
        multiplicadorId, req.user.id,
        cpf || null, sexo || null, acao_impacto || null, como_se_considera || null,
        como_ajudar ? JSON.stringify(como_ajudar) : null,
        pessoas_mobilizar || null,
        grupo_organizacao ? JSON.stringify(grupo_organizacao) : null,
        temas_interesse ? JSON.stringify(temas_interesse) : null,
        redes_sociais ? JSON.stringify(redes_sociais) : null,
        senhaHash
      ]
    );

    await audit(req.user.id, 'CREATE_APOIADOR', 'apoiadores', id,
      { nome, cidade }, req.ip);

    res.status(201).json({ message: 'Apoiador cadastrado com sucesso.', id: rows[0].id });
  } catch (err) {
    next(err);
  }
};

// ── Atualizar apoiador ─────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      nome, email, telefone, cidade, bairro, interesse, observacoes, status, multiplicador_id,
      cpf, sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais
    } = req.body;

    const { rows } = await db.query('SELECT * FROM apoiadores WHERE id = $1', [id]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ error: 'Apoiador não encontrado.' });

    if (email === '' || email === null) {
      return res.status(400).json({ error: 'O E-mail é obrigatório.' });
    }

    if (cpf && cpf !== existing.cpf) {
      if (!validarCPF(cpf)) {
        return res.status(400).json({ error: 'CPF inválido.' });
      }
      const cpfCheck = await db.query('SELECT id FROM apoiadores WHERE cpf = $1', [cpf]);
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um cadastro com este CPF.' });
      }
    }

    let multiplicadorVal = multiplicador_id !== undefined ? multiplicador_id : existing.multiplicador_id;
    if (req.user.role === 'multiplicador') {
      const mId = await getMultiplicadorIdByUserId(req.user.id);
      if (!mId || existing.multiplicador_id !== mId) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
      multiplicadorVal = mId;
    }

    const nomeVal = nome !== undefined ? nome : existing.nome;
    const emailVal = email !== undefined ? email : existing.email;
    const telefoneVal = telefone !== undefined ? telefone : existing.telefone;
    const cidadeVal = cidade !== undefined ? cidade : existing.cidade;
    const bairroVal = bairro !== undefined ? bairro : existing.bairro;
    const interesseVal = interesse !== undefined ? interesse : existing.interesse;
    const observacoesVal = observacoes !== undefined ? observacoes : existing.observacoes;
    const statusVal = status !== undefined ? status : existing.status;
    const cpfVal = cpf !== undefined ? cpf : existing.cpf;
    const sexoVal = sexo !== undefined ? sexo : existing.sexo;
    const acaoImpactoVal = acao_impacto !== undefined ? acao_impacto : existing.acao_impacto;
    const comoSeConsideraVal = como_se_considera !== undefined ? como_se_considera : existing.como_se_considera;
    const stringifyVal = (val) => (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;

    const comoAjudarVal = como_ajudar !== undefined ? (como_ajudar ? JSON.stringify(como_ajudar) : null) : stringifyVal(existing.como_ajudar);
    const pessoasMobilizarVal = pessoas_mobilizar !== undefined ? pessoas_mobilizar : existing.pessoas_mobilizar;
    const grupoOrganizacaoVal = grupo_organizacao !== undefined ? (grupo_organizacao ? JSON.stringify(grupo_organizacao) : null) : stringifyVal(existing.grupo_organizacao);
    const temasInteresseVal = temas_interesse !== undefined ? (temas_interesse ? JSON.stringify(temas_interesse) : null) : stringifyVal(existing.temas_interesse);
    const redesSociaisVal = redes_sociais !== undefined ? (redes_sociais ? JSON.stringify(redes_sociais) : null) : stringifyVal(existing.redes_sociais);

    await db.query(
      `UPDATE apoiadores SET
         nome = $1,
         email = $2,
         telefone = $3,
         cidade = $4,
         bairro = $5,
         interesse = $6,
         observacoes = $7,
         status = $8,
         multiplicador_id = $9,
         cpf = $10,
         sexo = $11,
         acao_impacto = $12,
         como_se_considera = $13,
         como_ajudar = $14,
         pessoas_mobilizar = $15,
         grupo_organizacao = $16,
         temas_interesse = $17,
         redes_sociais = $18,
         updated_at = now()
       WHERE id = $19`,
      [
        nomeVal, emailVal, telefoneVal, cidadeVal, bairroVal, interesseVal, observacoesVal, statusVal, multiplicadorVal,
        cpfVal, sexoVal, acaoImpactoVal, comoSeConsideraVal, comoAjudarVal, pessoasMobilizarVal, grupoOrganizacaoVal, temasInteresseVal, redesSociaisVal,
        id
      ]
    );

    // Sincroniza status do apoiador com a conta do usuário
    if (emailVal) {
      const emailNorm = emailVal.toLowerCase().trim();
      const statusValLower = statusVal.toLowerCase();
      
      if (statusValLower === 'inativo' || statusValLower === 'pendente') {
        // Desativa a conta do usuário se existir
        await db.query(
          "UPDATE users SET ativo = false, updated_at = now() WHERE LOWER(email) = LOWER($1)",
          [emailNorm]
        );
        // Revoga os refresh tokens do usuário
        const { rows: uRows } = await db.query(
          "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
          [emailNorm]
        );
        if (uRows[0]) {
          await db.query("DELETE FROM refresh_tokens WHERE user_id = $1", [uRows[0].id]);
        }
      } else if (statusValLower === 'ativo') {
        // Ativa a conta do usuário
        await db.query(
          "UPDATE users SET ativo = true, updated_at = now() WHERE LOWER(email) = LOWER($1)",
          [emailNorm]
        );
      }
    }

    await audit(req.user.id, 'UPDATE_APOIADOR', 'apoiadores', id,
      req.body, req.ip);

    res.json({ message: 'Apoiador updated com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// ── Excluir apoiador ───────────────────────────────────────────────────────
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Guarda dados para o log antes de deletar
    const { rows } = await db.query(
      'SELECT nome, cidade FROM apoiadores WHERE id = $1',
      [id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Apoiador não encontrado.' });

    await db.query('DELETE FROM apoiadores WHERE id = $1', [id]);

    await audit(req.user.id, 'DELETE_APOIADOR', 'apoiadores', id,
      rows[0], req.ip);

    res.json({ message: 'Apoiador excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// ── Cidades disponíveis (para filtros) ────────────────────────────────────
const listCidades = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT cidade FROM apoiadores ORDER BY cidade`,
      []
    );
    res.json(rows.map((r) => r.cidade));
  } catch (err) {
    next(err);
  }
};

// ── Cadastro público de simpatizante ───────────────────────────────────────
const createPublic = async (req, res, next) => {
  try {
    const {
      nome, email, telefone, cidade, uf, bairro, interesse,
      consentimento_lgpd, ref, senha,
      sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais
    } = req.body;

    // Campos essenciais do cadastro público
    if (!nome || !email || !telefone || !cidade) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios: nome, e-mail, celular e cidade.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    if (!senha || senha.length < 6) {
      return res.status(400).json({ error: 'Crie uma senha com no mínimo 6 caracteres.' });
    }
    if (!consentimento_lgpd) {
      return res.status(400).json({ error: 'O consentimento LGPD é obrigatório.' });
    }

    // E-mail é a única chave de unicidade do cadastro: confere em apoiadores
    // e em users (a aprovação cria a conta com este mesmo e-mail).
    const emailNorm = email.toLowerCase().trim();
    const emailCheck = await db.query(
      `SELECT 1 FROM apoiadores WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM users WHERE LOWER(email) = $1
       LIMIT 1`,
      [emailNorm]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um cadastro com este e-mail. Se for você, aguarde a aprovação ou faça login.' });
    }

    let multiplicadorId = null;
    let cadastradoPor = null;

    if (ref) {
      // Verifica se 'ref' é um user_id
      const userRes = await db.query(
        'SELECT id FROM multiplicadores WHERE user_id = $1',
        [ref]
      );
      if (userRes.rows[0]) {
        multiplicadorId = userRes.rows[0].id;
        cadastradoPor = ref;
      } else {
        // Verifica se 'ref' é um multiplicadores.id
        const multRes = await db.query(
          'SELECT id, user_id FROM multiplicadores WHERE id = $1',
          [ref]
        );
        if (multRes.rows[0]) {
          multiplicadorId = multRes.rows[0].id;
          cadastradoPor = multRes.rows[0].user_id;
        }
      }
    }

    // Hash da senha escolhida pelo apoiador (se fornecida)
    let senhaHash = null;
    if (senha && senha.length >= 6) {
      senhaHash = await bcrypt.hash(senha, 12);
    }

    const id = uuidv4();
    try {
      await db.query(
        `INSERT INTO apoiadores
           (id, nome, email, telefone, cidade, uf, bairro, interesse,
            consentimento_lgpd, data_consentimento, status, multiplicador_id, cadastrado_por,
            sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais, senha_inicial, origem)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), 'pendente', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          id, nome, emailNorm, telefone, cidade, uf || null, bairro || null,
          interesse || null, consentimento_lgpd, multiplicadorId, cadastradoPor,
          sexo || null, acao_impacto || null, como_se_considera || null,
          como_ajudar ? JSON.stringify(como_ajudar) : null,
          pessoas_mobilizar || null,
          grupo_organizacao ? JSON.stringify(grupo_organizacao) : null,
          temas_interesse ? JSON.stringify(temas_interesse) : null,
          redes_sociais ? JSON.stringify(redes_sociais) : null,
          senhaHash,
          multiplicadorId ? 'Indicação (Link)' : 'Site / Landing Page'
        ]
      );
    } catch (insertErr) {
      // Corrida entre a checagem e o INSERT: o índice único de e-mail garante
      if (insertErr.code === '23505') {
        return res.status(400).json({ error: 'Já existe um cadastro com este e-mail. Se for você, aguarde a aprovação ou faça login.' });
      }
      throw insertErr;
    }

    await audit(null, 'PUBLIC_SIGNUP_APOIADOR', 'apoiadores', id,
      { nome, cidade, ref }, req.ip);

    res.status(201).json({ message: 'Cadastro enviado com sucesso e está pendente de aprovação.' });
  } catch (err) {
    next(err);
  }
};

// ── Buscar o próprio card de indicação pelo CPF (público) ──────────────────
// Usado no "Monte seu time" da landing page: o apoiador informa o CPF e
// recebe o nome + o identificador de indicação para montar o card com QR.
// A rota tem limite de tentativas por IP (ver routes/apoiadores.js) e toda
// consulta fica registrada no audit_log para rastreabilidade (LGPD).
const meuCardPorCpf = async (req, res, next) => {
  try {
    const { cpf } = req.body || {};

    if (!validarCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido. Confira os números digitados.' });
    }

    const cpfLimpo = String(cpf).replace(/\D/g, '');

    const { rows } = await db.query(
      `SELECT a.id, a.nome, a.status, a.email
       FROM apoiadores a
       WHERE REPLACE(REPLACE(REPLACE(a.cpf, '.', ''), '-', ''), ' ', '') = $1
       LIMIT 1`,
      [cpfLimpo]
    );

    const apoiador = rows[0];

    // Resposta genérica: não diferencia "não encontrado" de "não aprovado",
    // para não confirmar a existência de um cadastro específico.
    if (!apoiador || apoiador.status !== 'ativo') {
      await audit(null, 'CONSULTA_CARD_CPF_SEM_RESULTADO', 'apoiadores', null, {}, req.ip);
      return res.status(404).json({
        error: 'Não encontramos um cadastro aprovado com esse CPF. Se você acabou de se cadastrar, aguarde a aprovação da coordenação.',
      });
    }

    // Descobre o identificador de indicação: a conta do apoiador (se existir)
    // precisa ter perfil de multiplicador para que a indicação seja atribuída.
    let ref = null;
    if (apoiador.email) {
      const { rows: uRows } = await db.query(
        `SELECT u.id
         FROM users u
         JOIN multiplicadores m ON m.user_id = u.id
         WHERE LOWER(u.email) = LOWER($1) AND u.ativo = true
         LIMIT 1`,
        [apoiador.email]
      );
      ref = uRows[0]?.id || null;
    }

    await audit(null, 'CONSULTA_CARD_CPF', 'apoiadores', apoiador.id, { ref: !!ref }, req.ip);

    res.json({
      nome: apoiador.nome,
      ref,                      // null => link genérico (sem atribuição de indicação)
      atribuiIndicacao: !!ref,
    });
  } catch (err) {
    next(err);
  }
};

// ── Aprovar cadastro pendente ──────────────────────────────────────────────
const approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Busca os dados do apoiador
    const { rows } = await db.query('SELECT * FROM apoiadores WHERE id = $1', [id]);
    const apoiador = rows[0];
    if (!apoiador) return res.status(404).json({ error: 'Apoiador não encontrado.' });

    if (apoiador.status === 'ativo') {
      return res.status(400).json({ error: 'Apoiador já está aprovado.' });
    }

    // 2. Atualiza o status para 'ativo'
    await db.query(
      "UPDATE apoiadores SET status = 'ativo', updated_at = now() WHERE id = $1",
      [id]
    );

    let userCreated = false;
    let hasOwnPassword = false;
    let senhaTemp = null; // senha temporária gerada (enviada por e-mail, nunca fixa)

    // 3. Se tiver e-mail, cria conta no users
    if (apoiador.email) {
      // Verifica se o e-mail já existe no users
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [apoiador.email]);
      if (emailCheck.rows.length === 0) {
        const userId = uuidv4();
        hasOwnPassword = !!apoiador.senha_inicial;

        let senhaHash;
        if (hasOwnPassword) {
          senhaHash = apoiador.senha_inicial; // já está hasheada pelo cadastro público
        } else {
          // Nunca usar senha padrão fixa: gera uma senha temporária aleatória
          // e envia por e-mail; o usuário é forçado a trocá-la no primeiro acesso.
          senhaTemp = gerarSenhaTemporaria();
          senhaHash = await bcrypt.hash(senhaTemp, 12);
        }

        // Perfil padrão: Operador (multiplicador) — c3c3c3c3 é o UUID do perfil Operador
        const PERFIL_OPERADOR_ID = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';

        await db.query(
          `INSERT INTO users (id, nome, email, senha_hash, role, ativo, primeiro_acesso, perfil_id)
           VALUES ($1, $2, $3, $4, 'multiplicador', true, $5, $6)`,
          [userId, apoiador.nome, apoiador.email, senhaHash, !hasOwnPassword, PERFIL_OPERADOR_ID]
        );

        // Cria o perfil correspondente em multiplicadores
        const multId = uuidv4();
        await db.query(
          `INSERT INTO multiplicadores (id, user_id, coordenador_id, municipio, telefone, meta_apoiadores)
           VALUES ($1, $2, $3, $4, $5, 0)`,
          [multId, userId, req.user.id, apoiador.cidade, apoiador.telefone]
        );

        userCreated = true;
      }
    }

    await audit(req.user.id, 'APPROVE_APOIADOR', 'apoiadores', id,
      { nome: apoiador.nome, email: apoiador.email, userCreated, hasOwnPassword }, req.ip);

    // Envia a senha temporária por e-mail (fire-and-forget; falha no e-mail não
    // cancela a aprovação). Só quando geramos uma senha temporária.
    if (senhaTemp && apoiador.email) {
      sendTempPasswordEmail(apoiador.email, apoiador.nome, senhaTemp);
    }

    res.json({
      message: 'Apoiador aprovado com sucesso.',
      userCreated,
      hasOwnPassword,
      credenciaisEnviadas: !!senhaTemp,
    });
  } catch (err) {
    next(err);
  }
};

// ── Alterar tipo/permissões de apoiador (Promover/Demover) ──────────────────
const alterarTipo = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { tipo } = req.body; // 'Apoiador' | 'Mobilizador' | 'Líder de Base' | 'Coordenador' | 'Admin'
    let senhaTempGerada = null; // senha temporária, definida só ao criar um novo usuário

    // 1. Buscar o apoiador
    const { rows: apRows } = await client.query('SELECT a.* FROM apoiadores a WHERE a.id = $1', [id]);
    const apoiador = apRows[0];
    if (!apoiador) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Apoiador não encontrado.' });
    }

    if (tipo !== 'Apoiador' && !apoiador.email) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'O e-mail é obrigatório para conceder acesso ao sistema.' });
    }

    const emailNorm = apoiador.email?.toLowerCase().trim();

    // 2. Buscar se já existe um usuário com esse e-mail
    let existingUser = null;
    if (emailNorm) {
      const { rows: uRows } = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [emailNorm]);
      existingUser = uRows[0];
    }

    // 3. Atualizar o tipo na tabela de apoiadores
    await client.query('UPDATE apoiadores SET tipo = $1, updated_at = now() WHERE id = $2', [tipo, id]);

    if (tipo === 'Apoiador') {
      // Quer demitir / remover acesso
      if (existingUser) {
        // Deleta usuário (CASCADE remove multiplicadores e refresh_tokens)
        await client.query('DELETE FROM users WHERE id = $1', [existingUser.id]);
      }
    } else {
      // Determina a role de sistema correspondente ao tipo
      let targetRole = 'multiplicador';
      if (tipo === 'Admin') targetRole = 'admin';
      else if (tipo === 'Coordenador') targetRole = 'coordenador';

      if (existingUser) {
        // Se já existe, apenas atualiza a role, o tipo e garante que está ativo
        await client.query(
          'UPDATE users SET role = $1, tipo = $2, ativo = true, updated_at = now() WHERE id = $3',
          [targetRole, tipo, existingUser.id]
        );

        if (targetRole === 'multiplicador') {
          // Verifica se já tem o registro em multiplicadores, se não, cria
          const { rows: mRows } = await client.query('SELECT id FROM multiplicadores WHERE user_id = $1', [existingUser.id]);
          if (!mRows[0]) {
            const coordId = req.user.role === 'admin' ? null : req.user.id;
            await client.query(
              `INSERT INTO multiplicadores (id, user_id, coordenador_id, municipio, telefone, meta_apoiadores)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [uuidv4(), existingUser.id, coordId, apoiador.cidade, apoiador.telefone, 50]
            );
          }
        } else {
          // Se mudou para coordenador ou admin, remove o registro do perfil de multiplicador se existir
          await client.query('DELETE FROM multiplicadores WHERE user_id = $1', [existingUser.id]);
        }
      } else {
        // Cria um novo usuário com senha temporária aleatória (nunca fixa),
        // enviada por e-mail; forçamos a troca no primeiro acesso.
        const userId = uuidv4();
        senhaTempGerada = gerarSenhaTemporaria();
        const senhaHash = await bcrypt.hash(senhaTempGerada, 12);

        await client.query(
          `INSERT INTO users (id, nome, email, senha_hash, role, tipo, primeiro_acesso, ativo)
           VALUES ($1, $2, $3, $4, $5, $6, true, true)`,
          [userId, apoiador.nome, emailNorm, senhaHash, targetRole, tipo]
        );

        if (targetRole === 'multiplicador') {
          const coordId = req.user.role === 'admin' ? null : req.user.id;
          await client.query(
            `INSERT INTO multiplicadores (id, user_id, coordenador_id, municipio, telefone, meta_apoiadores)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), userId, coordId, apoiador.cidade, apoiador.telefone, 50]
          );
        }
      }
    }

    await client.query('COMMIT');
    
    // Registrar ação no log de auditoria
    await audit(req.user.id, 'PROMOTE_APOIADOR', 'apoiadores', id, { tipo, email: emailNorm }, req.ip);

    // Se criamos um novo usuário, envia a senha temporária por e-mail
    // (fire-and-forget; após o COMMIT para não segurar a transação).
    if (senhaTempGerada && emailNorm) {
      sendTempPasswordEmail(emailNorm, apoiador.nome, senhaTempGerada);
    }

    res.json({
      message: 'Permissão/Tipo atualizado com sucesso.',
      credenciaisEnviadas: !!senhaTempGerada,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ── Salvar pesquisa de engajamento (Onboarding do primeiro acesso) ───────────
const salvarPesquisaEngajamento = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // O middleware `authenticate` injeta apenas id, role e nome em req.user —
    // não o email. Buscamos o email pelo id para que a sincronização com a
    // tabela `apoiadores` (WHERE LOWER(email) = ...) de fato ocorra.
    const { rows: userRows } = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userRows[0]?.email || null;

    const {
      acao_impacto,
      como_se_considera,
      como_ajudar,
      pessoas_mobilizar,
      grupo_organizacao,
      temas_interesse,
      redes_sociais,
    } = req.body;

    // 1. Marca pesquisa como concluída na tabela users
    await db.query(
      'UPDATE users SET pesquisa_concluida = TRUE, updated_at = now() WHERE id = $1',
      [userId]
    );

    // 2. Atualiza os dados da pesquisa na tabela apoiadores se houver correspondência de email
    if (userEmail) {
      await db.query(
        `UPDATE apoiadores
         SET acao_impacto = $1,
             como_se_considera = $2,
             como_ajudar = $3,
             pessoas_mobilizar = $4,
             grupo_organizacao = $5,
             temas_interesse = $6,
             redes_sociais = $7,
             pesquisa_concluida = TRUE,
             updated_at = now()
         WHERE LOWER(email) = LOWER($8)`,
        [
          acao_impacto || null,
          como_se_considera || null,
          como_ajudar ? JSON.stringify(como_ajudar) : null,
          pessoas_mobilizar || null,
          grupo_organizacao ? JSON.stringify(grupo_organizacao) : null,
          temas_interesse ? JSON.stringify(temas_interesse) : null,
          redes_sociais ? JSON.stringify(redes_sociais) : null,
          userEmail,
        ]
      );
    }

    await audit(userId, 'SUBMIT_PESQUISA_ENGAJAMENTO', 'users', userId, { email: userEmail }, req.ip);

    res.json({ message: 'Pesquisa de engajamento concluída com sucesso!' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, listCidades, createPublic, approve, alterarTipo, salvarPesquisaEngajamento, meuCardPorCpf };
