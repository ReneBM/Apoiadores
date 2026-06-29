const db = require('../config/database');

// ── Dashboard Admin ────────────────────────────────────────────────────────
const getAdminStats = async (_req, res, next) => {
  try {
    // KPIs principais em paralelo
    const [
      totalResult,
      hojeResult,
      semanaResult,
      cidadesResult,
      multiplicadoresResult,
      semanaNovosResult,
      ontemResult,
      multTotalResult,
      multMesResult,
      cidadesTotalResult,
      cidadesMesResult,
      recentesResult
    ] = await Promise.all([
      // 1. Total geral de apoiadores ativos
      db.query(`SELECT COUNT(*) AS total FROM apoiadores WHERE status = 'ativo'`),

      // 2. Novos hoje
      db.query(`SELECT COUNT(*) AS total FROM apoiadores WHERE created_at::date = CURRENT_DATE`),

      // 3. Novos nos últimos 7 dias (série para o gráfico)
      db.query(`
        SELECT
          created_at::date AS dia,
          COUNT(*) AS total
        FROM apoiadores
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY dia
        ORDER BY dia
      `),

      // 4. Top 5 cidades (mockup mostra 5 cidades)
      db.query(`
        SELECT cidade, COUNT(*) AS total
        FROM apoiadores
        WHERE status = 'ativo'
        GROUP BY cidade
        ORDER BY total DESC
        LIMIT 5
      `),

      // 5. Ranking multiplicadores (top 10)
      db.query(`
        SELECT
          u.nome AS multiplicador_nome,
          m.municipio,
          COUNT(a.id) AS total_apoiadores,
          COUNT(CASE WHEN a.created_at::date = CURRENT_DATE THEN 1 END) AS novos_hoje
        FROM multiplicadores m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN apoiadores a ON a.multiplicador_id = m.id AND a.status = 'ativo'
        WHERE u.ativo = true
        GROUP BY m.id, u.nome, m.municipio
        ORDER BY total_apoiadores DESC
        LIMIT 10
      `),

      // 6. Novos esta semana (para o total de apoiadores subtitle)
      db.query(`SELECT COUNT(*) AS total FROM apoiadores WHERE status = 'ativo' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`),

      // 7. Novos ontem (para novos hoje subtitle)
      db.query(`SELECT COUNT(*) AS total FROM apoiadores WHERE created_at::date = CURRENT_DATE - 1`),

      // 8. Total multiplicadores
      db.query(`SELECT COUNT(*) AS total FROM multiplicadores m JOIN users u ON u.id = m.user_id WHERE u.ativo = true`),

      // 9. Novos multiplicadores este mês
      db.query(`SELECT COUNT(*) AS total FROM multiplicadores WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`),

      // 10. Total de cidades
      db.query(`SELECT COUNT(DISTINCT cidade) AS total FROM apoiadores WHERE status = 'ativo' AND cidade IS NOT NULL AND cidade != ''`),

      // 11. Novas cidades este mês
      db.query(`
        SELECT COUNT(*) AS total FROM (
          SELECT cidade, MIN(created_at) AS primeira_data
          FROM apoiadores
          WHERE status = 'ativo' AND cidade IS NOT NULL AND cidade != ''
          GROUP BY cidade
        ) c WHERE primeira_data >= DATE_TRUNC('month', CURRENT_DATE)
      `),

      // 12. Últimos 4 cadastros
      db.query(`
        SELECT a.nome, a.cidade, a.created_at
        FROM apoiadores a
        ORDER BY a.created_at DESC
        LIMIT 4
      `)
    ]);

    const totalApoiadores = parseInt(totalResult.rows[0]?.total || 0);
    const novosHoje = parseInt(hojeResult.rows[0]?.total || 0);
    const novosOntem = parseInt(ontemResult.rows[0]?.total || 0);
    const semanaNovos = parseInt(semanaNovosResult.rows[0]?.total || 0);
    const totalMultiplicadores = parseInt(multTotalResult.rows[0]?.total || 0);
    const novosMultiplicadoresMes = parseInt(multMesResult.rows[0]?.total || 0);
    const totalCidades = parseInt(cidadesTotalResult.rows[0]?.total || 0);
    const novasCidadesMes = parseInt(cidadesMesResult.rows[0]?.total || 0);

    const crescimento = novosOntem === 0 ? null
      : Math.round(((novosHoje - novosOntem) / novosOntem) * 100);

    res.json({
      kpis: {
        totalApoiadores,
        novosHoje,
        novosOntem,
        semanaNovos,
        totalMultiplicadores,
        novosMultiplicadoresMes,
        totalCidades,
        novasCidadesMes,
        crescimentoPercentual: crescimento,
      },
      serieSemanal: semanaResult.rows,
      topCidades: cidadesResult.rows,
      rankingMultiplicadores: multiplicadoresResult.rows,
      recentes: recentesResult.rows
    });
  } catch (err) {
    next(err);
  }
};

// ── Painel do Multiplicador ────────────────────────────────────────────────
const getMultiplicadorStats = async (req, res, next) => {
  try {
    // Busca o id do multiplicador a partir do user logado
    const { rows: mRows } = await db.query(
      'SELECT id, meta_apoiadores, municipio FROM multiplicadores WHERE user_id = $1',
      [req.user.id]
    );

    const multiplicador = mRows[0];
    if (!multiplicador) {
      return res.status(404).json({ error: 'Perfil de multiplicador não encontrado.' });
    }

    const [totalResult, hojeResult, semanaResult] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total FROM apoiadores WHERE multiplicador_id = $1 AND status = 'ativo'`,
        [multiplicador.id]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM apoiadores
         WHERE multiplicador_id = $1 AND created_at::date = CURRENT_DATE`,
        [multiplicador.id]
      ),
      db.query(
        `SELECT created_at::date AS dia, COUNT(*) AS total
         FROM apoiadores
         WHERE multiplicador_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY dia ORDER BY dia`,
        [multiplicador.id]
      ),
    ]);

    const total = parseInt(totalResult.rows[0].total);
    const meta = multiplicador.meta_apoiadores || 0;
    const percentualMeta = meta > 0 ? Math.min(Math.round((total / meta) * 100), 100) : null;

    res.json({
      multiplicadorId: multiplicador.id,
      municipio: multiplicador.municipio,
      kpis: {
        totalApoiadores: total,
        novosHoje: parseInt(hojeResult.rows[0].total),
        meta,
        percentualMeta,
      },
      serieSemanal: semanaResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminStats, getMultiplicadorStats };
