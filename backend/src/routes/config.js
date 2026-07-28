const router = require('express').Router();
const { getConfiguracoes, updateConfiguracoes, testarEmail, testarWhatsapp } = require('../controllers/configController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Configurações do sistema guardam credenciais: exclusivo para administradores.
router.use(authenticate, requireRole('admin'));

// GET /api/config — estado atual (segredos apenas mascarados)
router.get('/', getConfiguracoes);

// PUT /api/config — grava as configurações
router.put('/', updateConfiguracoes);

// POST /api/config/testar-email — valida as credenciais / envia teste
router.post('/testar-email', testarEmail);

// POST /api/config/testar-whatsapp — valida token e número / envia teste
router.post('/testar-whatsapp', testarWhatsapp);

module.exports = router;
