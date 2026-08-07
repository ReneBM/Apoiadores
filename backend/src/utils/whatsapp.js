const db = require('../config/database');
const logger = require('./logger');
const { obterConfig, renderizarSimples } = require('./config');

/**
 * Envio de mensagens pela Evolution API.
 *
 * Diferente da API oficial da Meta, aqui não existe modelo aprovado: a
 * Evolution conversa com um WhatsApp comum pareado por QR Code, então o texto
 * é livre e fica editável em Configurações → Mensagens.
 *
 * Em troca, o número está sujeito às regras de uso do WhatsApp — volume alto e
 * mensagens não solicitadas podem levar a bloqueio. Por isso os disparos saem
 * espaçados (ver DELAY_MS) e respeitam descadastro.
 */

const TIMEOUT_MS = 20000;

// Intervalo que a Evolution simula "digitando" antes de entregar. Espaçar o
// envio deixa o tráfego menos robótico, que é o que dispara bloqueio.
const DELAY_MS = 1200;

/**
 * Converte um telefone brasileiro para o formato do WhatsApp
 * (só dígitos, com código do país): 5584999998888.
 *
 * Aceita o que o cadastro produz — "(84) 99999-8888", "84 9 9999 8888",
 * "+55 84 99999-8888" — e devolve null quando não dá para confiar no número.
 */
const normalizarTelefone = (bruto) => {
  let d = String(bruto || '').replace(/\D/g, '');
  if (!d) return null;

  // Zeros de discagem nacional/internacional que às vezes sobram no cadastro
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length > 11 && d.startsWith('0')) d = d.slice(1);

  // Já veio com o 55 na frente
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }

  // Sem DDD não há como adivinhar a região — melhor não enviar para o número errado
  if (d.length < 10) return null;
  if (d.length > 11) return null;

  const ddd = d.slice(0, 2);
  let numero = d.slice(2);

  if (Number(ddd) < 11) return null;

  // Celular antigo de 8 dígitos: no Brasil todos ganharam o 9 na frente
  if (numero.length === 8 && /^[6-9]/.test(numero)) numero = `9${numero}`;

  // 8 dígitos começando com 2–5 é telefone fixo: não tem WhatsApp
  if (numero.length === 8) return null;

  return `55${ddd}${numero}`;
};

/** Telefone formatado para exibição/log: (84) 99999-8888 */
const formatarTelefone = (e164) => {
  const d = String(e164 || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length !== 11) return e164;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Tira a barra final para não montar URL com // no meio. */
const baseUrl = async () => String((await obterConfig('WHATSAPP_URL')) || '').trim().replace(/\/+$/, '');

/** Só envia quando o admin ligou a chave e preencheu servidor, chave e instância. */
const whatsappConfigurado = async () => {
  const ativo = (await obterConfig('WHATSAPP_ATIVO')) === 'sim';
  const url = await baseUrl();
  const apikey = await obterConfig('WHATSAPP_APIKEY');
  const instancia = await obterConfig('WHATSAPP_INSTANCIA');
  return Boolean(ativo && url && apikey && instancia);
};

const registrarEnvio = async ({ telefone, tipo, template, status, erro, messageId, referencia }) => {
  try {
    await db.query(
      `INSERT INTO whatsapp_envios (telefone, tipo, template, status, erro, message_id, referencia)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [telefone, tipo, template || null, status, erro ? String(erro).slice(0, 500) : null,
       messageId || null, referencia || null]
    );
  } catch (err) {
    logger.error('Falha ao registrar envio de WhatsApp', { message: err.message });
  }
};

/**
 * Extrai a mensagem de erro útil da resposta da Evolution.
 * O formato varia entre versões: ora `response.message` (lista), ora `message`,
 * ora só `error`.
 */
const mensagemDeErro = async (resposta) => {
  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    return `HTTP ${resposta.status}`;
  }

  const partes = corpo?.response?.message ?? corpo?.message ?? corpo?.error;
  const texto = Array.isArray(partes)
    ? partes.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join('; ')
    : (typeof partes === 'string' ? partes : '');

  if (resposta.status === 401 || resposta.status === 403) {
    return texto || 'Chave de API recusada pelo servidor.';
  }
  if (resposta.status === 404) {
    return texto || 'Instância não encontrada no servidor. Confira o nome.';
  }
  return texto || `HTTP ${resposta.status}`;
};

const chamarApi = async (caminho, opcoes = {}) => {
  const url = await baseUrl();
  if (!url) throw new Error('Endereço do servidor Evolution não configurado.');
  const apikey = await obterConfig('WHATSAPP_APIKEY');
  if (!apikey) throw new Error('Chave de API do Evolution não configurada.');

  return fetch(`${url}${caminho}`, {
    ...opcoes,
    headers: {
      apikey,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
};

/**
 * Corpo do envio de texto.
 *
 * A v2 achatou o payload; a v1 aninhava em `textMessage`/`options`. Como o
 * admin não tem como saber qual versão o servidor dele roda, mandamos no
 * formato v2 e, se ele for recusado por validação, repetimos no formato v1.
 */
const corpoTexto = (numero, texto, versaoAntiga) => (
  versaoAntiga
    ? { number: numero, options: { delay: DELAY_MS, presence: 'composing' }, textMessage: { text: texto } }
    : { number: numero, text: texto, delay: DELAY_MS }
);

/** Id da mensagem, que também muda de lugar entre as versões. */
const extrairMessageId = (dados) =>
  dados?.key?.id || dados?.messageId || dados?.message?.key?.id || null;

/**
 * Envia um texto pelo WhatsApp.
 *
 * Devolve { ok, messageId, erro } em vez de lançar: nenhum envio de WhatsApp
 * deve derrubar a operação principal (aprovar cadastro, redefinir senha).
 */
const enviarTexto = async ({ para, texto, tipo = 'avulso', referencia = null }) => {
  const telefone = normalizarTelefone(para);
  if (!telefone) {
    return { ok: false, erro: 'Telefone inválido ou sem DDD.' };
  }

  if (!String(texto || '').trim()) {
    return { ok: false, erro: 'Mensagem vazia.' };
  }

  if (!(await whatsappConfigurado())) {
    return { ok: false, erro: 'WhatsApp não configurado.' };
  }

  const instancia = await obterConfig('WHATSAPP_INSTANCIA');
  const caminho = `/message/sendText/${encodeURIComponent(instancia)}`;

  const tentar = async (versaoAntiga) => chamarApi(caminho, {
    method: 'POST',
    body: JSON.stringify(corpoTexto(telefone, texto, versaoAntiga)),
  });

  try {
    let resposta = await tentar(false);

    // 400 aqui costuma ser o servidor rodando a v1, que não reconhece o
    // payload achatado. Tenta o formato antigo antes de desistir.
    if (resposta.status === 400) {
      const tentativaV1 = await tentar(true);
      if (tentativaV1.ok) resposta = tentativaV1;
    }

    if (!resposta.ok) {
      const erro = await mensagemDeErro(resposta);
      await registrarEnvio({ telefone, tipo, template: instancia, status: 'erro', erro, referencia });
      logger.warn('WhatsApp não enviado', { tipo, erro });
      return { ok: false, erro };
    }

    const dados = await resposta.json().catch(() => ({}));
    const messageId = extrairMessageId(dados);
    await registrarEnvio({ telefone, tipo, template: instancia, status: 'enviado', messageId, referencia });
    return { ok: true, messageId };
  } catch (err) {
    const erro = err.name === 'TimeoutError'
      ? 'Tempo esgotado ao falar com o servidor Evolution.'
      : err.message;
    await registrarEnvio({ telefone, tipo, template: instancia, status: 'erro', erro, referencia });
    logger.error('Erro ao enviar WhatsApp', { tipo, message: erro });
    return { ok: false, erro };
  }
};

/**
 * Confere se o servidor responde e se a instância está pareada (sem enviar).
 * `state: 'open'` é o único estado em que a instância entrega mensagem.
 */
const testarConexao = async () => {
  const instancia = await obterConfig('WHATSAPP_INSTANCIA');
  if (!instancia) throw new Error('Informe o nome da instância.');

  const resposta = await chamarApi(`/instance/connectionState/${encodeURIComponent(instancia)}`);
  if (!resposta.ok) throw new Error(await mensagemDeErro(resposta));

  const dados = await resposta.json();
  const estado = dados?.instance?.state || dados?.state || 'desconhecido';

  if (estado !== 'open') {
    const explicacao = {
      close: 'a instância está desconectada — leia o QR Code novamente no painel do Evolution',
      connecting: 'a instância está conectando — aguarde alguns segundos e teste de novo',
    }[estado] || `estado "${estado}"`;
    throw new Error(`Servidor respondeu, mas ${explicacao}.`);
  }

  return { instancia, estado };
};

// ── Envios do sistema ────────────────────────────────────────────────────────

/** Monta o texto a partir do que está salvo em Configurações → Mensagens. */
const textoDe = async (chave, valores) => renderizarSimples(await obterConfig(chave), valores);

const enviarCodigoRecuperacao = async (telefone, codigo, nome = '') => enviarTexto({
  para: telefone,
  texto: await textoDe('ZAP_RESET_TEXTO', { codigo, nome }),
  tipo: 'reset_senha',
});

const enviarPrimeiroAcesso = async (telefone, nome, email, senhaTemp) => enviarTexto({
  para: telefone,
  texto: await textoDe('ZAP_ACESSO_TEXTO', { nome, email, senha: senhaTemp }),
  tipo: 'primeiro_acesso',
});

const enviarAvisoCampanha = async (telefone, nome, mensagem, referencia) => enviarTexto({
  para: telefone,
  texto: await textoDe('ZAP_AVISO_TEXTO', { nome, mensagem }),
  tipo: 'disparo',
  referencia,
});

module.exports = {
  normalizarTelefone,
  formatarTelefone,
  whatsappConfigurado,
  enviarTexto,
  testarConexao,
  enviarCodigoRecuperacao,
  enviarPrimeiroAcesso,
  enviarAvisoCampanha,
};
