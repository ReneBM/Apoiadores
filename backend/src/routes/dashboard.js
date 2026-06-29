const router = require('express').Router();
const { getAdminStats, getMultiplicadorStats } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/dashboard/admin — KPIs gerais
router.get('/admin', requirePermission('Dashboard', 'visualizar'), getAdminStats);

// GET /api/dashboard/multiplicador — painel pessoal
router.get('/multiplicador', requirePermission('Dashboard', 'visualizar'), getMultiplicadorStats);

module.exports = router;

