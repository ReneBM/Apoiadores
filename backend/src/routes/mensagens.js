const router = require('express').Router();
const { list, create, getActiveAnnouncements } = require('../controllers/mensagemController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/mensagens/popup - disponível para exibir avisos popup
router.get('/popup', getActiveAnnouncements);

// GET /api/mensagens - ver histórico de disparos
router.get('/', requirePermission('Mensagens', 'visualizar'), list);

// POST /api/mensagens - efetuar disparos
router.post('/', requirePermission('Mensagens', 'criar'), create);

module.exports = router;

