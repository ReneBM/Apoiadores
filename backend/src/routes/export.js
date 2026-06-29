const router = require('express').Router();
const { exportApoiadores } = require('../controllers/exportController');
const { authenticate } = require('../middleware/auth');
const { requirePermission, ownResourceOnly } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/export/apoiadores?cidade=&status=&...
// Exporta apoiadores (multiplicador exporta apenas os seus)
router.get(
  '/apoiadores',
  requirePermission('Apoiadores', 'visualizar'),
  ownResourceOnly,
  exportApoiadores
);

module.exports = router;

