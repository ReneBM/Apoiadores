const db = require('../config/database');

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

const create = async (req, res, next) => {
  try {
    const { titulo, conteudo, destinatarios, imagem_url } = req.body;
    const coordenadorId = req.user.id;

    // 1. Salva o log do disparo no banco de dados
    const { rows } = await db.query(
      `INSERT INTO mensagens_disparadas (titulo, conteudo, destinatarios, coordenador_id, imagem_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, conteudo, destinatarios, coordenadorId, imagem_url || null]
    );

    // 2. Simula contagem de destinatários atingidos
    let queryDest = '';
    let paramsDest = [];

    if (destinatarios === 'todos') {
      queryDest = "SELECT COUNT(*) FROM users WHERE role = 'multiplicador' AND ativo = true";
    } else if (destinatarios === 'mobilizadores') {
      // Conta usuários multiplicadores que têm de 1 a 10 apoiadores ativos
      queryDest = `
        SELECT COUNT(*) FROM (
          SELECT u.id 
          FROM users u
          JOIN multiplicadores m ON m.user_id = u.id
          LEFT JOIN apoiadores a ON a.multiplicador_id = m.id AND a.status = 'ativo'
          WHERE u.role = 'multiplicador' AND u.ativo = true
          GROUP BY u.id
          HAVING COUNT(a.id) BETWEEN 1 AND 10
        ) sub
      `;
    } else if (destinatarios === 'lideres') {
      // Conta usuários multiplicadores com 11 ou mais apoiadores ativos
      queryDest = `
        SELECT COUNT(*) FROM (
          SELECT u.id 
          FROM users u
          JOIN multiplicadores m ON m.user_id = u.id
          LEFT JOIN apoiadores a ON a.multiplicador_id = m.id AND a.status = 'ativo'
          WHERE u.role = 'multiplicador' AND u.ativo = true
          GROUP BY u.id
          HAVING COUNT(a.id) >= 11
        ) sub
      `;
    }

    const countRes = await db.query(queryDest, paramsDest);
    const totalAtingidos = parseInt(countRes.rows[0]?.count || 0);

    res.status(201).json({
      message: 'Disparo efetuado com sucesso (simulado).',
      log: rows[0],
      totalAtingidos
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
