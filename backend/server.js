require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const apoiadorRoutes = require('./src/routes/apoiadores');
const dashboardRoutes = require('./src/routes/dashboard');
const exportRoutes = require('./src/routes/export');
const noticiasRoutes = require('./src/routes/noticias');
const materiaisRoutes = require('./src/routes/materiais');
const mensagensRoutes = require('./src/routes/mensagens');
const chatRoutes = require('./src/routes/chat');
const perfisRoutes = require('./src/routes/perfis');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;


// Confiar em proxies (necessário para túneis / reverse proxies)
app.set('trust proxy', 1);

// ── Segurança ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Permite qualquer origem em desenvolvimento/túneis
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global (desabilitado/aumentado para a apresentação)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use(limiter);

// Rate limiting mais restrito para rotas de autenticação (desabilitado/aumentado para a apresentação)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 999999,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// ── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Logging de requisições ─────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path} — IP: ${req.ip}`);
  next();
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rotas ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/apoiadores', apoiadorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/noticias', noticiasRoutes);
app.use('/api/materiais', materiaisRoutes);
app.use('/api/mensagens', mensagensRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/perfis', perfisRoutes);


// Servir arquivos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA Fallback para rotas não-API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ── Tratamento global de erros ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Erro interno do servidor.'
    : err.message;

  res.status(statusCode).json({ error: message });
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
