const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { DEFINICOES, CHAVES, VARIAVEIS, obterConfig, salvarConfig, definidaNoBanco } = require('../utils/config');
const { mascarar } = require('../utils/cripto');
const { testarConexao, enviarEmail } = require('../utils/mailer');
const {
  whatsappConfigurado,
  testarConexao: testarConexaoWhatsapp,
  enviarTexto,
  formatarTelefone,
  normalizarTelefone,
} = require('../utils/whatsapp');

const audit = async (userId, acao, detalhes, ip) => {
  try {
    await db.query(
      `INSERT INTO audit_log (id, user_id, acao, entidade, detalhes, ip)
       VALUES ($1, $2, $3, 'configuracoes', $4, $5)`,
      [uuidv4(), userId, acao, JSON.stringify(detalhes), ip]
    );
  } catch (err) {
    logger.error('Falha ao auditar configuração', { message: err.message });
  }
};

/**
 * Estado atual das configurações.
 * Valores sensíveis NUNCA são devolvidos — apenas se estão preenchidos e uma
 * versão mascarada, o suficiente para o admin reconhecer o que está salvo.
 */
const getConfiguracoes = async (req, res, next) => {
  try {
    const itens = {};
    for (const chave of CHAVES) {
      const def = DEFINICOES[chave];
      const valor = await obterConfig(chave);
      itens[chave] = {
        preenchido: Boolean(valor),
        sensivel: def.sensivel,
        origem: (await definidaNoBanco(chave)) ? 'painel' : (valor ? 'ambiente' : 'nenhuma'),
        // Campo sensível nunca volta preenchido — nem mascarado. O input fica
        // vazio (vazio = "não alterar") e a máscara vai à parte, só como dica
        // visual para o admin reconhecer o que está salvo.
        valor: def.sensivel ? '' : (valor || ''),
        dica: def.sensivel && valor ? mascarar(valor) : '',
        padrao: def.padrao || '',
        variaveis: VARIAVEIS[chave] || [],
      };
    }

    const emailPronto = Boolean(await obterConfig('MAIL_USER')) && Boolean(await obterConfig('MAIL_PASS'));
    const whatsappPronto = await whatsappConfigurado();

    res.json({ itens, emailPronto, whatsappPronto });
  } catch (err) {
    next(err);
  }
};

/**
 * Grava as configurações enviadas.
 *
 * Regras para campos SENSÍVEIS (senha): string vazia = "manter o que está
 * salvo" (o admin não precisa redigitar a senha para mudar o remetente);
 * `null` = limpar. Isso evita o risco de um valor de exibição sobrescrever
 * o segredo real — o GET nunca devolve o valor, então nada pode ser
 * reenviado por engano.
 */
const updateConfiguracoes = async (req, res, next) => {
  try {
    const recebidas = req.body || {};
    const alteradas = [];

    for (const chave of CHAVES) {
      if (!(chave in recebidas)) continue;
      const valor = recebidas[chave];
      const def = DEFINICOES[chave];

      if (def.sensivel) {
        if (valor === null) {
          await salvarConfig(chave, null, req.user.id); // limpar explicitamente
          alteradas.push(chave);
          continue;
        }
        // Vazio (ou só espaços) = não mexer no segredo já salvo
        if (typeof valor !== 'string' || valor.trim() === '') continue;
        // Rede de segurança: nunca aceitar um texto de máscara como senha
        if (/^[•*]+/.test(valor.trim())) continue;
      }

      await salvarConfig(chave, valor, req.user.id);
      alteradas.push(chave);
    }

    if (alteradas.length) {
      await audit(req.user.id, 'ATUALIZAR_CONFIGURACOES', { chaves: alteradas }, req.ip);
    }

    res.json({
      message: alteradas.length
        ? 'Configurações salvas com sucesso.'
        : 'Nenhuma alteração para salvar.',
      alteradas,
    });
  } catch (err) {
    next(err);
  }
};

/** Testa as credenciais de e-mail; opcionalmente envia uma mensagem de teste. */
const testarEmail = async (req, res, next) => {
  try {
    const destino = (req.body?.destinatario || '').trim();

    await testarConexao();

    if (destino) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
        return res.status(400).json({ error: 'Informe um e-mail de destino válido.' });
      }
      await enviarEmail({
        to: destino,
        subject: '✅ Teste de configuração de e-mail — Time SV',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#0054A6;margin:0 0 12px;">Configuração de e-mail funcionando</h2>
            <p style="color:#334155;line-height:1.6;">
              Se você recebeu esta mensagem, o envio de e-mails do aplicativo
              <strong>Time SV</strong> está configurado corretamente. Os códigos de
              redefinição de senha e os avisos de primeiro acesso serão entregues normalmente.
            </p>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
              Mensagem automática de teste enviada pelo painel de Configurações.
            </p>
          </div>`,
      });
      await audit(req.user.id, 'TESTAR_EMAIL', { destinatario: destino }, req.ip);
      return res.json({ message: `E-mail de teste enviado para ${destino}. Confira a caixa de entrada (e o spam).` });
    }

    res.json({ message: 'Credenciais válidas: a conexão com o servidor de e-mail funcionou.' });
  } catch (err) {
    logger.error('Teste de e-mail falhou', { message: err.message });
    res.status(400).json({
      error: `Não foi possível enviar: ${err.message}`,
    });
  }
};

/**
 * Testa o WhatsApp: confere se o servidor responde e se a instância está
 * pareada e, se um destino for informado, envia uma mensagem real.
 */
const testarWhatsapp = async (req, res, next) => {
  try {
    const destino = (req.body?.destinatario || '').trim();
    const conta = await testarConexaoWhatsapp();

    if (!destino) {
      return res.json({
        message: `Conexão OK. A instância "${conta.instancia}" está conectada e pronta para enviar.`,
      });
    }

    const telefone = normalizarTelefone(destino);
    if (!telefone) {
      return res.status(400).json({ error: 'Informe um celular válido com DDD. Ex.: (84) 99999-8888' });
    }

    const envio = await enviarTexto({
      para: telefone,
      texto: 'Esta é uma mensagem de teste do aplicativo *Time SV*.\n\nSe você recebeu, o envio por WhatsApp está funcionando. 🎉',
      tipo: 'teste',
    });

    if (!envio.ok) {
      return res.status(400).json({
        error: `Conexão OK, mas o envio falhou: ${envio.erro}`,
      });
    }

    await audit(req.user.id, 'TESTAR_WHATSAPP', { destinatario: telefone }, req.ip);
    res.json({
      message: `Mensagem de teste enviada para ${formatarTelefone(telefone)}. Confira o WhatsApp.`,
    });
  } catch (err) {
    logger.error('Teste de WhatsApp falhou', { message: err.message });
    res.status(400).json({ error: `Não foi possível conectar: ${err.message}` });
  }
};

module.exports = { getConfiguracoes, updateConfiguracoes, testarEmail, testarWhatsapp };
