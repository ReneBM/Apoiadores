const db = require('../config/database');
const logger = require('../utils/logger');
const { whatsappConfigurado, enviarAvisoCampanha } = require('../utils/whatsapp');

// Garantir que a coluna imagem_url existe na tabela mensagens_disparadas
db.query('ALTER TABLE mensagens_disparadas ADD COLUMN IF NOT EXISTS imagem_url TEXT').catch(err => {
  console.error('Erro ao adicionar coluna imagem_url à tabela mensagens_disparadas:', err);
});

const list = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.nome AS coordenador_nome
       FROM mensagens_disparadas m
       LEFT JOIN users u ON u.id = m.coordenador_id
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Quantos WhatsApps um único disparo envia. O envio acontece dentro da
 * requisição e a Vercel corta funções longas — acima disto a resposta é
 * truncada e informada ao coordenador, nunca silenciosamente.
 */
const LIMITE_POR_DISPARO = 200;
const SIMULTANEOS = 5;

/** Usuários de cada grupo, com o telefone para o envio. */
const listarDestinatarios = async (grupo) => {
  const base = `
    SELECT u.id, u.nome, u.telefone
      FROM users u
      JOIN multiplicadores m ON m.user_id = u.id
      LEFT JOIN apoiadores a ON a.multiplicador_id = m.id AND a.status = 'ativo'
     WHERE u.role = 'multiplicador' AND u.ativo = true
     GROUP BY u.id, u.nome, u.telefone
  `;

  if (grupo === 'mobilizadores') {
    const { rows } = await db.query(`${base} HAVING COUNT(a.id) BETWEEN 1 AND 10`);
    return rows;
  }
  if (grupo === 'lideres') {
    const { rows } = await db.query(`${base} HAVING COUNT(a.id) >= 11`);
    return rows;
  }
  const { rows } = await db.query(
    `SELECT id, nome, telefone FROM users WHERE role = 'multiplicador' AND ativo = true`
  );
  return rows;
};

/**
 * Entrega o disparo por WhatsApp.
 *
 * Respeita o descadastro (quem pediu para sair não recebe) e envia em
 * pequenos lotes, para não estourar o limite de chamadas da Meta.
 */
const dispararWhatsapp = async (destinatarios, conteudo, mensagemId) => {
  if (!(await whatsappConfigurado())) {
    return { enviados: 0, tentados: 0, semTelefone: 0, erro: 'WhatsApp não está configurado nas Configurações.' };
  }

  // Quem clicou em "não quero mais receber" fica de fora
  const { rows: saidas } = await db.query(
    `SELECT LOWER(email) AS email FROM apoiadores WHERE whatsapp_optout_em IS NOT NULL AND email IS NOT NULL`
  );
  const descadastrados = new Set(saidas.map((r) => r.email));

  const { rows: emails } = await db.query(
    `SELECT id, LOWER(email) AS email FROM users WHERE id = ANY($1::uuid[])`,
    [destinatarios.map((d) => d.id)]
  );
  const emailPorId = new Map(emails.map((r) => [r.id, r.email]));

  const elegiveis = destinatarios.filter(
    (d) => d.telefone && !descadastrados.has(emailPorId.get(d.id))
  );
  const semTelefone = destinatarios.length - elegiveis.length;

  const fila = elegiveis.slice(0, LIMITE_POR_DISPARO);
  const naoEnviados = elegiveis.length - fila.length;

  let enviados = 0;
  for (let i = 0; i < fila.length; i += SIMULTANEOS) {
    const lote = fila.slice(i, i + SIMULTANEOS);
    const resultados = await Promise.all(
      lote.map((d) => enviarAvisoCampanha(d.telefone, d.nome, conteudo, mensagemId))
    );
    enviados += resultados.filter((r) => r.ok).length;
  }

  if (naoEnviados > 0) {
    logger.warn('Disparo por WhatsApp truncado pelo limite por requisição', {
      mensagemId, limite: LIMITE_POR_DISPARO, naoEnviados,
    });
  }

  return {
    enviados,
    tentados: fila.length,
    semTelefone,
    naoEnviados,
    ...(naoEnviados > 0
      ? { aviso: `${naoEnviados} pessoa(s) ficaram de fora: um disparo envia no máximo ${LIMITE_POR_DISPARO} por vez.` }
      : {}),
  };
};

const create = async (req, res, next) => {
  try {
    const { titulo, conteudo, destinatarios, imagem_url, enviar_whatsapp } = req.body;
    const coordenadorId = req.user.id;

    // 1. Salva o log do disparo no banco de dados
    const { rows } = await db.query(
      `INSERT INTO mensagens_disparadas (titulo, conteudo, destinatarios, coordenador_id, imagem_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, conteudo, destinatarios, coordenadorId, imagem_url || null]
    );

    // 2. Levanta quem recebe. O aviso aparece dentro do app para todo o grupo;
    //    o telefone só é usado quando o disparo também vai por WhatsApp.
    const destinatariosDoGrupo = await listarDestinatarios(destinatarios);
    const totalAtingidos = destinatariosDoGrupo.length;

    // 3. Envio por WhatsApp — opcional, marcado pelo coordenador no disparo
    let whatsapp = null;
    if (enviar_whatsapp) {
      whatsapp = await dispararWhatsapp(destinatariosDoGrupo, conteudo, rows[0].id);
    }

    res.status(201).json({
      message: whatsapp
        ? `Disparo publicado no app e enviado por WhatsApp para ${whatsapp.enviados} de ${whatsapp.tentados}.`
        : 'Disparo publicado no app com sucesso.',
      log: rows[0],
      totalAtingidos,
      whatsapp,
    });
  } catch (err) {
    next(err);
  }
};

const getActiveAnnouncements = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Conta os apoiadores ativos para saber o grupo de destinatários
    const refCountRes = await db.query(
      `SELECT COUNT(*) FROM apoiadores a
       JOIN multiplicadores m ON m.id = a.multiplicador_id
       WHERE m.user_id = $1 AND a.status = 'ativo'`,
      [userId]
    );
    const count = parseInt(refCountRes.rows[0]?.count || 0);

    let groups = ['todos'];
    if (count >= 11) {
      groups.push('lideres');
    } else if (count >= 1) {
      groups.push('mobilizadores');
    }

    const { rows } = await db.query(
      `SELECT id, titulo, conteudo, created_at, imagem_url
       FROM mensagens_disparadas
       WHERE destinatarios = ANY($1)
       ORDER BY created_at DESC
       LIMIT 5`,
      [groups]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, getActiveAnnouncements };
