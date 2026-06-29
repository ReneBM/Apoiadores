const nodemailer = require('nodemailer');
const logger = require('./logger');

// ── Transporter Gmail ─────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Envia e-mail de primeiro acesso com a senha temporária para o multiplicador.
 * @param {string} destinatario - E-mail do multiplicador
 * @param {string} nome         - Nome do multiplicador
 * @param {string} senhaTemp    - Senha temporária em texto claro
 */
const sendTempPasswordEmail = async (destinatario, nome, senhaTemp) => {
  const primeiroNome = nome.split(' ')[0];

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Seu acesso ao sistema</title>
    </head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
                   style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px;text-align:center;">
                  <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;
                              display:inline-flex;align-items:center;justify-content:center;
                              font-weight:900;font-size:22px;color:#fff;letter-spacing:-0.5px;margin-bottom:16px;">
                    SV
                  </div>
                  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">
                    Senador Styveson Valim
                  </h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
                    Sistema de Gestão de Apoiadores
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;text-transform:uppercase;
                             letter-spacing:0.8px;font-weight:600;">
                    Olá, ${primeiroNome} 👋
                  </p>
                  <h2 style="margin:0 0 20px;color:#f1f5f9;font-size:18px;font-weight:700;">
                    Seu acesso foi criado!
                  </h2>
                  <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
                    Você foi cadastrado como <strong style="color:#60a5fa;">Multiplicador</strong>
                    no sistema de gestão de apoiadores do Senador Styveson Valim.
                    Use os dados abaixo para fazer seu primeiro acesso.
                  </p>

                  <!-- Credenciais -->
                  <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px;">
                    <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-transform:uppercase;
                               letter-spacing:0.8px;font-weight:600;">
                      Suas credenciais de acesso
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#64748b;font-size:13px;">E-mail:</span>
                          <br />
                          <strong style="color:#f1f5f9;font-size:15px;">${destinatario}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 6px;border-top:1px solid #1e293b;margin-top:10px;">
                          <span style="color:#64748b;font-size:13px;">Senha temporária:</span>
                          <br />
                          <strong style="color:#60a5fa;font-size:20px;letter-spacing:2px;font-family:monospace;">
                            ${senhaTemp}
                          </strong>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Aviso -->
                  <div style="background:#1c1917;border:1px solid #fbbf24;border-radius:10px;
                               padding:14px 16px;margin-bottom:24px;">
                    <p style="margin:0;color:#fbbf24;font-size:13px;line-height:1.6;">
                      ⚠️ <strong>Importante:</strong> Esta é uma senha temporária.
                      No primeiro acesso, você será obrigado a criar uma senha definitiva.
                      Não compartilhe esta senha com ninguém.
                    </p>
                  </div>

                  <!-- CTA -->
                  <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;text-align:center;">
                    Acesse o sistema pelo link abaixo:
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}"
                           style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#3b82f6);
                                  color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;
                                  font-weight:700;font-size:14px;letter-spacing:0.3px;">
                          Acessar o Sistema →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
                  <p style="margin:0;color:#475569;font-size:11px;line-height:1.6;">
                    Este e-mail foi enviado automaticamente · Sistema protegido
                    <br />
                    Dados sob proteção da LGPD · Senador Styveson Valim
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Sistema Senador Valim" <${process.env.MAIL_USER}>`,
      to: destinatario,
      subject: '🔐 Seu acesso ao sistema foi criado',
      html,
    });
    logger.info(`E-mail de primeiro acesso enviado para: ${destinatario}`);
  } catch (err) {
    logger.error(`Falha ao enviar e-mail para ${destinatario}: ${err.message}`);
    // Não lança o erro — falha no e-mail não deve cancelar o cadastro
  }
};

module.exports = { sendTempPasswordEmail };
