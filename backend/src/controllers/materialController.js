const db = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM materiais ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { titulo, descricao, link_url, tipo } = req.body;
    const { rows } = await db.query(
      `INSERT INTO materiais (titulo, descricao, link_url, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [titulo, descricao || null, link_url, tipo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM materiais WHERE id = $1', [id]);
    res.json({ message: 'Material excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, remove };
