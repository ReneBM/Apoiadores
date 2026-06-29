const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;
let useMock = false;

// Dados em memória para simulação (Mock Sandbox Mode)
const mockStore = {
  users: [
    {
      id: 'user-admin-1',
      nome: 'Administrador Valim',
      email: 'admin@senadorvalim.com.br',
      // Hash bcrypt para a senha 'Admin@2025'
      senha_hash: '$2b$12$BxxazO8CI7uMMGemDbY6XObs8GHOu4vf1Kdvz5p/C7djQKwGJUH0e',
      role: 'admin',
      tipo: 'Admin',
      ativo: true,
      created_at: new Date()
    },
    {
      id: 'user-coordenador-1',
      nome: 'Coordenadora Maria',
      email: 'coordenadora@senadorvalim.com.br',
      senha_hash: '$2b$12$BxxazO8CI7uMMGemDbY6XObs8GHOu4vf1Kdvz5p/C7djQKwGJUH0e',
      role: 'coordenador',
      tipo: 'Coordenador',
      ativo: true,
      created_at: new Date()
    },
    {
      id: 'user-multiplicador-1',
      nome: 'Multiplicador João',
      email: 'joao@senadorvalim.com.br',
      senha_hash: '$2b$12$BxxazO8CI7uMMGemDbY6XObs8GHOu4vf1Kdvz5p/C7djQKwGJUH0e',
      role: 'multiplicador',
      tipo: 'Mobilizador',
      ativo: true,
      created_at: new Date()
    }
  ],
  multiplicadores: [
    {
      id: 'mult-id-1',
      user_id: 'user-multiplicador-1',
      coordenador_id: 'user-coordenador-1',
      municipio: 'Natal',
      telefone: '(84) 99999-9999',
      meta_apoiadores: 50,
      created_at: new Date()
    }
  ],
  apoiadores: [
    {
      id: 'apoiador-1',
      nome: 'Carlos Souza',
      telefone: '(84) 98888-8888',
      cidade: 'Natal',
      bairro: 'Ponta Negra',
      interesse: 'Saúde, Educação',
      observacoes: 'Deseja participar das reuniões.',
      consentimento_lgpd: true,
      data_consentimento: new Date(),
      status: 'ativo',
      multiplicador_id: 'mult-id-1',
      cadastrado_por: 'user-multiplicador-1',
      created_at: new Date(Date.now() - 3600000 * 24 * 2),
      updated_at: new Date(Date.now() - 3600000 * 24 * 2)
    },
    {
      id: 'apoiador-2',
      nome: 'Ana Lima',
      telefone: '(84) 97777-7777',
      cidade: 'Mossoró',
      bairro: 'Centro',
      interesse: 'Segurança Pública',
      observacoes: 'Líder comunitária.',
      consentimento_lgpd: true,
      data_consentimento: new Date(),
      status: 'ativo',
      multiplicador_id: null,
      cadastrado_por: 'user-admin-1',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  refresh_tokens: [],
  audit_log: [],
  mensagens_disparadas: []
};

// Verifica se a conexão com o banco real deve ser usada
const dbUrl = process.env.DATABASE_URL;
const isPlaceholder = !dbUrl || dbUrl.includes('[PASSWORD]') || dbUrl.includes('[YOUR_PASSWORD]');

if (isPlaceholder) {
  useMock = true;
  logger.warn('⚠️ DATABASE_URL não configurada ou com placeholder. O sistema iniciará no MODO MOCK / SANDBOX (dados em memória).');
} else {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('Erro inesperado no pool PostgreSQL:', { message: err.message });
    });

    pool.on('connect', () => {
      logger.info('Nova conexão estabelecida com o banco de dados.');
    });
  } catch (err) {
    logger.error('Falha ao inicializar Pool de Banco de dados Real. Forçando MODO MOCK:', { message: err.message });
    useMock = true;
  }
}

// Simulador de queries em memória
const runMockQuery = async (text, params = []) => {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');

  // SELECT id, nome, email, senha_hash, role, ativo FROM users WHERE email = $1
  if (normalized.includes('select') && normalized.includes('from users') && normalized.includes('email =')) {
    const email = params[0].toLowerCase().trim();
    const user = mockStore.users.find(u => u.email === email);
    return { rows: user ? [user] : [] };
  }

  // INSERT INTO refresh_tokens
  if (normalized.includes('insert into refresh_tokens')) {
    const [id, user_id, token, expires_at] = params;
    mockStore.refresh_tokens.push({ id, user_id, token, expires_at });
    return { rows: [] };
  }

  // SELECT id FROM multiplicadores WHERE user_id = $1
  if (normalized.includes('select id') && normalized.includes('from multiplicadores') && normalized.includes('user_id =')) {
    const userId = params[0];
    const mult = mockStore.multiplicadores.find(m => m.user_id === userId);
    return { rows: mult ? [mult] : [] };
  }

  // SELECT rt.id, rt.user_id, u.nome, u.role, u.ativo FROM refresh_tokens rt ...
  if (normalized.includes('from refresh_tokens') && normalized.includes('join users')) {
    const token = params[0];
    const rt = mockStore.refresh_tokens.find(r => r.token === token);
    if (!rt) return { rows: [] };
    const user = mockStore.users.find(u => u.id === rt.user_id);
    if (!user) return { rows: [] };
    return {
      rows: [{
        id: rt.id,
        user_id: rt.user_id,
        nome: user.nome,
        role: user.role,
        ativo: user.ativo
      }]
    };
  }

  // DELETE FROM refresh_tokens
  if (normalized.includes('delete from refresh_tokens')) {
    const val = params[0];
    const idx = mockStore.refresh_tokens.findIndex(r => r.id === val || r.token === val || r.user_id === val);
    if (idx !== -1) mockStore.refresh_tokens.splice(idx, 1);
    return { rows: [] };
  }

  // SELECT id, nome, email, role, created_at FROM users WHERE id = $1
  if (normalized.includes('select') && normalized.includes('from users') && normalized.includes('id =')) {
    const id = params[0];
    const user = mockStore.users.find(u => u.id === id);
    if (!user) return { rows: [] };
    const ap = mockStore.apoiadores.find(a => a.email && a.email.toLowerCase() === user.email.toLowerCase());
    const m = mockStore.multiplicadores.find(mult => mult.user_id === user.id);
    return { rows: [{ ...user, apoiador_id: ap ? ap.id : null, multiplicador_id: m ? m.id : null, municipio: m?.municipio, telefone: m?.telefone, meta_apoiadores: m?.meta_apoiadores, coordenador_id: m?.coordenador_id }] };
  }

  // UPDATE users SET senha_hash = $1
  if (normalized.includes('update users set senha_hash =')) {
    const [hash, id] = params;
    const user = mockStore.users.find(u => u.id === id);
    if (user) user.senha_hash = hash;
    return { rows: [] };
  }

  // INSERT INTO audit_log
  if (normalized.includes('insert into audit_log')) {
    const [id, user_id, acao, entidade, entidade_id, detalhes, ip] = params;
    mockStore.audit_log.push({ id, user_id, acao, entidade, entidade_id, detalhes, ip, created_at: new Date() });
    return { rows: [] };
  }

  // SELECT COUNT(*) FROM apoiadores a
  if (normalized.includes('count(*)') && normalized.includes('from apoiadores')) {
    const filtered = runMockFilterApoiadores(normalized, params);
    return { rows: [{ count: filtered.length, total: filtered.length }] };
  }

  // SELECT COUNT(*) FROM multiplicadores
  if (normalized.includes('count(*)') && normalized.includes('from multiplicadores')) {
    return { rows: [{ count: mockStore.multiplicadores.length, total: mockStore.multiplicadores.length }] };
  }

  // SELECT COUNT(DISTINCT cidade) FROM apoiadores
  if (normalized.includes('count(distinct cidade)')) {
    const cities = new Set(mockStore.apoiadores.map(a => a.cidade).filter(Boolean));
    return { rows: [{ total: cities.size || 5 }] };
  }

  // SELECT COUNT(*) FROM (SELECT cidade, MIN(created_at)... (novas cidades)
  if (normalized.includes('primeira_data') && normalized.includes('count(*)')) {
    return { rows: [{ total: 1 }] };
  }

  // SELECT a.nome, a.cidade, a.created_at FROM apoiadores a ORDER BY a.created_at DESC LIMIT 4
  if (normalized.includes('from apoiadores a') && normalized.includes('order by a.created_at desc') && normalized.includes('limit 4')) {
    const list = [...mockStore.apoiadores]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4)
      .map(ap => ({
        nome: ap.nome,
        cidade: ap.cidade,
        created_at: ap.created_at
      }));
    return { rows: list };
  }

  // SELECT a.id, a.nome... FROM apoiadores a
  if (normalized.includes('from apoiadores a')) {
    const filtered = runMockFilterApoiadores(normalized, params);
    const limit = params[params.length - 2] || 20;
    const offset = params[params.length - 1] || 0;
    const sliced = filtered.slice(offset, offset + limit);
    return { rows: sliced };
  }

  // INSERT INTO apoiadores
  if (normalized.includes('insert into apoiadores')) {
    const [
      id, nome, email, telefone, cidade, bairro, interesse, observacoes,
      consentimento_lgpd, data_consentimento, status, multiplicador_id, cadastrado_por,
      cpf, sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais
    ] = params;
    
    // Check CPF unique in mock
    if (cpf && mockStore.apoiadores.find(a => a.cpf === cpf)) {
      throw new Error('UNIQUE constraint failed: apoiadores.cpf');
    }

    const newApoiador = {
      id, nome, email, telefone, cidade, bairro, interesse, observacoes, consentimento_lgpd, data_consentimento, status, multiplicador_id, cadastrado_por,
      cpf, sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.apoiadores.push(newApoiador);
    return { rows: [newApoiador] };
  }

  // UPDATE apoiadores
  if (normalized.includes('update apoiadores set nome =')) {
    const id = params[params.length - 1];
    const ap = mockStore.apoiadores.find(a => a.id === id);
    if (ap) {
      const [
        nome, email, telefone, cidade, bairro, interesse, observacoes, status, multiplicador_id,
        cpf, sexo, acao_impacto, como_se_considera, como_ajudar, pessoas_mobilizar, grupo_organizacao, temas_interesse, redes_sociais
      ] = params;
      
      if (cpf && ap.cpf !== cpf && mockStore.apoiadores.find(a => a.cpf === cpf)) {
        throw new Error('UNIQUE constraint failed: apoiadores.cpf');
      }

      ap.nome = nome;
      ap.email = email;
      ap.telefone = telefone;
      ap.cidade = cidade;
      ap.bairro = bairro;
      ap.interesse = interesse;
      ap.observacoes = observacoes;
      ap.status = status;
      ap.multiplicador_id = multiplicador_id;
      ap.cpf = cpf;
      ap.sexo = sexo;
      ap.acao_impacto = acao_impacto;
      ap.como_se_considera = como_se_considera;
      ap.como_ajudar = como_ajudar;
      ap.pessoas_mobilizar = pessoas_mobilizar;
      ap.grupo_organizacao = grupo_organizacao;
      ap.temas_interesse = temas_interesse;
      ap.redes_sociais = redes_sociais;
      ap.updated_at = new Date();
    }
    return { rows: ap ? [ap] : [] };
  }

  // DELETE FROM apoiadores WHERE id = $1
  if (normalized.includes('delete from apoiadores')) {
    const id = params[0];
    const idx = mockStore.apoiadores.findIndex(a => a.id === id);
    if (idx !== -1) mockStore.apoiadores.splice(idx, 1);
    return { rows: [] };
  }

  // SELECT COUNT(*) FROM users u LEFT JOIN multiplicadores m
  if (normalized.includes('count(*)') && normalized.includes('from users u')) {
    let list = [...mockStore.users];
    if (normalized.includes('u.role =')) {
      const roleVal = params[0];
      list = list.filter(u => u.role === roleVal);
    }
    return { rows: [{ count: list.length }] };
  }

  // SELECT u.id, u.nome... FROM users u LEFT JOIN multiplicadores m
  if (normalized.includes('from users u') && normalized.includes('left join multiplicadores m')) {
    let list = mockStore.users.map(u => {
      const m = mockStore.multiplicadores.find(mult => mult.user_id === u.id) || {};
      const total = mockStore.apoiadores.filter(a => a.multiplicador_id === m.id).length;
      return {
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        tipo: u.tipo || 'Apoiador',
        ativo: u.ativo,
        created_at: u.created_at,
        municipio: m.municipio || null,
        telefone: m.telefone || null,
        meta_apoiadores: m.meta_apoiadores || 0,
        total_apoiadores: total
      };
    });

    if (normalized.includes('u.role =')) {
      const roleVal = params[0];
      list = list.filter(item => item.role === roleVal);
    }
    if (normalized.includes('u.ativo =')) {
      const activeVal = params[1] === true;
      list = list.filter(item => item.ativo === activeVal);
    }

    return { rows: list };
  }

  // SELECT de multiplicadores
  if (normalized.includes('from multiplicadores')) {
    if (normalized.includes('where id =') || normalized.includes('where m.id =')) {
      const id = params[0];
      const mult = mockStore.multiplicadores.find(m => m.id === id);
      if (mult) {
        const u = mockStore.users.find(user => user.id === mult.user_id);
        return { rows: [{ ...mult, nome: u?.nome, email: u?.email }] };
      }
      return { rows: [] };
    }

    const joined = mockStore.multiplicadores.map(m => {
      const u = mockStore.users.find(user => user.id === m.user_id);
      const total = mockStore.apoiadores.filter(a => a.multiplicador_id === m.id).length;
      return {
        ...m,
        nome: u?.nome,
        email: u?.email,
        ativo: u?.ativo,
        total_apoiadores: total
      };
    });
    return { rows: joined };
  }

  // INSERT INTO users (cadastro de multiplicador)
  if (normalized.includes('insert into users')) {
    const id = params[0];
    const nome = params[1];
    const email = params[2];
    const senha_hash = params[3];
    const role = params[4];
    const ativo = params[params.length - 2] === false ? false : true;
    const tipo = params[params.length - 1];
    const newUser = { id, nome, email, senha_hash, role, tipo: tipo || 'Mobilizador', ativo, created_at: new Date() };
    mockStore.users.push(newUser);
    return { rows: [newUser] };
  }

  // INSERT INTO multiplicadores (cadastro de multiplicador)
  if (normalized.includes('insert into multiplicadores')) {
    const [id, user_id, coordenador_id, municipio, telefone, meta] = params;
    const newM = { id, user_id, coordenador_id, municipio, telefone, meta_apoiadores: meta, created_at: new Date() };
    mockStore.multiplicadores.push(newM);
    return { rows: [newM] };
  }

  // UPDATE users / multiplicadores
  if (normalized.includes('update users set nome =') || normalized.includes('update users set role =')) {
    const id = params[params.length - 1];
    const u = mockStore.users.find(user => user.id === id);
    if (u) {
      if (normalized.includes('nome =')) {
        const [nome, email, role, tipo, ativo] = params;
        u.nome = nome;
        u.email = email;
        u.role = role;
        u.tipo = tipo;
        u.ativo = ativo;
      }
      if (normalized.includes('role = $1') && normalized.includes('tipo = $2')) {
        u.role = params[0];
        u.tipo = params[1];
        if (normalized.includes('ativo =')) u.ativo = params[2];
      }
      if (normalized.includes('tipo =') && !normalized.includes('role =')) {
        u.tipo = params[0];
      }
    }
    return { rows: [] };
  }

  if (normalized.includes('update multiplicadores set')) {
    const [municipio, telefone, coordenador_id, meta, id] = params;
    const m = mockStore.multiplicadores.find(mult => mult.id === id);
    if (m) {
      m.coordenador_id = coordenador_id;
      m.municipio = municipio;
      m.telefone = telefone;
      m.meta_apoiadores = meta;
    }
    return { rows: [] };
  }

  // UPDATE users SET ativo =
  if (normalized.includes('update users set ativo =')) {
    const [ativo, id] = params;
    const u = mockStore.users.find(user => user.id === id);
    if (u) u.ativo = ativo;
    return { rows: [] };
  }

  // UPDATE apoiadores SET tipo =
  if (normalized.includes('update apoiadores set tipo =') || (normalized.includes('update apoiadores set') && normalized.includes('tipo ='))) {
    const [tipoVal, idVal] = params;
    const ap = mockStore.apoiadores.find(a => a.id === idVal);
    if (ap) {
      ap.tipo = tipoVal;
      ap.updated_at = new Date();
    }
    return { rows: [] };
  }

  // Views para Dashboard
  if (normalized.includes('vw_apoiadores_por_multiplicador')) {
    const joined = mockStore.multiplicadores.map(m => {
      const u = mockStore.users.find(user => user.id === m.user_id);
      const total = mockStore.apoiadores.filter(a => a.multiplicador_id === m.id).length;
      return {
        multiplicador_id: m.id,
        multiplicador_nome: u?.nome,
        multiplicador_email: u?.email,
        municipio: m.municipio,
        meta_apoiadores: m.meta_apoiadores,
        total_apoiadores: total,
        novos_hoje: 1,
        percentual_meta: m.meta_apoiadores > 0 ? Math.round((total / m.meta_apoiadores) * 100) : 0
      };
    });
    return { rows: joined };
  }

  if (normalized.includes('vw_apoiadores_por_cidade')) {
    const cities = {};
    mockStore.apoiadores.forEach(a => {
      if (!cities[a.cidade]) {
        cities[a.cidade] = { cidade: a.cidade, total: 0, ativos: 0, inativos: 0, pendentes: 0 };
      }
      cities[a.cidade].total++;
      if (a.status === 'ativo') cities[a.cidade].ativos++;
      else if (a.status === 'inativo') cities[a.cidade].inativos++;
      else cities[a.cidade].pendentes++;
    });
    return { rows: Object.values(cities).sort((a, b) => b.total - a.total) };
  }

  if (normalized.includes('vw_serie_diaria')) {
    return {
      rows: [
        { dia: new Date(Date.now() - 3600000 * 24 * 3).toISOString().split('T')[0], novos: 5 },
        { dia: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0], novos: 3 },
        { dia: new Date(Date.now() - 3600000 * 24 * 1).toISOString().split('T')[0], novos: 8 },
        { dia: new Date().toISOString().split('T')[0], novos: 2 }
      ]
    };
  }

  // Query messages / disparos
  if (normalized.includes('insert into mensagens_disparadas')) {
    const [titulo, conteudo, destinatarios, coordenador_id, imagem_url] = params;
    const newMsg = {
      id: 'msg-' + Math.random(),
      titulo,
      conteudo,
      destinatarios,
      coordenador_id,
      imagem_url: imagem_url || null,
      created_at: new Date()
    };
    if (!mockStore.mensagens_disparadas) {
      mockStore.mensagens_disparadas = [];
    }
    mockStore.mensagens_disparadas.push(newMsg);
    return { rows: [newMsg] };
  }

  if (normalized.includes('from mensagens_disparadas')) {
    if (!mockStore.mensagens_disparadas) {
      mockStore.mensagens_disparadas = [];
    }
    let list = [...mockStore.mensagens_disparadas];
    if (normalized.includes('destinatarios = any')) {
      const groups = params[0] || ['todos'];
      list = list.filter(m => groups.includes(m.destinatarios));
    }
    return {
      rows: list.map(m => {
        const u = mockStore.users.find(usr => usr.id === m.coordenador_id);
        return {
          ...m,
          coordenador_nome: u?.nome || 'Coordenador'
        };
      }).sort((a, b) => b.created_at - a.created_at)
    };
  }

  // DELETE FROM users WHERE id = $1
  if (normalized.includes('delete from users') && (normalized.includes('id =') || normalized.includes('where id ='))) {
    const idVal = params[0];
    const idx = mockStore.users.findIndex(u => u.id === idVal);
    if (idx !== -1) mockStore.users.splice(idx, 1);
    return { rows: [] };
  }

  // DELETE FROM multiplicadores WHERE user_id = $1
  if (normalized.includes('delete from multiplicadores') && normalized.includes('user_id =')) {
    const idVal = params[0];
    const idx = mockStore.multiplicadores.findIndex(m => m.user_id === idVal);
    if (idx !== -1) mockStore.multiplicadores.splice(idx, 1);
    return { rows: [] };
  }

  // UPDATE apoiadores SET status = $1, tipo = $2, updated_at = now() WHERE lower(email) = lower($3)
  if (normalized.includes('update apoiadores set status =') && normalized.includes('lower(email) = lower(')) {
    const statusVal = params[0];
    const tipoVal = params[1];
    const emailVal = params[2];
    mockStore.apoiadores.forEach(a => {
      if (a.email && a.email.toLowerCase() === emailVal.toLowerCase()) {
        a.status = statusVal;
        if (tipoVal !== undefined) a.tipo = tipoVal;
        a.updated_at = new Date();
      }
    });
    return { rows: [] };
  }

  // UPDATE users SET ativo = ... WHERE lower(email) = lower($1)
  if (normalized.includes('update users set ativo =') && normalized.includes('lower(email) = lower(')) {
    const [ativoVal, emailVal] = params;
    mockStore.users.forEach(u => {
      if (u.email && u.email.toLowerCase() === emailVal.toLowerCase()) {
        u.ativo = ativoVal;
        u.updated_at = new Date();
      }
    });
    return { rows: [] };
  }

  return { rows: [] };
};

// Filtro simples de apoiadores
const runMockFilterApoiadores = (sql, params) => {
  let list = [...mockStore.apoiadores];
  
  // Se for query de ID único, filtra por ID
  if (sql.includes('id = $1') || sql.includes('a.id = $1')) {
    const targetId = params[0];
    list = list.filter(a => a.id === targetId);
  }

  // Se for query de Email único, filtra por Email
  if (sql.includes('lower(email) = lower($1)') || sql.includes('lower(a.email) = lower($1)')) {
    const emailVal = params[0]?.toLowerCase().trim();
    list = list.filter(a => a.email && a.email.toLowerCase().trim() === emailVal);
  }

  return list.map(a => {
    const u = mockStore.users.find(usr => usr.id === a.cadastrado_por);
    const m = mockStore.multiplicadores.find(mult => mult.id === a.multiplicador_id);
    const m_user = m ? mockStore.users.find(usr => usr.id === m.user_id) : null;
    
    // Procura se esse apoiador possui conta no sistema
    const usr_acc = a.email ? mockStore.users.find(usr => usr.email.toLowerCase() === a.email.toLowerCase()) : null;
    let acc_total_apoiadores = 0;
    if (usr_acc && usr_acc.role === 'multiplicador') {
      const mult_acc = mockStore.multiplicadores.find(mult => mult.user_id === usr_acc.id);
      if (mult_acc) {
        acc_total_apoiadores = mockStore.apoiadores.filter(ap => ap.multiplicador_id === mult_acc.id && ap.status === 'ativo').length;
      }
    }

    return {
      ...a,
      cadastrado_por_nome: u?.nome || 'Administrador',
      multiplicador_nome: m_user?.nome || 'Nenhum',
      acc_role: usr_acc?.role || null,
      acc_ativo: usr_acc?.ativo || null,
      acc_user_id: usr_acc?.id || null,
      acc_tipo: usr_acc?.tipo || 'Apoiador',
      acc_total_apoiadores
    };
  });
};

const query = async (text, params) => {
  if (useMock) {
    return runMockQuery(text, params);
  }
  return pool.query(text, params);
};

const getClient = async () => {
  if (useMock) {
    // Retorna cliente mockado para transações
    return {
      query: runMockQuery,
      release: () => {}
    };
  }
  return pool.connect();
};

module.exports = { query, getClient, pool: useMock ? null : pool };
