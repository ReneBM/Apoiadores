const db = require('../config/database');
const logger = require('./logger');
const { obterConfig } = require('./config');

/**
 * Envio de mensagens pela WhatsApp Cloud API (oficial da Meta).
 *
 * Fora da janela de 24h após a pessoa falar com o número, a Meta só entrega
 * mensagens em modelos (templates) previamente aprovados — que é o caso de
 * todos os envios daqui. Por isso tudo passa por `enviarTemplate`.
 */

const API_VERSION = 'v21.0';
const TIMEOUT_MS = 15000;

/**
 * Converte um telefone brasileiro para o formato que a Meta espera
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

/** Só envia quando o admin ligou a chave e preencheu token + número. */
const whatsappConfigurado = async () => {
  const ativo = (await obterConfig('WHATSAPP_ATIVO')) === 'sim';
  const token = await obterConfig('WHATSAPP_TOKEN');
  const phoneId = await obterConfig('WHATSAPP_PHONE_ID');
  return Boolean(ativo && token && phoneId);
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

/** Extrai a mensagem de erro útil de dentro da resposta da Meta. */
const mensagemDeErro = async (resposta) => {
  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    return `HTTP ${resposta.status}`;
  }
  const e = corpo?.error;
  if (!e) return `HTTP ${resposta.status}`;
  const detalhe = e.error_data?.details;
  return [e.message, detalhe].filter(Boolean).join(' — ') || `HTTP ${resposta.status}`;
};

const chamarApi = async (caminho, opcoes = {}) => {
  const token = await obterConfig('WHATSAPP_TOKEN');
  if (!token) throw new Error('Token do WhatsApp não configurado.');

  return fetch(`https://graph.facebook.com/${API_VERSION}/${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
};

const montarCorpo = (para, template, idioma, parametros, comBotao) => {
  const comoTexto = (v) => ({ type: 'text', text: String(v ?? '') });
  const componentes = [];

  if (parametros.length) {
    componentes.push({ type: 'body', parameters: parametros.map(comoTexto) });
  }
  // Modelos de autenticação criados com o botão "Copiar código" exigem que o
  // código venha também no botão, senão a Meta recusa por falta de parâmetro.
  if (comBotao && parametros.length) {
    componentes.push({
      type: 'button', sub_type: 'url', index: '0',
      parameters: [comoTexto(parametros[0])],
    });
  }

  return {
    messaging_product: 'whatsapp',
    to: para,
    type: 'template',
    template: {
      name: template,
      language: { code: idioma },
      ...(componentes.length ? { components: componentes } : {}),
    },
  };
};

/**
 * Envia uma mensagem em modelo aprovado.
 *
 * Devolve { ok, messageId, erro } em vez de lançar: nenhum envio de WhatsApp
 * deve derrubar a operação principal (aprovar cadastro, redefinir senha).
 */
const enviarTemplate = async ({ para, template, parametros = [], tipo = 'avulso', referencia = null, botaoCodigo = false }) => {
  const telefone = normalizarTelefone(para);
  if (!telefone) {
    return { ok: false, erro: 'Telefone inválido ou sem DDD.' };
  }

  if (!(await whatsappConfigurado())) {
    return { ok: false, erro: 'WhatsApp não configurado.' };
  }

  const phoneId = await obterConfig('WHATSAPP_PHONE_ID');
  const idioma = (await obterConfig('WHATSAPP_IDIOMA')) || 'pt_BR';

  const tentar = async (comBotao) => chamarApi(`${phoneId}/messages`, {
    method: 'POST',
    body: JSON.stringify(montarCorpo(telefone, template, idioma, parametros, comBotao)),
  });

  try {
    let resposta = await tentar(botaoCodigo);

    // O modelo pode ter sido criado com ou sem o botão de copiar código — a
    // Meta acusa contagem de parâmetros errada. Em vez de exigir que o admin
    // saiba qual formato escolheu, tenta o outro uma vez.
    if (!resposta.ok && botaoCodigo) {
      const erro = await mensagemDeErro(resposta.clone?.() || resposta);
      if (/param/i.test(erro)) resposta = await tentar(false);
    }

    if (!resposta.ok) {
      const erro = await mensagemDeErro(resposta);
      await registrarEnvio({ telefone, tipo, template, status: 'erro', erro, referencia });
      logger.warn('WhatsApp não enviado', { tipo, template, erro });
      return { ok: false, erro };
    }

    const dados = await resposta.json();
    const messageId = dados?.messages?.[0]?.id || null;
    await registrarEnvio({ telefone, tipo, template, status: 'enviado', messageId, referencia });
    return { ok: true, messageId };
  } catch (err) {
    const erro = err.name === 'TimeoutError' ? 'Tempo esgotado ao falar com a Meta.' : err.message;
    await registrarEnvio({ telefone, tipo, template, status: 'erro', erro, referencia });
    logger.error('Erro ao enviar WhatsApp', { tipo, template, message: erro });
    return { ok: false, erro };
  }
};

/** Confere se token e número estão válidos (sem enviar mensagem). */
const testarConexao = async () => {
  const phoneId = await obterConfig('WHATSAPP_PHONE_ID');
  if (!phoneId) throw new Error('Informe o ID do número de telefone.');

  const resposta = await chamarApi(`${phoneId}?fields=display_phone_number,verified_name,quality_rating`);
  if (!resposta.ok) throw new Error(await mensagemDeErro(resposta));

  const dados = await resposta.json();
  return {
    numero: dados.display_phone_number,
    nome: dados.verified_name,
    qualidade: dados.quality_rating,
  };
};

// ── Envios do sistema ────────────────────────────────────────────────────────

const enviarCodigoRecuperacao = async (telefone, codigo) => enviarTemplate({
  para: telefone,
  template: (await obterConfig('WHATSAPP_TPL_RESET')) || 'codigo_recuperacao',
  parametros: [codigo],
  tipo: 'reset_senha',
  botaoCodigo: true,
});

const enviarPrimeiroAcesso = async (telefone, nome, email, senhaTemp) => enviarTemplate({
  para: telefone,
  template: (await obterConfig('WHATSAPP_TPL_ACESSO')) || 'acesso_criado',
  parametros: [nome, email, senhaTemp],
  tipo: 'primeiro_acesso',
});

const enviarAvisoCampanha = async (telefone, nome, mensagem, referencia) => enviarTemplate({
  para: telefone,
  template: (await obterConfig('WHATSAPP_TPL_AVISO')) || 'aviso_campanha',
  parametros: [nome, mensagem],
  tipo: 'disparo',
  referencia,
});

module.exports = {
  normalizarTelefone,
  formatarTelefone,
  whatsappConfigurado,
  enviarTemplate,
  testarConexao,
  enviarCodigoRecuperacao,
  enviarPrimeiroAcesso,
  enviarAvisoCampanha,
};
