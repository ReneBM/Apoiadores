const { z } = require('zod');

/**
 * Factory de middleware de validação com Zod.
 * Valida req.body contra o schema fornecido.
 * Retorna 400 com lista de erros em português se inválido.
 *
 * @param {z.ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      campo: e.path.join('.'),
      mensagem: e.message,
    }));
    return res.status(400).json({ error: 'Dados inválidos.', detalhes: errors });
  }

  req.body = result.data; // dados sanitizados
  next();
};

// ── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
});

const apoiadorSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.').max(150),
  telefone: z.string().max(20).optional().nullable(),
  cidade: z.string().min(2, 'Cidade obrigatória.').max(100),
  bairro: z.string().max(100).optional().nullable(),
  interesse: z.string().max(500).optional().nullable(),
  observacoes: z.string().max(1000).optional().nullable(),
  consentimento_lgpd: z.literal(true, {
    errorMap: () => ({ message: 'O consentimento LGPD é obrigatório.' }),
  }),
  multiplicador_id: z.preprocess((val) => (val === '' ? null : val), z.string().uuid('ID de multiplicador inválido.').optional().nullable()),
  status: z.enum(['ativo', 'inativo', 'pendente']).default('ativo'),
});

const apoiadorUpdateSchema = apoiadorSchema
  .omit({ consentimento_lgpd: true })
  .partial()
  .extend({
    status: z.enum(['ativo', 'inativo', 'pendente']).optional(),
  });

const userSchema = z.object({
  nome: z.string().min(3).max(150),
  email: z.string().email('E-mail inválido.'),
  // Senha opcional para multiplicadores (gerada automaticamente pelo backend)
  senha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número.')
    .optional()
    .nullable(),
  role: z.enum(['admin', 'coordenador', 'multiplicador']),
  municipio: z.string().max(100).optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  coordenador_id: z.preprocess((val) => (val === '' ? null : val), z.string().uuid().optional().nullable()),
  meta_apoiadores: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(val) ? 0 : Number(val)),
    z.number().int().min(0).default(0)
  ),
});

const userUpdateSchema = userSchema.partial();

module.exports = {
  validate,
  loginSchema,
  apoiadorSchema,
  apoiadorUpdateSchema,
  userSchema,
  userUpdateSchema,
};
