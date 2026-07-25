const crypto = require('crypto');

/**
 * Gera uma senha temporária segura (formato: Mult@<dígito><6 hex>).
 * Atende à política de senha do Zod: >= 8 caracteres, com letra maiúscula e número.
 * Usa crypto (CSPRNG) — nunca uma senha fixa/previsível.
 */
function gerarSenhaTemporaria() {
  const nums = '23456789';
  const rand = crypto.randomBytes(6).toString('hex').slice(0, 6);
  const num = nums[crypto.randomInt(nums.length)];
  return `Mult@${num}${rand}`;
}

module.exports = { gerarSenhaTemporaria };
