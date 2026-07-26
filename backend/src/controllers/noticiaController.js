const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { analisarComentario } = require('../utils/moderacao');

const list = async (req, res, next) => {
  try {
    let showAntecipada = false;

    if (req.user) {
      if (req.user.role === 'admin' || req.user.role === 'coordenador') {
        showAntecipada = true;
      } else {
        // Multiplicador: busca o ID correspondente e conta apoiadores
        const { rows: multRes } = await db.query(
          'SELECT id FROM multiplicadores WHERE user_id = $1',
          [req.user.id]
        );
        if (multRes[0]) {
          const { rows: countRes } = await db.query(
            "SELECT COUNT(*) FROM apoiadores WHERE multiplicador_id = $1 AND status = 'ativo'",
            [multRes[0].id]
          );
          const count = parseInt(countRes[0]?.count || 0);
          if (count >= 11) {
            showAntecipada = true; // Líder de Base
          }
        }
      }
    }

    // Inclui contagem de curtidas/comentários, se o usuário curtiu e os
    // 3 comentários mais recentes de cada notícia (em uma única query).
    const where = showAntecipada ? '' : 'WHERE n.antecipada = false';
    const { rows } = await db.query(
      `SELECT n.*,
              COALESCE(l.total, 0)::int AS curtidas_total,
              COALESCE(c.total, 0)::int AS comentarios_total,
              EXISTS(
                SELECT 1 FROM noticia_curtidas nc
                WHERE nc.noticia_id = n.id AND nc.user_id = $1
              ) AS curtiu,
              COALESCE(ult.itens, '[]'::json) AS ultimos_comentarios
       FROM noticias n
       -- (ver LATERAL abaixo: traz os comentários mais recentes de TODOS os usuários)
       LEFT JOIN (
         SELECT noticia_id, COUNT(*) AS total FROM noticia_curtidas GROUP BY noticia_id
       ) l ON l.noticia_id = n.id
       LEFT JOIN (
         SELECT noticia_id, COUNT(*) AS total FROM noticia_comentarios GROUP BY noticia_id
       ) c ON c.noticia_id = n.id
       LEFT JOIN LATERAL (
         SELECT json_agg(x ORDER BY x.created_at ASC) AS itens FROM (
           SELECT nc.id, nc.texto, nc.created_at, COALESCE(u.nome, 'Apoiador') AS nome
           FROM noticia_comentarios nc
           LEFT JOIN users u ON u.id = nc.user_id
           WHERE nc.noticia_id = n.id
           ORDER BY nc.created_at DESC
           LIMIT 20
         ) x
       ) ult ON true
       ${where}
       ORDER BY n.created_at DESC`,
      [req.user?.id || null]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── Curtir / descurtir (toggle) ────────────────────────────────────────────
const toggleCurtida = async (req, res, next) => {
  try {
    const { id } = req.params;

    const del = await db.query(
      'DELETE FROM noticia_curtidas WHERE noticia_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    let curtiu = false;
    if (del.rowCount === 0) {
      await db.query(
        'INSERT INTO noticia_curtidas (noticia_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, req.user.id]
      );
      curtiu = true;
    }

    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS total FROM noticia_curtidas WHERE noticia_id = $1',
      [id]
    );

    res.json({ curtiu, total: rows[0]?.total || 0 });
  } catch (err) {
    next(err);
  }
};

// ── Comentários ────────────────────────────────────────────────────────────
const listComentarios = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT nc.id, nc.texto, nc.created_at, nc.user_id,
              COALESCE(u.nome, 'Apoiador') AS nome
       FROM noticia_comentarios nc
       LEFT JOIN users u ON u.id = nc.user_id
       WHERE nc.noticia_id = $1
       ORDER BY nc.created_at ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const createComentario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const texto = (req.body?.texto || '').trim();

    if (!texto) {
      return res.status(400).json({ error: 'O comentário não pode ser vazio.' });
    }
    if (texto.length > 500) {
      return res.status(400).json({ error: 'O comentário deve ter no máximo 500 caracteres.' });
    }

    // Moderação (IA com contingência local): bloqueia ofensas, xingamentos,
    // discurso de ódio, ameaças, assédio, conteúdo sexual e spam.
    const moderacao = await analisarComentario(texto);
    if (!moderacao.permitido) {
      // Trilha de moderação no audit_log (LGPD / transparência)
      db.query(
        `INSERT INTO audit_log (id, user_id, acao, entidade, entidade_id, detalhes, ip)
         VALUES ($1, $2, 'COMENTARIO_BLOQUEADO_MODERACAO', 'noticia_comentarios', $3, $4, $5)`,
        [uuidv4(), req.user.id, id, JSON.stringify({
          categoria: moderacao.categoria,
          motivo: moderacao.motivo,
          fonte: moderacao.fonte,
          texto: texto.slice(0, 200),
        }), req.ip]
      ).catch((err) => logger.error('Falha ao auditar comentário bloqueado', { message: err.message }));

      return res.status(422).json({
        error: 'Seu comentário não foi publicado porque contém linguagem que viola as diretrizes da comunidade. Reescreva com respeito — críticas e opiniões são bem-vindas.',
        categoria: moderacao.categoria,
      });
    }

    const { rows } = await db.query(
      `INSERT INTO noticia_comentarios (noticia_id, user_id, texto)
       VALUES ($1, $2, $3)
       RETURNING id, texto, created_at, user_id`,
      [id, req.user.id, texto]
    );

    res.status(201).json({ ...rows[0], nome: req.user.nome || 'Você' });
  } catch (err) {
    next(err);
  }
};

const removeComentario = async (req, res, next) => {
  try {
    const { comentarioId } = req.params;

    const { rows } = await db.query(
      'SELECT user_id FROM noticia_comentarios WHERE id = $1',
      [comentarioId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Comentário não encontrado.' });

    const isOwner = rows[0].user_id === req.user.id;
    const isStaff = ['admin', 'coordenador'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Você não pode excluir este comentário.' });
    }

    await db.query('DELETE FROM noticia_comentarios WHERE id = $1', [comentarioId]);
    res.json({ message: 'Comentário excluído.' });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { titulo, conteudo, imagem_url, antecipada } = req.body;
    const { rows } = await db.query(
      `INSERT INTO noticias (titulo, conteudo, imagem_url, antecipada)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [titulo, conteudo, imagem_url || null, antecipada || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM noticias WHERE id = $1', [id]);
    res.json({ message: 'Notícia excluída com sucesso.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, remove, toggleCurtida, listComentarios, createComentario, removeComentario };
