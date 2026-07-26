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

// ── Filtro local de contingência ───────────────────────────────────────────
// Apenas termos inequivocamente ofensivos; casos sutis ficam para a IA.
// \b não funciona bem com acentos, então usamos limites manuais.
const TERMOS_BLOQUEADOS = [
  'vagabund[oa]', 'arrombad[oa]', 'desgraçad[oa]', 'filho da puta', 'fdp',
  'vai se foder', 'vsf', 'foda-se', 'fod[ae]se', 'cuzão', 'babac[a]',
  'imbecil', 'idiota', 'retardad[oa]', 'corno', 'puta que pariu',
  'viad[oa]o?\\b', 'macac[oa]\\b', 'crioul[oa]',
];
const REGEX_LOCAL = new RegExp(`(^|[^\\p{L}])(${TERMOS_BLOQUEADOS.join('|')})($|[^\\p{L}])`, 'iu');

const analisarLocal = (texto) => {
  if (REGEX_LOCAL.test(texto)) {
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
  if (!iaConfigurada()) {
    return analisarLocal(texto);
  }
  try {
    const resultado = await analisarComIA(texto);
    if (resultado) return resultado;
  } catch (err) {
    logger.error('Moderação IA indisponível — usando filtro local.', { message: err.message });
  }
  return analisarLocal(texto);
};

module.exports = { analisarComentario, iaConfigurada };
