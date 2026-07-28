const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');
const { uploadArquivo, isConfigured } = require('../utils/storage');

/* ==============================================================
   CMS TIME SV — Controller
   Conteúdo por página = mapa de overrides:
     { "<chave data-cms>": { text, html, src, href, hidden, styles, attr } }
   O site público (cms-runtime.js) aplica esses overrides no DOM.
   ============================================================== */

// ── Schema autocriado (idempotente, mesmo padrão do bucket) ────────────────
let schemaPronto = false;
const garantirSchema = async () => {
  if (schemaPronto) return;
  const sqlPath = path.join(__dirname, '../../../database/setup_cms.sql');
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
  } catch (err) {
    // Sem permissão de DDL ou arquivo ausente: segue — as tabelas podem já existir.
    logger.warn(`CMS: não foi possível garantir o schema automaticamente: ${err.message}`);
  }
  schemaPronto = true;
};

const auditar = async (req, acao, entidade, entidadeId, detalhe = {}) => {
  try {
    await db.query(
      `INSERT INTO cms_auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, detalhe)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user?.id || null, req.user?.nome || 'sistema', acao, entidade, entidadeId, JSON.stringify(detalhe)]
    );
  } catch (err) {
    logger.warn(`CMS auditoria falhou: ${err.message}`);
  }
};

// Publica automaticamente páginas agendadas cujo horário já passou
const processarAgendamentos = async () => {
  await db.query(
    `UPDATE cms_paginas SET status = 'publicada', updated_at = now()
     WHERE status = 'agendada' AND publicar_em IS NOT NULL AND publicar_em <= now()`
  );
};

// ══════════════════════════════════════════════════════════════
// PÚBLICO (sem autenticação)
// ══════════════════════════════════════════════════════════════

// GET /api/cms/public/pagina/:slug — conteúdo publicado + config global
exports.paginaPublica = async (req, res, next) => {
  try {
    await garantirSchema();
    await processarAgendamentos();
    const { slug } = req.params;

    const pagina = await db.query(
      `SELECT id, slug, titulo, descricao, seo, status FROM cms_paginas WHERE slug = $1`,
      [slug]
    );

    let content = {};
    if (pagina.rows.length && pagina.rows[0].status === 'publicada') {
      const rev = await db.query(
        `SELECT content FROM cms_revisoes
         WHERE pagina_id = $1 AND tipo = 'publicada'
         ORDER BY criado_em DESC LIMIT 1`,
        [pagina.rows[0].id]
      );
      if (rev.rows.length) content = rev.rows[0].content;
    }

    const config = await db.query(`SELECT chave, valor FROM cms_config`);
    const configuracoes = {};
    config.rows.forEach((r) => { configuracoes[r.chave] = r.valor; });

    res.json({ pagina: pagina.rows[0] || null, content, configuracoes });
  } catch (err) { next(err); }
};

// POST /api/cms/public/hit — beacon de analytics
exports.registrarAcesso = async (req, res) => {
  try {
    await garantirSchema();
    const { pagina, visitante } = req.body || {};
    await db.query(
      `INSERT INTO cms_acessos (pagina, visitante, user_agent, referer)
       VALUES ($1, $2, $3, $4)`,
      [String(pagina || '/').slice(0, 200), String(visitante || '').slice(0, 64),
       String(req.get('user-agent') || '').slice(0, 300), String(req.get('referer') || '').slice(0, 300)]
    );
  } catch (err) {
    logger.warn(`CMS hit falhou: ${err.message}`);
  }
  res.status(204).end();
};

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════

// GET /api/cms/dashboard
exports.dashboard = async (_req, res, next) => {
  try {
    await garantirSchema();
    const [acessos, unicos, paginas, usuarios, auditoria, publicacoes] = await Promise.all([
      db.query(`SELECT count(*)::int AS total,
                       count(*) FILTER (WHERE criado_em > now() - interval '7 days')::int AS semana
                FROM cms_acessos`),
      db.query(`SELECT count(DISTINCT visitante)::int AS total FROM cms_acessos WHERE visitante <> ''`),
      db.query(`SELECT count(*) FILTER (WHERE status = 'publicada')::int AS publicadas,
                       count(*) FILTER (WHERE status = 'rascunho')::int  AS rascunhos,
                       count(*) FILTER (WHERE status = 'agendada')::int  AS agendadas
                FROM cms_paginas`),
      db.query(`SELECT count(*)::int AS total FROM users WHERE ativo = TRUE`).catch(() => ({ rows: [{ total: 0 }] })),
      db.query(`SELECT usuario_nome, acao, entidade, entidade_id, criado_em
                FROM cms_auditoria ORDER BY criado_em DESC LIMIT 10`),
      db.query(`SELECT r.criado_em, r.autor_nome, p.titulo
                FROM cms_revisoes r JOIN cms_paginas p ON p.id = r.pagina_id
                WHERE r.tipo = 'publicada' ORDER BY r.criado_em DESC LIMIT 10`),
    ]);

    res.json({
      acessos: acessos.rows[0],
      visitantesUnicos: unicos.rows[0].total,
      paginas: paginas.rows[0],
      usuarios: usuarios.rows[0].total,
      alteracoesRecentes: auditoria.rows,
      publicacoesRecentes: publicacoes.rows,
    });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// PÁGINAS
// ══════════════════════════════════════════════════════════════

exports.listarPaginas = async (_req, res, next) => {
  try {
    await garantirSchema();
    await processarAgendamentos();
    const r = await db.query(
      `SELECT p.*,
              (SELECT count(*)::int FROM cms_revisoes v WHERE v.pagina_id = p.id) AS total_revisoes
       FROM cms_paginas p ORDER BY p.updated_at DESC`
    );
    res.json(r.rows);
  } catch (err) { next(err); }
};

exports.criarPagina = async (req, res, next) => {
  try {
    await garantirSchema();
    const { slug, titulo, descricao = '', categoria = 'geral', template = 'campanha', seo = {} } = req.body;
    if (!slug || !titulo) return res.status(400).json({ error: 'Slug e título são obrigatórios.' });
    const slugLimpo = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const r = await db.query(
      `INSERT INTO cms_paginas (slug, titulo, descricao, categoria, template, seo, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [slugLimpo, titulo, descricao, categoria, template, JSON.stringify(seo), req.user?.nome || null]
    );
    await auditar(req, 'criar_pagina', 'pagina', r.rows[0].id, { titulo });
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe uma página com esse slug.' });
    next(err);
  }
};

exports.atualizarPagina = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, categoria, seo, slug, publicar_em } = req.body;
    const atual = await db.query(`SELECT * FROM cms_paginas WHERE id = $1`, [id]);
    if (!atual.rows.length) return res.status(404).json({ error: 'Página não encontrada.' });
    const p = atual.rows[0];

    const r = await db.query(
      `UPDATE cms_paginas SET
         titulo = $1, descricao = $2, categoria = $3, seo = $4, slug = $5,
         publicar_em = $6, updated_at = now()
       WHERE id = $7 RETURNING *`,
      [titulo ?? p.titulo, descricao ?? p.descricao, categoria ?? p.categoria,
       JSON.stringify(seo ?? p.seo), slug ?? p.slug, publicar_em ?? p.publicar_em, id]
    );
    await auditar(req, 'editar_pagina', 'pagina', id, { valor_anterior: { titulo: p.titulo }, valor_novo: { titulo: r.rows[0].titulo } });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
};

exports.excluirPagina = async (req, res, next) => {
  try {
    const { id } = req.params;
    const r = await db.query(`DELETE FROM cms_paginas WHERE id = $1 AND slug <> 'home' RETURNING titulo`, [id]);
    if (!r.rows.length) return res.status(400).json({ error: 'Página não encontrada (a página home não pode ser excluída).' });
    await auditar(req, 'excluir_pagina', 'pagina', id, { titulo: r.rows[0].titulo });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.duplicarPagina = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orig = await db.query(`SELECT * FROM cms_paginas WHERE id = $1`, [id]);
    if (!orig.rows.length) return res.status(404).json({ error: 'Página não encontrada.' });
    const p = orig.rows[0];
    const novoSlug = `${p.slug}-copia-${Date.now().toString(36)}`;

    const nova = await db.query(
      `INSERT INTO cms_paginas (slug, titulo, descricao, categoria, template, seo, status, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, 'rascunho', $7) RETURNING *`,
      [novoSlug, `${p.titulo} (cópia)`, p.descricao, p.categoria, p.template, JSON.stringify(p.seo), req.user?.nome || null]
    );

    // Copia o conteúdo mais recente (rascunho se houver, senão publicado)
    const rev = await db.query(
      `SELECT content FROM cms_revisoes WHERE pagina_id = $1 ORDER BY criado_em DESC LIMIT 1`, [id]
    );
    if (rev.rows.length) {
      await db.query(
        `INSERT INTO cms_revisoes (pagina_id, numero, tipo, content, autor_id, autor_nome)
         VALUES ($1, 1, 'rascunho', $2, $3, $4)`,
        [nova.rows[0].id, JSON.stringify(rev.rows[0].content), req.user?.id, req.user?.nome]
      );
    }
    await auditar(req, 'duplicar_pagina', 'pagina', nova.rows[0].id, { origem: p.titulo });
    res.status(201).json(nova.rows[0]);
  } catch (err) { next(err); }
};

// ── Conteúdo, rascunho e publicação ────────────────────────────────────────

// GET /api/cms/paginas/:id/conteudo?versao=rascunho|publicada
exports.obterConteudo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const versao = req.query.versao === 'publicada' ? 'publicada' : 'rascunho';

    // Rascunho: revisão mais recente (de qualquer tipo). Publicada: última publicada.
    const sql = versao === 'publicada'
      ? `SELECT content, criado_em, autor_nome FROM cms_revisoes
         WHERE pagina_id = $1 AND tipo = 'publicada' ORDER BY criado_em DESC LIMIT 1`
      : `SELECT content, criado_em, autor_nome FROM cms_revisoes
         WHERE pagina_id = $1 ORDER BY criado_em DESC LIMIT 1`;
    const r = await db.query(sql, [id]);
    res.json({ content: r.rows[0]?.content || {}, meta: r.rows[0] || null });
  } catch (err) { next(err); }
};

// PUT /api/cms/paginas/:id/rascunho — autosave com coalescência de 10 min
exports.salvarRascunho = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (typeof content !== 'object' || content === null) {
      return res.status(400).json({ error: 'Conteúdo inválido.' });
    }

    const ultima = await db.query(
      `SELECT id, tipo, autor_id, criado_em FROM cms_revisoes
       WHERE pagina_id = $1 ORDER BY criado_em DESC LIMIT 1`, [id]
    );
    const u = ultima.rows[0];
    const coalescer = u && u.tipo === 'rascunho' && u.autor_id === String(req.user?.id)
      && (Date.now() - new Date(u.criado_em).getTime()) < 10 * 60 * 1000;

    if (coalescer) {
      await db.query(`UPDATE cms_revisoes SET content = $1 WHERE id = $2`, [JSON.stringify(content), u.id]);
    } else {
      const num = await db.query(
        `SELECT coalesce(max(numero), 0) + 1 AS n FROM cms_revisoes WHERE pagina_id = $1`, [id]
      );
      await db.query(
        `INSERT INTO cms_revisoes (pagina_id, numero, tipo, content, autor_id, autor_nome)
         VALUES ($1, $2, 'rascunho', $3, $4, $5)`,
        [id, num.rows[0].n, JSON.stringify(content), String(req.user?.id), req.user?.nome]
      );
    }
    await db.query(`UPDATE cms_paginas SET updated_at = now() WHERE id = $1`, [id]);
    await auditar(req, 'salvar_rascunho', 'pagina', id, { chaves: Object.keys(content).length });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// POST /api/cms/paginas/:id/publicar — grava revisão publicada
exports.publicar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, agendarPara } = req.body;

    // Conteúdo enviado pelo editor; sem ele, promove o último rascunho
    let conteudoFinal = content;
    if (!conteudoFinal) {
      const rev = await db.query(
        `SELECT content FROM cms_revisoes WHERE pagina_id = $1 ORDER BY criado_em DESC LIMIT 1`, [id]
      );
      conteudoFinal = rev.rows[0]?.content || {};
    }

    if (agendarPara) {
      // Agenda: salva o conteúdo como publicada-futura e marca a página
      const num = await db.query(`SELECT coalesce(max(numero),0)+1 AS n FROM cms_revisoes WHERE pagina_id = $1`, [id]);
      await db.query(
        `INSERT INTO cms_revisoes (pagina_id, numero, tipo, content, autor_id, autor_nome)
         VALUES ($1, $2, 'publicada', $3, $4, $5)`,
        [id, num.rows[0].n, JSON.stringify(conteudoFinal), String(req.user?.id), req.user?.nome]
      );
      await db.query(
        `UPDATE cms_paginas SET status = 'agendada', publicar_em = $1, updated_at = now() WHERE id = $2`,
        [agendarPara, id]
      );
      await auditar(req, 'agendar_publicacao', 'pagina', id, { publicar_em: agendarPara });
      return res.json({ ok: true, agendada: true });
    }

    const num = await db.query(`SELECT coalesce(max(numero),0)+1 AS n FROM cms_revisoes WHERE pagina_id = $1`, [id]);
    await db.query(
      `INSERT INTO cms_revisoes (pagina_id, numero, tipo, content, autor_id, autor_nome)
       VALUES ($1, $2, 'publicada', $3, $4, $5)`,
      [id, num.rows[0].n, JSON.stringify(conteudoFinal), String(req.user?.id), req.user?.nome]
    );
    await db.query(
      `UPDATE cms_paginas SET status = 'publicada', publicar_em = NULL, updated_at = now() WHERE id = $1`, [id]
    );
    await auditar(req, 'publicar', 'pagina', id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.despublicar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE cms_paginas SET status = 'rascunho', updated_at = now() WHERE id = $1`, [id]);
    await auditar(req, 'despublicar', 'pagina', id, {});
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── Revisões ───────────────────────────────────────────────────────────────

exports.listarRevisoes = async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT id, numero, tipo, autor_nome, criado_em,
              (SELECT count(*)::int FROM jsonb_object_keys(content) k) AS total_chaves
       FROM cms_revisoes WHERE pagina_id = $1 ORDER BY criado_em DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
};

exports.obterRevisao = async (req, res, next) => {
  try {
    const r = await db.query(`SELECT * FROM cms_revisoes WHERE id = $1`, [req.params.revId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Revisão não encontrada.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
};

// POST /api/cms/revisoes/:revId/restaurar — vira novo rascunho
exports.restaurarRevisao = async (req, res, next) => {
  try {
    const rev = await db.query(`SELECT * FROM cms_revisoes WHERE id = $1`, [req.params.revId]);
    if (!rev.rows.length) return res.status(404).json({ error: 'Revisão não encontrada.' });
    const v = rev.rows[0];

    const num = await db.query(`SELECT coalesce(max(numero),0)+1 AS n FROM cms_revisoes WHERE pagina_id = $1`, [v.pagina_id]);
    await db.query(
      `INSERT INTO cms_revisoes (pagina_id, numero, tipo, content, autor_id, autor_nome)
       VALUES ($1, $2, 'rascunho', $3, $4, $5)`,
      [v.pagina_id, num.rows[0].n, JSON.stringify(v.content), String(req.user?.id), req.user?.nome]
    );
    await auditar(req, 'restaurar_revisao', 'pagina', v.pagina_id, { revisao: v.numero });
    res.json({ ok: true, content: v.content });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// MÍDIA
// ══════════════════════════════════════════════════════════════

exports.listarMidia = async (req, res, next) => {
  try {
    await garantirSchema();
    const { busca = '', pasta = '' } = req.query;
    const r = await db.query(
      `SELECT * FROM cms_midia
       WHERE ($1 = '' OR nome ILIKE '%' || $1 || '%')
         AND ($2 = '' OR pasta = $2)
       ORDER BY created_at DESC LIMIT 500`,
      [busca, pasta]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
};

exports.enviarMidia = async (req, res, next) => {
  try {
    await garantirSchema();
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (!isConfigured) return res.status(503).json({ error: 'Supabase Storage não configurado.' });

    const { pasta = 'geral' } = req.body;
    const nomeSeguro = req.file.originalname.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const caminho = `cms/${Date.now()}-${nomeSeguro}`;
    const url = await uploadArquivo(req.file.buffer, caminho, req.file.mimetype);

    const r = await db.query(
      `INSERT INTO cms_midia (nome, url, tipo, tamanho, pasta, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.file.originalname, url, req.file.mimetype, req.file.size, pasta, req.user?.nome || null]
    );
    await auditar(req, 'enviar_midia', 'midia', r.rows[0].id, { nome: req.file.originalname });
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
};

exports.atualizarMidia = async (req, res, next) => {
  try {
    const { nome, pasta } = req.body;
    const r = await db.query(
      `UPDATE cms_midia SET nome = coalesce($1, nome), pasta = coalesce($2, pasta)
       WHERE id = $3 RETURNING *`,
      [nome, pasta, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
};

exports.excluirMidia = async (req, res, next) => {
  try {
    const r = await db.query(`DELETE FROM cms_midia WHERE id = $1 RETURNING nome`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    await auditar(req, 'excluir_midia', 'midia', req.params.id, { nome: r.rows[0].nome });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES E AUDITORIA
// ══════════════════════════════════════════════════════════════

exports.obterConfig = async (_req, res, next) => {
  try {
    await garantirSchema();
    const r = await db.query(`SELECT chave, valor FROM cms_config`);
    const out = {};
    r.rows.forEach((row) => { out[row.chave] = row.valor; });
    res.json(out);
  } catch (err) { next(err); }
};

exports.salvarConfig = async (req, res, next) => {
  try {
    await garantirSchema();
    const entradas = Object.entries(req.body || {});
    for (const [chave, valor] of entradas) {
      await db.query(
        `INSERT INTO cms_config (chave, valor, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (chave) DO UPDATE SET valor = $2, updated_at = now()`,
        [chave, JSON.stringify(valor)]
      );
    }
    await auditar(req, 'salvar_config', 'config', null, { chaves: entradas.map(([c]) => c) });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.listarAuditoria = async (req, res, next) => {
  try {
    await garantirSchema();
    const r = await db.query(
      `SELECT * FROM cms_auditoria ORDER BY criado_em DESC LIMIT ${Math.min(parseInt(req.query.limite, 10) || 100, 500)}`
    );
    res.json(r.rows);
  } catch (err) { next(err); }
};
