const logger = require('./logger');

/**
 * Moderação de comentários do Feed.
 *
 * Caminho principal: análise com IA (Claude, da Anthropic) — entende contexto,
 * ironia e variações de grafia, em português. Exige ANTHROPIC_API_KEY.
 *
 * Caminho de contingência: sem chave configurada (dev local) ou com a API
 * indisponível, aplica um filtro local de termos claramente ofensivos.
 * A publicação de comentários nunca depende da IA estar no ar (fail-open
 * com rede de segurança local).
 */

const MODELO = process.env.MODERACAO_MODEL || 'claude-opus-5';

let client = null;
if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  client = new Anthropic({ timeout: 15000, maxRetries: 1 });
}

const iaConfigurada = () => Boolean(client);

// ── Filtro local ───────────────────────────────────────────────────────────
// Normaliza o texto antes de comparar: minúsculas, sem acentos, "leet"
// convertido (s4fado → safado) e letras repetidas colapsadas (idiiota →
// idiota). Compostos são casados também na versão sem espaços/pontuação,
// pegando "filha da puta", "f d p", "vai-se-foder" etc.
const normalizar = (texto) => String(texto)
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
  .replace(/[4@]/g, 'a').replace(/3/g, 'e').replace(/1/g, 'i')
  .replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't')
  .replace(/(\p{L})\1+/gu, '$1'); // colapsa letras repetidas

// Termos de UMA palavra (comparados palavra a palavra).
// Escreva já na forma normalizada: sem acento e sem letras duplas.
const PALAVRAS = [
  'safado', 'safada', 'vagabundo', 'vagabunda', 'vagaba', 'arombado', 'arombada',
  'desgracado', 'desgracada', 'babaca', 'imbecil', 'idiota', 'retardado', 'retardada',
  'corno', 'chifrudo', 'cuzao', 'otario', 'otaria', 'canalha', 'pilantra',
  'escroto', 'escrota', 'verme', 'piranha', 'vadia', 'biscate', 'rapariga',
  'caralho', 'krl', 'pora', 'pqp', 'vtnc', 'vsf', 'fdp', 'merda', 'bosta',
  'puta', 'cu', 'boiola', 'baitola', 'bicha', 'sapatao', 'traveco', 'viado',
  'macaco', 'macaca', 'criolo', 'criola', 'mongoloide',
];
const SET_PALAVRAS = new Set(PALAVRAS);

// Termos COMPOSTOS (casados na versão compacta, sem espaços/pontuação).
// Também já na forma normalizada.
const COMPOSTOS = [
  'filhodaputa', 'filhadaputa', 'fiodaputa', 'fiadaputa', 'filhaputa', 'filhoputa',
  'vaisefoder', 'sefoder', 'fodase', 'vaitomarnocu', 'tomarnocu', 'toncu',
  'putaquepariu', 'putaqueopariu', 'semvergonha', 'debilmental', 'lixohumano',
  'vaiamerda', 'vaiprocaralho', 'seumerda', 'suamerda', 'seubosta', 'suabosta',
];

// Palavras longas também entram na busca compacta, pegando grafias
// espaçadas ("i d i o t a") — só termos com 6+ letras, para evitar
// falsos positivos entre palavras vizinhas. Siglas de baixo risco entram
// também: nenhuma palavra do português contém essas sequências.
const SIGLAS_COMPACTAS = ['fdp', 'vsf', 'pqp', 'vtnc', 'krl'];
const COMPACTOS = [...COMPOSTOS, ...SIGLAS_COMPACTAS, ...PALAVRAS.filter((p) => p.length >= 6)];

const analisarLocal = (texto) => {
  const norm = normalizar(texto);
  const palavras = norm.split(/[^\p{L}]+/u).filter(Boolean);
  const compacto = palavras.join('');

  const bloqueou =
    palavras.some((p) => SET_PALAVRAS.has(p)) ||
    COMPACTOS.some((t) => compacto.includes(t));

  if (bloqueou) {
    return {
      permitido: false,
      categoria: 'ofensa',
      motivo: 'Linguagem ofensiva detectada pelo filtro local.',
      fonte: 'filtro-local',
    };
  }
  return { permitido: true, categoria: 'ok', motivo: '', fonte: 'filtro-local' };
};

// ── Análise com IA ─────────────────────────────────────────────────────────
const SCHEMA_MODERACAO = {
  type: 'object',
  properties: {
    permitido: {
      type: 'boolean',
      description: 'true se o comentário pode ser publicado; false se viola as diretrizes',
    },
    categoria: {
      type: 'string',
      enum: ['ok', 'ofensa', 'discurso_odio', 'ameaca', 'assedio', 'sexual', 'spam'],
      description: 'Categoria principal da violação, ou "ok" se permitido',
    },
    motivo: {
      type: 'string',
      description: 'Explicação breve (1 frase, em português) da decisão',
    },
  },
  required: ['permitido', 'categoria', 'motivo'],
  additionalProperties: false,
};

const PROMPT_SISTEMA = `Você é o moderador de comentários do feed de um aplicativo de mobilização política brasileiro (apoiadores de um senador). Analise cada comentário e decida se pode ser publicado.

BLOQUEIE (permitido=false):
- Xingamentos e insultos dirigidos a qualquer pessoa (ex.: idiota, vagabundo, palavrões dirigidos)
- Discurso de ódio: ataques por raça, religião, gênero, orientação sexual, deficiência ou origem
- Ameaças ou incitação à violência
- Assédio, humilhação ou exposição de dados pessoais de terceiros
- Conteúdo sexual explícito
- Spam evidente (correntes, links de golpe, propaganda repetitiva não relacionada)
Considere grafias disfarçadas (ex.: "v4gabundo", "i d i o t a") como violação.

PERMITA (permitido=true):
- Críticas políticas e discordâncias, mesmo duras, expressas sem insulto pessoal
- Ironia e humor sem alvo ofensivo
- Reclamações sobre serviços públicos e cobranças a políticos
- Erros de português, gírias e informalidade

Na dúvida entre crítica legítima e ofensa, prefira PERMITIR: este é um espaço de debate político e a liberdade de expressão importa. Bloqueie apenas violações claras.`;

const analisarComIA = async (texto) => {
  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 2048,
    system: [
      // O prompt é fixo — bloco único cacheável reduz custo por comentário.
      { type: 'text', text: PROMPT_SISTEMA, cache_control: { type: 'ephemeral' } },
    ],
    output_config: {
      effort: 'low', // classificação simples: rápido e barato, qualidade suficiente
      format: { type: 'json_schema', schema: SCHEMA_MODERACAO },
    },
    messages: [
      { role: 'user', content: `Comentário a analisar:\n"""\n${texto}\n"""` },
    ],
  });

  // Refusal/limite de tokens: não conseguimos classificar — cai na contingência.
  if (response.stop_reason !== 'end_turn') {
    logger.warn(`Moderação IA: stop_reason inesperado (${response.stop_reason}) — usando filtro local.`);
    return null;
  }

  const bloco = response.content.find((b) => b.type === 'text');
  if (!bloco) return null;

  const resultado = JSON.parse(bloco.text);
  return { ...resultado, fonte: 'ia' };
};

/**
 * Analisa um comentário e decide se pode ser publicado.
 * Nunca lança: em caso de falha da IA, usa o filtro local.
 * @param {string} texto
 * @returns {Promise<{permitido: boolean, categoria: string, motivo: string, fonte: string}>}
 */
const analisarComentario = async (texto) => {
  // O filtro local roda SEMPRE primeiro: bloqueio garantido dos termos
  // conhecidos (independente da IA) e economia de chamadas de API.
  const local = analisarLocal(texto);
  if (!local.permitido) return local;

  if (!iaConfigurada()) return local;

  try {
    const resultado = await analisarComIA(texto);
    if (resultado) return resultado;
  } catch (err) {
    logger.error('Moderação IA indisponível — usando filtro local.', { message: err.message });
  }
  return local;
};

module.exports = { analisarComentario, iaConfigurada };
