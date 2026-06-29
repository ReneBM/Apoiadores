const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const FUNCIONALIDADES = require('../config/funcionalidades');

// Listar todos os perfis
const list = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, descricao, base_role, created_at FROM perfis ORDER BY nome'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Obter detalhes de um perfil com suas permissões (mescladas com a lista padrão)
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT id, nome, descricao, base_role FROM perfis WHERE id = $1',
      [id]
    );

    const perfil = rows[0];
    if (!perfil) {
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    // Busca permissões do banco
    const permRes = await db.query(
      'SELECT funcionalidade, visualizar, criar, editar, excluir FROM perfil_permissoes WHERE perfil_id = $1',
      [id]
    );

    const dbPerms = {};
    permRes.rows.forEach((p) => {
      dbPerms[p.funcionalidade] = p;
    });

    // Mescla com as funcionalidades do sistema para garantir autodescoberta
    const permissoes = FUNCIONALIDADES.map((f) => {
      const exist = dbPerms[f];
      return {
        funcionalidade: f,
        visualizar: exist ? exist.visualizar : false,
        criar: exist ? exist.criar : false,
        editar: exist ? exist.editar : false,
        excluir: exist ? exist.excluir : false,
      };
    });

    res.json({
      ...perfil,
      permissoes,
    });
  } catch (err) {
    next(err);
  }
};

// Criar um novo perfil
const create = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { nome, descricao, base_role, permissoes } = req.body;

    if (!nome) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'O nome do perfil é obrigatório.' });
    }

    if (!base_role) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A função base do perfil é obrigatória.' });
    }

    // Cria o perfil
    const perfilId = uuidv4();
    await client.query(
      `INSERT INTO perfis (id, nome, descricao, base_role)
       VALUES ($1, $2, $3, $4)`,
      [perfilId, nome, descricao || null, base_role]
    );

    // Insere as permissões enviadas
    if (Array.isArray(permissoes)) {
      for (const perm of permissoes) {
        if (FUNCIONALIDADES.includes(perm.funcionalidade)) {
          await client.query(
            `INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              perfilId,
              perm.funcionalidade,
              perm.visualizar || false,
              perm.criar || false,
              perm.editar || false,
              perm.excluir || false,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Perfil criado com sucesso.', id: perfilId });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Já existe um perfil com este nome.' });
    }
    next(err);
  } finally {
    client.release();
  }
};

// Editar um perfil
const update = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { nome, descricao, base_role, permissoes } = req.body;

    // Impede alterar nome de perfis críticos
    const protectedIds = [
      'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', // Admin
      'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', // Supervisor
      'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', // Operador
    ];

    const isSystemProfile = protectedIds.includes(id);

    const { rows: current } = await client.query('SELECT * FROM perfis WHERE id = $1', [id]);
    if (!current[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    const finalNome = isSystemProfile ? current[0].nome : (nome || current[0].nome);
    const finalBaseRole = isSystemProfile ? current[0].base_role : (base_role || current[0].base_role);

    // Atualiza cabeçalho do perfil
    await client.query(
      `UPDATE perfis SET nome = $1, descricao = $2, base_role = $3, updated_at = now() WHERE id = $4`,
      [finalNome, descricao || null, finalBaseRole, id]
    );

    // Atualiza permissões: remove anteriores e insere novas
    await client.query('DELETE FROM perfil_permissoes WHERE perfil_id = $1', [id]);

    if (Array.isArray(permissoes)) {
      for (const perm of permissoes) {
        if (FUNCIONALIDADES.includes(perm.funcionalidade)) {
          await client.query(
            `INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              perm.funcionalidade,
              perm.visualizar || false,
              perm.criar || false,
              perm.editar || false,
              perm.excluir || false,
            ]
          );
        }
      }
    }

    // Se a base_role do perfil mudou, opcionalmente atualiza os usuários vinculados
    if (finalBaseRole !== current[0].base_role) {
      await client.query(
        'UPDATE users SET role = $1 WHERE perfil_id = $2',
        [finalBaseRole, id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Perfil e permissões atualizados com sucesso.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Excluir um perfil
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const protectedIds = [
      'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
      'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
      'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
    ];

    if (protectedIds.includes(id)) {
      return res.status(400).json({ error: 'Perfis nativos do sistema não podem ser excluídos.' });
    }

    // Verifica se há usuários vinculados
    const { rows: users } = await db.query('SELECT COUNT(*) FROM users WHERE perfil_id = $1', [id]);
    if (parseInt(users[0].count) > 0) {
      return res.status(400).json({ error: 'Este perfil possui usuários vinculados e não pode ser excluído.' });
    }

    await db.query('DELETE FROM perfis WHERE id = $1', [id]);
    res.json({ message: 'Perfil excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
