const router = require('express').Router();
const {
  listMyMessages,
  getUnreadCount,
  sendPrivateMessage,
  getMessagesForUser,
  getConversationsList
} = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

// Rotas comuns (qualquer usuário logado)
router.get('/my-messages', listMyMessages);
router.get('/unread-count', getUnreadCount);

// Rotas de Coordenação
router.post('/private', requirePermission('Mensagens', 'criar'), sendPrivateMessage);
router.get('/private/:userId', requirePermission('Mensagens', 'visualizar'), getMessagesForUser);
router.get('/conversations', requirePermission('Mensagens', 'visualizar'), getConversationsList);

module.exports = router;

