// Wielki Test Polaków — zapis leada (email + płeć + wiek + zgody RODO)
import { getSql, ensureSchema, logEvent } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, age, gender, consents, source, calibration, counts } = body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Niepoprawny email' });
    }
    if (!age || !gender) return res.status(400).json({ error: 'Brak age lub gender' });
    if (!consents?.base) return res.status(400).json({ error: 'Wymagana zgoda na przetwarzanie danych' });

    await ensureSchema();
    const sql = getSql();

    // Schema rozszerzenia (idempotentnie)
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS age text`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender text`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS source text`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_marketing bool DEFAULT false`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_marketing_at timestamptz`;

    // Upsert customer
    const customers = await sql`
      INSERT INTO customers (email, age, gender, source, consent_marketing, consent_marketing_at, first_seen, last_seen)
      VALUES (${email}, ${age}, ${gender}, ${source || 'wielki-test'}, ${!!consents.marketing}, ${consents.marketing ? new Date() : null}, now(), now())
      ON CONFLICT (email) DO UPDATE SET
        age = COALESCE(customers.age, EXCLUDED.age),
        gender = COALESCE(customers.gender, EXCLUDED.gender),
        source = COALESCE(customers.source, EXCLUDED.source),
        consent_marketing = customers.consent_marketing OR EXCLUDED.consent_marketing,
        consent_marketing_at = COALESCE(customers.consent_marketing_at, EXCLUDED.consent_marketing_at),
        last_seen = now()
      RETURNING id, email
    `;
    const customer = customers[0];

    await logEvent({
      type: 'wielki_lead_captured',
      email,
      meta: { age, gender, source: source || 'wielki-test', consents, hasCalibration: !!calibration }
    });

    return res.status(200).json({ ok: true, customerId: customer.id });
  } catch (e) {
    console.log('save-lead error:', e);
    return res.status(500).json({ error: e.message });
  }
}
