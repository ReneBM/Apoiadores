const db = require('../config/database');
const logger = require('./logger');
const { cifrar, decifrar } = require('./cripto');

/**
 * Configurações do sistema editáveis pelo painel (tela de Configurações).
 *
 * Ordem de precedência: valor salvo no banco → variável de ambiente → padrão.
 * Isso mantém compatibilidade com quem já configurou por variável de ambiente
 * e permite ajustar tudo pelo app, sem novo deploy.
 */

// chave → { sensivel, env (fallback), padrao }
const DEFINICOES = {
  MAIL_USER:      { sensivel: false, env: 'MAIL_USER' },
  MAIL_PASS:      { sensivel: true,  env: 'MAIL_PASS' },
  MAIL_FROM_NAME: { sensivel: false, env: 'MAIL_FROM_NAME', padrao: 'Time SV' },

  // ── Textos dos e-mails (editáveis em Configurações → Mensagens) ──────────
  // O layout/marca do e-mail é fixo; aqui se edita o que o usuário lê.
  EMAIL_RESET_ASSUNTO: {
    sensivel: false,
    padrao: '🔐 Código para Redefinição de Senha',
  },
  EMAIL_RESET_TITULO: {
    sensivel: false,
    padrao: 'Código de Recuperação de Senha',
  },
  EMAIL_RESET_TEXTO: {
    sensivel: false,
    padrao: 'Recebemos uma solicitação para redefinir a senha da sua conta. Se foi você, utilize o código de 6 dígitos abaixo para continuar o processo.',
  },
  EMAIL_RESET_AVISO: {
    sensivel: false,
    padrao: 'Este código expira em 15 minutos. Se você não solicitou a redefinição, apenas ignore este e-mail.',
  },

  EMAIL_ACESSO_ASSUNTO: {
    sensivel: false,
    padrao: '🔐 Seu acesso ao sistema foi criado',
  },
  EMAIL_ACESSO_TITULO: {
    sensivel: false,
    padrao: 'Seu acesso foi criado!',
  },
  EMAIL_ACESSO_TEXTO: {
    sensivel: false,
    padrao: 'Você agora faz parte da nossa rede de mobilização. Use os dados abaixo para fazer seu primeiro acesso ao aplicativo.',
  },
  EMAIL_ACESSO_AVISO: {
    sensivel: false,
    padrao: 'Esta é uma senha temporária. No primeiro acesso, você será obrigado a criar uma senha definitiva. Não compartilhe esta senha com ninguém.',
  },

  // ── WhatsApp (Cloud API oficial da Meta) ────────────────────────────────
  // O texto das mensagens NÃO fica aqui: a Meta exige que cada modelo seja
  // cadastrado e aprovado no painel dela. Aqui guardamos só o acesso e o
  // nome de cada modelo aprovado.
  WHATSAPP_ATIVO:      { sensivel: false, env: 'WHATSAPP_ATIVO', padrao: 'nao' },
  WHATSAPP_TOKEN:      { sensivel: true,  env: 'WHATSAPP_TOKEN' },
  WHATSAPP_PHONE_ID:   { sensivel: false, env: 'WHATSAPP_PHONE_ID' },
  WHATSAPP_IDIOMA:     { sensivel: false, env: 'WHATSAPP_IDIOMA', padrao: 'pt_BR' },
  WHATSAPP_TPL_RESET:  { sensivel: false, padrao: 'codigo_recuperacao' },
  WHATSAPP_TPL_ACESSO: { sensivel: false, padrao: 'acesso_criado' },
  WHATSAPP_TPL_AVISO:  { sensivel: false, padrao: 'aviso_campanha' },
};

/** Variáveis aceitas em cada texto (usadas na tela de Configurações). */
const VARIAVEIS = {
  EMAIL_RESET_TEXTO:  ['{{nome}}'],
  EMAIL_RESET_TITULO: ['{{nome}}'],
  EMAIL_ACESSO_TEXTO: ['{{nome}}', '{{email}}'],
  EMAIL_ACESSO_TITULO: ['{{nome}}'],
};

const CHAVES = Object.keys(DEFINICOES);

// Cache curto: em serverless cada invocação começa limpa, mas dentro de uma
// mesma requisição/execução evita repetir a consulta.
let cache = null;
let cacheEm = 0;
const CACHE_MS = 30 * 1000;

const invalidarCache = () => { cache = null; cacheEm = 0; };

const carregarDoBanco = async () => {
  if (cache && Date.now() - cacheEm < CACHE_MS) return cache;
  const mapa = {};
  try {
    const { rows } = await db.query('SELECT chave, valor, sensivel FROM configuracoes');
    rows.forEach((r) => {
      if (r.valor === null || r.valor === '') return;
      mapa[r.chave] = r.sensivel ? decifrar(r.valor) : r.valor;
    });
  } catch (err) {
    // Tabela ainda não criada (migration pendente): segue só com o ambiente
    logger.warn('Configurações indisponíveis no banco; usando variáveis de ambiente.', { message: err.message });
  }
  cache = mapa;
  cacheEm = Date.now();
  return cache;
};

/** Lê uma configuração (banco → ambiente → padrão). */
const obterConfig = async (chave) => {
  const def = DEFINICOES[chave];
  if (!def) throw new Error(`Configuração desconhecida: ${chave}`);
  const doBanco = (await carregarDoBanco())[chave];
  if (doBanco) return doBanco;
  if (def.env && process.env[def.env]) return process.env[def.env];
  return def.padrao ?? null;
};

/** Lê várias configurações de uma vez. */
const obterConfigs = async (chaves = CHAVES) => {
  const out = {};
  for (const c of chaves) out[c] = await obterConfig(c);
  return out;
};

/** Grava uma configuração (cifra quando sensível). Valor vazio limpa o registro. */
const salvarConfig = async (chave, valor, userId) => {
  const def = DEFINICOES[chave];
  if (!def) throw new Error(`Configuração desconhecida: ${chave}`);

  const vazio = valor === null || valor === undefined || String(valor).trim() === '';
  const armazenado = vazio ? null : (def.sensivel ? cifrar(String(valor).trim()) : String(valor).trim());

  await db.query(
    `INSERT INTO configuracoes (chave, valor, sensivel, updated_at, updated_by)
     VALUES ($1, $2, $3, now(), $4)
     ON CONFLICT (chave) DO UPDATE
       SET valor = EXCLUDED.valor, sensivel = EXCLUDED.sensivel,
           updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [chave, armazenado, def.sensivel, userId || null]
  );
  invalidarCache();
};

/** Indica se a chave veio do banco (true) ou do ambiente/padrão (false). */
const definidaNoBanco = async (chave) => Boolean((await carregarDoBanco())[chave]);

/**
 * Aplica as variáveis ({{nome}}, {{codigo}}…) a um texto e o converte para
 * HTML seguro: escapa o conteúdo (o texto vem do painel e vai para dentro do
 * e-mail) e transforma quebras de linha em <br>.
 */
const renderizarTexto = (texto, valores = {}) => {
  const escapar = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const comValores = String(texto || '').replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (_, chave) => (chave in valores ? String(valores[chave]) : '')
  );

  return escapar(comValores).replace(/\r?\n/g, '<br>');
};

module.exports = {
  DEFINICOES, CHAVES, VARIAVEIS,
  obterConfig, obterConfigs, salvarConfig, definidaNoBanco, invalidarCache,
  renderizarTexto,
};
