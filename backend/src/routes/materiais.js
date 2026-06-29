const router = require('express').Router();
const { list, create, remove } = require('../controllers/materialController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/materiais - todos podem listar
router.get('/', requirePermission('Materiais', 'visualizar'), list);

// POST /api/materiais - criar material
router.post('/', requirePermission('Materiais', 'criar'), create);

// DELETE /api/materiais/:id - excluir material
router.delete('/:id', requirePermission('Materiais', 'excluir'), remove);

module.exports = router;

