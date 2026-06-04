// Panel admina - endpoint chroniony tokenem
// Wszystkie dane: klienci, wyniki, statystyki
import { getSql, ensureSchema } from '../_db.js';

function checkAuth(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const qToken = req.query?.token;
  const hToken = (req.headers['authorization'] || '').replace(/^Bearer /, '');
  return qToken === token || hToken === token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized — brak lub niepoprawny token' });
  }
  try {
    await ensureSchema();
    const sql = getSql();
    const view = req.query?.view || 'overview';

    if (view === 'overview') {
      const [stats, topArchetypes, recent, today, byTest] = await Promise.all([
        sql`SELECT 
          (SELECT count(*) FROM customers) AS customers,
          (SELECT count(*) FROM test_results) AS results,
          (SELECT count(*) FROM payments WHERE status='paid') AS paid,
          (SELECT coalesce(sum(amount_cents),0) FROM payments WHERE status='paid') AS revenue_cents
        `,
        sql`SELECT dominant, count(*) AS cnt FROM test_results WHERE dominant IS NOT NULL GROUP BY dominant ORDER BY cnt DESC LIMIT 10`,
        sql`SELECT id, email, test_slug, dominant, counts, total, created_at FROM test_results ORDER BY created_at DESC LIMIT 20`,
        sql`SELECT date_trunc('day', created_at)::date AS day, count(*) AS cnt FROM test_results WHERE created_at > now() - interval '30 days' GROUP BY day ORDER BY day DESC`,
        sql`SELECT test_slug, count(*) AS cnt FROM test_results GROUP BY test_slug ORDER BY cnt DESC`
      ]);
      return res.status(200).json({ stats: stats[0], topArchetypes, recent, today, byTest });
    }

    if (view === 'customers') {
      const search = (req.query?.q || '').trim();
      const customers = search
        ? await sql`SELECT * FROM customers WHERE email ILIKE ${'%'+search+'%'} ORDER BY last_seen DESC LIMIT 200`
        : await sql`SELECT * FROM customers ORDER BY last_seen DESC LIMIT 200`;
      return res.status(200).json({ customers });
    }

    if (view === 'results') {
      const filter = req.query?.test;
      const archetype = req.query?.archetype;
      let rows;
      if (filter && archetype) {
        rows = await sql`SELECT * FROM test_results WHERE test_slug=${filter} AND dominant=${archetype} ORDER BY created_at DESC LIMIT 500`;
      } else if (filter) {
        rows = await sql`SELECT * FROM test_results WHERE test_slug=${filter} ORDER BY created_at DESC LIMIT 500`;
      } else if (archetype) {
        rows = await sql`SELECT * FROM test_results WHERE dominant=${archetype} ORDER BY created_at DESC LIMIT 500`;
      } else {
        rows = await sql`SELECT * FROM test_results ORDER BY created_at DESC LIMIT 500`;
      }
      return res.status(200).json({ results: rows });
    }

    if (view === 'payments') {
      const payments = await sql`SELECT p.*, c.email FROM payments p LEFT JOIN customers c ON c.id = p.customer_id ORDER BY p.created_at DESC LIMIT 500`;
      return res.status(200).json({ payments });
    }

    return res.status(400).json({ error: 'Unknown view. Use ?view=overview|customers|results|payments' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
