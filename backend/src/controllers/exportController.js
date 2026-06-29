const { createObjectCsvStringifier } = require('csv-writer');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Exporta a lista de apoiadores em CSV.
 * Admins e coordenadores exportam todos (com filtros opcionais).
 * Multiplicadores exportam apenas os seus.
 */
const exportApoiadores = async (req, res, next) => {
  try {
    const { cidade, status, multiplicador_id, data_inicio, data_fim } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    // Restrição RBAC para multiplicadores
    if (req.filterByUserId) {
      const { rows } = await db.query(
        'SELECT id FROM multiplicadores WHERE user_id = $1',
        [req.filterByUserId]
      );
      const mId = rows[0]?.id;
      if (!mId) {
        // Retorna CSV vazio com cabeçalho
        return sendCsv(res, []);
      }
      conditions.push(`a.multiplicador_id = $${idx++}`);
      params.push(mId);
    } else if (multiplicador_id) {
      conditions.push(`a.multiplicador_id = $${idx++}`);
      params.push(multiplicador_id);
    }

    if (cidade) {
      conditions.push(`LOWER(a.cidade) ILIKE $${idx++}`);
      params.push(`%${cidade.toLowerCase()}%`);
    }
    if (status) {
      conditions.push(`a.status = $${idx++}`);
      params.push(status);
    }
    if (data_inicio) {
      conditions.push(`a.created_at >= $${idx++}`);
      params.push(data_inicio);
    }
    if (data_fim) {
      conditions.push(`a.created_at <= $${idx++}`);
      params.push(data_fim);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT
         a.nome,
         a.telefone,
         a.cidade,
         a.bairro,
         a.status,
         a.interesse,
         a.observacoes,
         CASE WHEN a.consentimento_lgpd THEN 'Sim' ELSE 'Não' END AS consentimento_lgpd,
         to_char(a.data_consentimento AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data_consentimento,
         m_user.nome AS multiplicador,
         u.nome AS cadastrado_por,
         to_char(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data_cadastro
       FROM apoiadores a
       LEFT JOIN users u ON u.id = a.cadastrado_por
       LEFT JOIN multiplicadores m ON m.id = a.multiplicador_id
       LEFT JOIN users m_user ON m_user.id = m.user_id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );

    logger.info(`Exportação CSV: ${rows.length} apoiadores — usuário ${req.user.id}`);
    sendCsv(res, rows);
  } catch (err) {
    next(err);
  }
};

// ── Helper: monta e envia o CSV ────────────────────────────────────────────
function sendCsv(res, rows) {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'nome',               title: 'Nome' },
      { id: 'telefone',           title: 'Telefone' },
      { id: 'cidade',             title: 'Cidade' },
      { id: 'bairro',             title: 'Bairro' },
      { id: 'status',             title: 'Status' },
      { id: 'interesse',          title: 'Interesse' },
      { id: 'observacoes',        title: 'Observações' },
      { id: 'consentimento_lgpd', title: 'Consentimento LGPD' },
      { id: 'data_consentimento', title: 'Data Consentimento' },
      { id: 'multiplicador',      title: 'Multiplicador' },
      { id: 'cadastrado_por',     title: 'Cadastrado Por' },
      { id: 'data_cadastro',      title: 'Data de Cadastro' },
    ],
  });

  const BOM = '\uFEFF'; // BOM UTF-8 para Excel abrir corretamente
  const csvContent = BOM
    + csvStringifier.getHeaderString()
    + csvStringifier.stringifyRecords(rows);

  const filename = `apoiadores_${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
}

module.exports = { exportApoiadores };
