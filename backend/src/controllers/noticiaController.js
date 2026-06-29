const db = require('../config/database');

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

    const query = showAntecipada
      ? 'SELECT * FROM noticias ORDER BY created_at DESC'
      : 'SELECT * FROM noticias WHERE antecipada = false ORDER BY created_at DESC';

    const { rows } = await db.query(query);
    res.json(rows);
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

module.exports = { list, create, remove };
