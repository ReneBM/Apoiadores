const router = require('express').Router();
const {
  list, create, remove, toggleCurtida, listComentarios, createComentario, removeComentario,
} = require('../controllers/noticiaController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const { uploadArquivo, isConfigured: storageConfigurado } = require('../utils/storage');

// O filesystem da Vercel é efêmero/somente-leitura: em produção o arquivo vai
// para o Supabase Storage (memoryStorage). Sem Supabase configurado (dev local),
// mantemos a gravação em disco para não quebrar o ambiente de desenvolvimento.
const storage = storageConfigurado
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'feed-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

// Filtro de tipos de arquivos (imagens e vídeos)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/i;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo inválido! Envie apenas imagens (JPG/PNG/GIF) ou vídeos (MP4/MOV/AVI/WEBM).'));
  }
};

// Funções serverless da Vercel aceitam ~4,5MB por requisição; acima disso a
// plataforma corta antes de chegar aqui. Mantemos 4MB para falhar com uma
// mensagem clara em vez de um erro genérico da infraestrutura.
const LIMITE_UPLOAD_MB = 4;

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: LIMITE_UPLOAD_MB * 1024 * 1024 }
});

router.use(authenticate);

// GET /api/noticias - todos listam
router.get('/', requirePermission('Feed de Notícias', 'visualizar'), list);

// POST /api/noticias - cria notícia
router.post('/', requirePermission('Feed de Notícias', 'criar'), create);

// DELETE /api/noticias/:id - deleta notícia
router.delete('/:id', requirePermission('Feed de Notícias', 'excluir'), remove);

// ── Interações (qualquer usuário com acesso ao feed) ──────────────────────
// POST /api/noticias/:id/curtir - curtir/descurtir (toggle)
router.post('/:id/curtir', requirePermission('Feed de Notícias', 'visualizar'), toggleCurtida);

// GET /api/noticias/:id/comentarios - lista todos os comentários
router.get('/:id/comentarios', requirePermission('Feed de Notícias', 'visualizar'), listComentarios);

// POST /api/noticias/:id/comentarios - adiciona comentário
router.post('/:id/comentarios', requirePermission('Feed de Notícias', 'visualizar'), createComentario);

// DELETE /api/noticias/comentarios/:comentarioId - autor ou staff exclui
router.delete('/comentarios/:comentarioId', removeComentario);

// POST /api/noticias/upload - upload de mídia
router.post(
  '/upload',
  requirePermission('Feed de Notícias', 'criar'),
  (req, res, next) => {

    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `Arquivo muito grande. O limite é de ${LIMITE_UPLOAD_MB}MB — comprima a imagem ou envie o vídeo por link.`,
          });
        }
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    // Dev local (sem Supabase): arquivo já foi gravado em disco pelo multer.
    if (!storageConfigurado) {
      return res.json({ url: `/uploads/${req.file.filename}` });
    }

    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const nome = `feed-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const url = await uploadArquivo(req.file.buffer, nome, req.file.mimetype);
      res.json({ url });
    } catch (err) {
      // Mensagem explícita: o erro genérico de 500 esconderia a causa real
      // (bucket sem permissão, chave inválida etc.) em produção.
      logger.error('Falha ao enviar mídia para o Supabase Storage', { message: err.message });
      return res.status(502).json({
        error: `Não foi possível salvar a mídia: ${err.message}`,
      });
    }
  }
);

module.exports = router;

