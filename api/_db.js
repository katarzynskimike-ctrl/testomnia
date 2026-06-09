import { neon } from '@neondatabase/serverless';

let _sql = null;
export function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL / POSTGRES_URL not set in env');
  _sql = neon(url);
  return _sql;
}

// Inicjalizacja tabel (idempotentna)
export async function ensureSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    name text,
    first_seen timestamptz DEFAULT now(),
    last_seen timestamptz DEFAULT now(),
    test_count int DEFAULT 0,
    source text
  )`;
  await sql`CREATE TABLE IF NOT EXISTS test_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    email text NOT NULL,
    test_slug text NOT NULL,
    dominant text,
    counts jsonb,
    total int,
    ip text,
    user_agent text,
    referrer text,
    brevo_message_id text,
    email_sent_at timestamptz,
    created_at timestamptz DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    email text,
    test_slug text,
    meta jsonb,
    created_at timestamptz DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    test_result_id uuid REFERENCES test_results(id) ON DELETE SET NULL,
    stripe_session_id text UNIQUE,
    stripe_payment_intent text,
    amount_cents int,
    currency text DEFAULT 'pln',
    status text DEFAULT 'pending',
    product_type text,
    paid_at timestamptz,
    created_at timestamptz DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_results_email ON test_results(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_results_slug ON test_results(test_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_results_created ON test_results(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`;
}

// Zapisanie wyniku testu + utworzenie/aktualizacja klienta
export async function saveResult({ email, testSlug, dominant, counts, total, ip, userAgent, referrer }) {
  const sql = getSql();
  await ensureSchema();
  // Upsert customer
  const customers = await sql`
    INSERT INTO customers (email, first_seen, last_seen, test_count)
    VALUES (${email}, now(), now(), 1)
    ON CONFLICT (email) DO UPDATE SET 
      last_seen = now(), 
      test_count = customers.test_count + 1
    RETURNING id
  `;
  const customerId = customers[0].id;
  const results = await sql`
    INSERT INTO test_results (customer_id, email, test_slug, dominant, counts, total, ip, user_agent, referrer, calibration)
    VALUES (${customerId}, ${email}, ${testSlug}, ${dominant}, ${JSON.stringify(counts)}, ${total}, ${ip}, ${userAgent}, ${referrer}, ${calibration ? JSON.stringify(calibration) : null})
    RETURNING id
  `;
  return { customerId, resultId: results[0].id };
}

export async function logEvent({ type, email, testSlug, meta }) {
  try {
    const sql = getSql();
    await sql`INSERT INTO events (type, email, test_slug, meta) VALUES (${type}, ${email||null}, ${testSlug||null}, ${meta?JSON.stringify(meta):null})`;
  } catch(e) { console.log('logEvent failed:', e.message); }
}

export async function markEmailSent(resultId, brevoMessageId) {
  try {
    const sql = getSql();
    await sql`UPDATE test_results SET brevo_message_id = ${brevoMessageId}, email_sent_at = now() WHERE id = ${resultId}`;
  } catch(e) { console.log('markEmailSent failed:', e.message); }
}
