const router = require('express').Router();
const { login, refresh, logout, me, changePassword, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, loginSchema } = require('../middleware/validate');

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me  — requer autenticação
router.get('/me', authenticate, me);

// PATCH /api/auth/change-password — requer autenticação
router.patch('/change-password', authenticate, changePassword);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/verify-code
router.post('/verify-code', verifyResetCode);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

module.exports = router;
