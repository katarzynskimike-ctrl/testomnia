// Panel admina — rozkład 13 typów PEWA w bazie
import { getSql, ensureSchema } from '../_db.js';
import { classifyPewaLegacy, LABELS } from '../_lib/classifyPewa.js';

function checkAuth(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const qToken = req.query?.token;
  const hToken = (req.headers['authorization'] || '').replace(/^Bearer /, '');
  return qToken === token || hToken === token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await ensureSchema();
    const sql = getSql();

    // Pobierz wszystkie wyniki Testu 1 ze counts JSON
    const rows = await sql`
      SELECT id, email, counts, total, created_at, customer_id
      FROM test_results
      WHERE test_slug='4-typy-osobowosci' AND counts IS NOT NULL
      ORDER BY created_at DESC
    `;

    // Klasyfikuj każdy wynik
    const classified = rows.map(r => {
      try {
        const counts = typeof r.counts === 'string' ? JSON.parse(r.counts) : r.counts;
        const pewa = classifyPewaLegacy(counts);
        return { ...r, pewa };
      } catch (e) {
        return { ...r, pewa: null, error: e.message };
      }
    }).filter(r => r.pewa);

    // 1. Rozkład 13 typów
    const allCodes = ['P','E','W','A','PE','EP','PA','AP','EW','WE','WA','AW','D'];
    const codeDistribution = {};
    for (const code of allCodes) codeDistribution[code] = 0;
    classified.forEach(r => { codeDistribution[r.pewa.code]++; });

    // 2. Split pure/mixed/diamond
    const kindSplit = { pure: 0, mixed: 0, diamond: 0 };
    classified.forEach(r => { kindSplit[r.pewa.kind]++; });

    // 3. Trend ostatnie 30 dni
    const trend = await sql`
      SELECT date_trunc('day', created_at)::date AS day, count(*) AS cnt
      FROM test_results
      WHERE test_slug='4-typy-osobowosci' AND created_at > now() - interval '30 days'
      GROUP BY day ORDER BY day ASC
    `;

    // 4. Rozkład per rola (customers.role)
    let roleDistribution = {};
    try {
      const rolesData = await sql`
        SELECT c.role, tr.counts
        FROM test_results tr
        LEFT JOIN customers c ON c.id = tr.customer_id
        WHERE tr.test_slug='4-typy-osobowosci' AND tr.counts IS NOT NULL AND c.role IS NOT NULL
      `;
      for (const row of rolesData) {
        const r = row.role || 'unknown';
        if (!roleDistribution[r]) roleDistribution[r] = { total: 0, byType: {} };
        roleDistribution[r].total++;
        try {
          const counts = typeof row.counts === 'string' ? JSON.parse(row.counts) : row.counts;
          const code = classifyPewaLegacy(counts).code;
          roleDistribution[r].byType[code] = (roleDistribution[r].byType[code] || 0) + 1;
        } catch (e) {}
      }
    } catch (e) { console.log('role data failed:', e.message); }

    // 5. Top 3 typy
    const sorted = Object.entries(codeDistribution)
      .filter(([code, cnt]) => cnt > 0)
      .sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3).map(([code, cnt]) => ({
      code, label: LABELS[code], count: cnt, pct: Math.round((cnt / classified.length) * 100)
    }));

    return res.status(200).json({
      total: classified.length,
      codeDistribution,
      kindSplit,
      trend,
      roleDistribution,
      top3,
      labels: LABELS,
    });
  } catch (e) {
    console.log('pewa-stats error:', e);
    return res.status(500).json({ error: e.message });
  }
}
