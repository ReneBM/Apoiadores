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

module.exports = { DEFINICOES, CHAVES, obterConfig, obterConfigs, salvarConfig, definidaNoBanco, invalidarCache };
