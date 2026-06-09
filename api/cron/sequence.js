// Cron endpoint: wysyła zaplanowane maile z sekwencji PEWA.
// Codziennie o 8:00 UTC (10:00 / 9:00 PL). Vercel Cron Jobs.
// Auth: header `Authorization: Bearer ${CRON_SECRET}` (Vercel automatycznie dodaje)

import { getSql, ensureSchema, logEvent } from '../_db.js';
import { SEQUENCE_STEPS } from '../_email-sequence.js';

export default async function handler(req, res) {
  // Vercel Cron robi GET z Authorization: Bearer ${CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = (req.headers['authorization'] || '').replace(/^Bearer /, '');
    if (auth !== cronSecret) return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    // Upewnij się że tabela istnieje
    await sql`CREATE TABLE IF NOT EXISTS email_sequence (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
      pewa_code text,
      pewa_label text,
      started_at timestamptz DEFAULT now(),
      last_sent_step int DEFAULT 0,
      last_sent_at timestamptz,
      unsubscribed bool DEFAULT false
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sequence_email ON email_sequence(email)`;

    const results = { sent: 0, errors: 0, details: [] };

    // Pobierz aktywne sekwencje (nie wypisane)
    const sequences = await sql`
      SELECT id, email, pewa_code, pewa_label, started_at, last_sent_step
      FROM email_sequence
      WHERE unsubscribed = false
        AND last_sent_step < 30
    `;

    for (const seq of sequences) {
      // Znajdź kolejny krok do wysłania
      const nextStep = SEQUENCE_STEPS.find(s => s.step > seq.last_sent_step);
      if (!nextStep) continue;

      // Sprawdź czy minęło wystarczająco dni od startu
      const startedAt = new Date(seq.started_at);
      const now = new Date();
      const daysElapsed = (now - startedAt) / (1000 * 60 * 60 * 24);

      if (daysElapsed < nextStep.delayDays) continue;

      // Buduj i wyślij maila
      try {
        const tpl = nextStep.builder({
          email: seq.email,
          pewaCode: seq.pewa_code,
          pewaLabel: seq.pewa_label,
        });

        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Testomnia (DOP)', email: 'katarzynski.mike@gmail.com' },
            to: [{ email: seq.email }],
            subject: tpl.subject,
            htmlContent: tpl.htmlContent,
            tags: tpl.tags,
          })
        });

        if (r.ok) {
          await sql`
            UPDATE email_sequence
            SET last_sent_step = ${nextStep.step}, last_sent_at = now()
            WHERE id = ${seq.id}
          `;
          await logEvent({ type: 'sequence_sent', email: seq.email, meta: { step: nextStep.step, code: seq.pewa_code } });
          results.sent++;
          results.details.push({ email: seq.email, step: nextStep.step, status: 'sent' });
        } else {
          const errText = await r.text();
          results.errors++;
          results.details.push({ email: seq.email, step: nextStep.step, status: 'failed', error: errText.substring(0, 200) });
          await logEvent({ type: 'sequence_failed', email: seq.email, meta: { step: nextStep.step, error: errText.substring(0, 200) } });
        }
      } catch (e) {
        results.errors++;
        results.details.push({ email: seq.email, step: nextStep.step, status: 'error', error: e.message });
      }
    }

    return res.status(200).json({
      ok: true,
      checked: sequences.length,
      ...results,
    });
  } catch (e) {
    console.log('Cron sequence error:', e);
    return res.status(500).json({ error: e.message });
  }
}
