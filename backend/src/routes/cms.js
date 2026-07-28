const router = require('express').Router();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cms = require('../controllers/cmsController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/* ==============================================================
   Rotas do CMS
   Papéis: admin (super administrador) — tudo, inclusive config;
           coordenador (editor) — conteúdo, mídia e publicação;
           multiplicador (visualizador) — somente leitura.
   ============================================================== */

// O conteúdo de página (JSONB) passa de 10kb — parser próprio com limite maior.
// Este router é montado ANTES do express.json global (ver server.js).
router.use(express.json({ limit: '2mb' }));

// Upload em memória: o destino final é o Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const permitidos = /jpeg|jpg|png|gif|webp|svg|mp4|webm|pdf|docx?|xlsx?|ico/i;
    const ok = permitidos.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Tipo de arquivo não permitido.'), ok);
  },
});

// ── Público (site) ─────────────────────────────────────────────
router.get('/public/pagina/:slug', cms.paginaPublica);
router.post('/public/hit', cms.registrarAcesso);

// ── Autenticado ────────────────────────────────────────────────
router.use(authenticate);

// Leitura: qualquer usuário logado (inclui visualizador)
router.get('/dashboard', cms.dashboard);
router.get('/paginas', cms.listarPaginas);
router.get('/paginas/:id/conteudo', cms.obterConteudo);
router.get('/paginas/:id/revisoes', cms.listarRevisoes);
router.get('/revisoes/:revId', cms.obterRevisao);
router.get('/midia', cms.listarMidia);
router.get('/auditoria', cms.listarAuditoria);
router.get('/configuracoes', cms.obterConfig);

// Escrita: admin e coordenador (editor)
const editor = requireRole('admin', 'coordenador');
router.post('/paginas', editor, cms.criarPagina);
router.put('/paginas/:id', editor, cms.atualizarPagina);
router.delete('/paginas/:id', requireRole('admin'), cms.excluirPagina);
router.post('/paginas/:id/duplicar', editor, cms.duplicarPagina);
router.put('/paginas/:id/rascunho', editor, cms.salvarRascunho);
router.post('/paginas/:id/publicar', editor, cms.publicar);
router.post('/paginas/:id/despublicar', editor, cms.despublicar);
router.post('/revisoes/:revId/restaurar', editor, cms.restaurarRevisao);
router.post('/midia', editor, upload.single('arquivo'), cms.enviarMidia);
router.put('/midia/:id', editor, cms.atualizarMidia);
router.delete('/midia/:id', editor, cms.excluirMidia);

// Configurações globais: somente admin
router.put('/configuracoes', requireRole('admin'), cms.salvarConfig);

module.exports = router;
