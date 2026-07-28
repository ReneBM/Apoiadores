const crypto = require('crypto');

/**
 * Criptografia dos valores sensíveis das configurações (AES-256-GCM).
 *
 * A chave é derivada do JWT_SECRET (que já existe em todo ambiente) via
 * scrypt — assim não é preciso criar/gerenciar mais um segredo. Consequência
 * importante: trocar o JWT_SECRET torna os valores já salvos ilegíveis; nesse
 * caso basta regravá-los pela tela de Configurações.
 */
const SALT = 'timesv.configuracoes.v1';

let chaveCache = null;
const obterChave = () => {
  if (chaveCache) return chaveCache;
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error('JWT_SECRET ausente: não é possível proteger as configurações.');
  chaveCache = crypto.scryptSync(base, SALT, 32);
  return chaveCache;
};

/** Cifra um texto. Formato: v1:<iv>:<tag>:<conteúdo> (tudo em base64). */
const cifrar = (texto) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', obterChave(), iv);
  const conteudo = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), conteudo.toString('base64')].join(':');
};

/** Decifra um valor gerado por `cifrar`. Retorna null se não for decifrável. */
const decifrar = (valor) => {
  try {
    const [versao, iv, tag, conteudo] = String(valor).split(':');
    if (versao !== 'v1' || !iv || !tag || !conteudo) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', obterChave(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(conteudo, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null; // chave trocada ou valor corrompido
  }
};

/** Mostra apenas o suficiente para o usuário reconhecer o valor salvo. */
const mascarar = (valor) => {
  const s = String(valor || '');
  if (!s) return '';
  if (s.includes('@')) {
    const [nome, dominio] = s.split('@');
    return `${nome.slice(0, 2)}${'•'.repeat(Math.max(nome.length - 2, 3))}@${dominio}`;
  }
  return `${'•'.repeat(Math.max(s.length - 4, 4))}${s.slice(-4)}`;
};

module.exports = { cifrar, decifrar, mascarar };
