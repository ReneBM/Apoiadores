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
const cmsRoutes = require('./src/routes/cms');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;


// Confiar em proxies (necessário para túneis / reverse proxies)
app.set('trust proxy', 1);

// ── Segurança ──────────────────────────────────────────────────────────────
// CSP sob medida: endurece contra XSS (tokens ficam no localStorage) sem quebrar
// o app. 'unsafe-inline' é mantido apenas onde é realmente necessário:
//  - scriptSrc: o vite-plugin-pwa injeta um <script> inline de registro do SW;
//  - styleSrc: o frontend usa estilos inline extensivamente + Google Fonts.
// Imagens/mídia vêm de hosts externos (IBGE, senado.leg.br, placeholders), por
// isso https:/data:/blob: são liberados nessas diretivas.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      workerSrc: ["'self'", 'blob:'],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

// CORS restrito à(s) origem(ns) definida(s) em FRONTEND_URL (lista separada por
// vírgula). Requisições sem Origin (same-origin, apps mobile, curl) são aceitas.
// Se FRONTEND_URL não estiver configurada, mantém o comportamento permissivo
// anterior para não derrubar deploys ainda não parametrizados.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3001');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Origem não autorizada: rejeita sem lançar erro — o navegador bloqueia a
    // resposta pela ausência dos cabeçalhos CORS, sem gerar um 500 nos logs.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global — protege contra abuso mantendo folga para uso legítimo.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use(limiter);

// Rate limiting restrito para autenticação: só tentativas malsucedidas contam,
// então logins válidos não penalizam o usuário, mas brute-force é barrado.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// ── CMS ────────────────────────────────────────────────────────────────────
// Montado ANTES do body parser global: o conteúdo das páginas (JSONB) passa
// de 10kb, e o router do CMS define seu próprio express.json com 2mb.
app.use('/api/cms', cmsRoutes);

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


const fs = require('fs');

// Servir arquivos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Site de campanha (TIME SV) + painel CMS em /campanha e /campanha/admin
app.use('/campanha', express.static(path.join(__dirname, '../site-campanha')));

// Servir arquivos estáticos do Frontend (se compilado)
const distPath = path.join(__dirname, '../frontend/dist');
const indexHtmlPath = path.join(distPath, 'index.html');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// SPA Fallback para rotas não-API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Mandato Senador Styvenson Valentim - Backend API</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #001a38; color: #fff; display: flex; height: 100vh; align-items: center; justify-content: center; margin: 0; text-align: center; }
          .card { background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; }
          h1 { color: #60a5fa; margin-top: 0; }
          p { color: #cbd5e1; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Backend API On-line ✅</h1>
          <p>O servidor backend está rodando normalmente.</p>
          <p><small>A compilação do frontend está em andamento. Atualize esta página em instantes ou configure o Build Command no Render como: <code>cd frontend && npm install && npm run build && cd ../backend && npm install</code></small></p>
        </div>
      </body>
    </html>
  `);
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
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV}]`);
  });
}

module.exports = app;
