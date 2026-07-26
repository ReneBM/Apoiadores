const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const BUCKET = process.env.SUPABASE_BUCKET || 'feed';

// Chave de serviço: necessária para escrever no Storage a partir do backend.
// A integração Supabase/Vercel injeta SUPABASE_URL + SUPABASE_SECRET_KEY.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const client = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

let bucketPronto = false;

/**
 * Garante que o bucket existe e é público (idempotente).
 * Evita depender de criação manual no painel do Supabase.
 */
const garantirBucket = async () => {
  if (bucketPronto) return;
  const { data } = await client.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await client.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: '50MB',
    });
    // "already exists" pode ocorrer em chamadas concorrentes — não é falha real.
    if (error && !/already exists/i.test(error.message)) throw error;
    logger.info(`Bucket "${BUCKET}" criado no Supabase Storage.`);
  }
  bucketPronto = true;
};

/**
 * Envia um arquivo (buffer) para o Supabase Storage e devolve a URL pública.
 * @param {Buffer} buffer
 * @param {string} nomeArquivo
 * @param {string} mimetype
 * @returns {Promise<string>} URL pública do arquivo
 */
const uploadArquivo = async (buffer, nomeArquivo, mimetype) => {
  if (!isConfigured) {
    throw new Error('Supabase Storage não configurado (SUPABASE_URL / SUPABASE_SECRET_KEY).');
  }

  await garantirBucket();

  const { error } = await client.storage
    .from(BUCKET)
    .upload(nomeArquivo, buffer, { contentType: mimetype, upsert: false });

  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
};

module.exports = { uploadArquivo, isConfigured, BUCKET };
