const router = require('express').Router();
const { list, create, remove } = require('../controllers/noticiaController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do armazenamento de uploads (pasta uploads na raiz do backend)
const storage = multer.diskStorage({
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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // Limite de 50MB
});

router.use(authenticate);

// GET /api/noticias - todos listam
router.get('/', requirePermission('Notícias', 'visualizar'), list);

// POST /api/noticias - cria notícia
router.post('/', requirePermission('Notícias', 'criar'), create);

// DELETE /api/noticias/:id - deleta notícia
router.delete('/:id', requirePermission('Notícias', 'excluir'), remove);

// POST /api/noticias/upload - upload de mídia
router.post(
  '/upload',
  requirePermission('Notícias', 'criar'),
  (req, res, next) => {

    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  }
);

module.exports = router;

