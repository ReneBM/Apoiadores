const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Listar mensagens recebidas pelo usuário logado (Apoiador/Multiplicador)
const listMyMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 1. Busca mensagens
    const { rows } = await db.query(
      `SELECT m.id, m.mensagem, m.lida, m.created_at, u.nome AS remetente_nome
       FROM mensagens_privadas m
       LEFT JOIN users u ON u.id = m.remetente_id
       WHERE m.destinatario_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    // 2. Marca todas como lidas
    await db.query(
      'UPDATE mensagens_privadas SET lida = true WHERE destinatario_id = $1 AND lida = false',
      [userId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Contar mensagens não lidas do usuário logado
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM mensagens_privadas WHERE destinatario_id = $1 AND lida = false',
      [userId]
    );
    res.json({ unreadCount: parseInt(rows[0].count || 0) });
  } catch (err) {
    next(err);
  }
};

// Enviar mensagem (somente Admin e Coordenador)
const sendPrivateMessage = async (req, res, next) => {
  try {
    const remetenteId = req.user.id;
    const { destinatario_id, mensagem } = req.body;

    if (!destinatario_id || !mensagem) {
      return res.status(400).json({ error: 'Destinatário e mensagem são obrigatórios.' });
    }

    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO mensagens_privadas (id, remetente_id, destinatario_id, mensagem)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, remetenteId, destinatario_id, mensagem]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// Listar mensagens de um destinatário específico (usado por Admin/Coordenador para visualizar conversa)
const getMessagesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params; // ID do multiplicador
    const myId = req.user.id;

    const { rows } = await db.query(
      `SELECT m.*, u_rem.nome AS remetente_nome, u_dest.nome AS destinatario_nome
       FROM mensagens_privadas m
       LEFT JOIN users u_rem ON u_rem.id = m.remetente_id
       LEFT JOIN users u_dest ON u_dest.id = m.destinatario_id
       WHERE (m.remetente_id = $1 AND m.destinatario_id = $2)
          OR (m.remetente_id = $2 AND m.destinatario_id = $1)
       ORDER BY m.created_at ASC`,
      [myId, userId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Listar todos os multiplicadores ativos para exibir no painel de contatos do Coordenador
const getConversationsList = async (req, res, next) => {
  try {
    // Retorna todos os multiplicadores e a última mensagem trocada se houver
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, m.municipio,
              (SELECT msg.mensagem FROM mensagens_privadas msg 
               WHERE msg.destinatario_id = u.id OR msg.remetente_id = u.id
               ORDER BY msg.created_at DESC LIMIT 1) AS ultima_mensagem,
              (SELECT msg.created_at FROM mensagens_privadas msg 
               WHERE msg.destinatario_id = u.id OR msg.remetente_id = u.id
               ORDER BY msg.created_at DESC LIMIT 1) AS ultima_mensagem_data
       FROM users u
       JOIN multiplicadores m ON m.user_id = u.id
       WHERE u.role = 'multiplicador' AND u.ativo = true
       ORDER BY ultima_mensagem_data DESC NULLS LAST, u.nome ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMyMessages,
  getUnreadCount,
  sendPrivateMessage,
  getMessagesForUser,
  getConversationsList
};
