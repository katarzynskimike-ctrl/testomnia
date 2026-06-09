// imoje webhook - notyfikacje o statusie transakcji
// Po payment.settled => createInvoice (Fakturownia) + email z linkiem
import { createHmac } from 'node:crypto';
import { getSql, logEvent } from './_db.js';
import { createInvoice } from './_fakturownia.js';
import { classifyPewaLegacy, getReportUrl, LABELS } from './_lib/classifyPewa.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const event = req.body;
    const tx = event?.transaction || event;
    const status = tx?.status;
    const orderId = tx?.orderId;
    const transactionId = tx?.id;
    const amount = tx?.amount;
    const paymentMethod = tx?.paymentMethod || tx?.paymentMethodCode || 'imoje';

    if (!transactionId) return res.status(400).json({ error: 'No transactionId' });

    // Weryfikacja sygnatury (jesli authHash ustawiony)
    const authHash = process.env.IMOJE_AUTH_HASH;
    if (authHash) {
      const sigHeader = req.headers['x-imoje-signature'] || req.headers['x-signature'];
      if (sigHeader) {
        const body = JSON.stringify(req.body);
        const expected = createHmac('sha256', authHash).update(body).digest('hex');
        if (sigHeader !== expected) {
          console.log('imoje webhook: invalid signature');
          // not blocking - log only
        }
      }
    }

    const sql = getSql();
    if (status === 'settled' || status === 'completed' || status === 'success') {
      // Update payment
      await sql`UPDATE payments SET status='paid', paid_at=now(), stripe_payment_intent=${transactionId} WHERE stripe_session_id=${transactionId}`;
      await logEvent({ type: 'payment_succeeded', meta: { transactionId, orderId, amount } });

      // PEWA — wyślij właściwy PDF raport na podstawie wyniku testu
      try {
        const pay = await sql`SELECT p.test_result_id, c.email FROM payments p LEFT JOIN customers c ON c.id=p.customer_id WHERE p.stripe_session_id=${transactionId} LIMIT 1`;
        const testResultId = pay[0]?.test_result_id;
        const buyerEmailForReport = pay[0]?.email;
        if (testResultId && buyerEmailForReport) {
          const tr = await sql`SELECT counts, calibration FROM test_results WHERE id=${testResultId} LIMIT 1`;
          const counts = tr[0]?.counts || {};
          const calibration = tr[0]?.calibration || null;
          const inputForPewa = { ...counts };
          if (calibration) {
            if (typeof calibration.axisEmotional === 'number') inputForPewa.axisEmotional = calibration.axisEmotional;
            if (typeof calibration.axisSocial    === 'number') inputForPewa.axisSocial    = calibration.axisSocial;
            if (typeof calibration.flexibility   === 'number') inputForPewa.flexibility   = calibration.flexibility;
          }
          const pewa = classifyPewaLegacy(inputForPewa);
          const reportUrl = getReportUrl(pewa.code);
          await logEvent({ type: 'pewa_classified', email: buyerEmailForReport, meta: { code: pewa.code, label: pewa.label, intensity: pewa.intensity } });

          // Mail z pełnym raportem PEWA
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              sender: { name: 'Testomnia (DOP)', email: 'katarzynski.mike@gmail.com' },
              to: [{ email: buyerEmailForReport }],
              subject: `Twój pełny raport PEWA™ · Typ ${pewa.code} · ${pewa.label}`,
              htmlContent: `<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;background:#080E18;color:#D8D6CF">
                <p style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#E5B77A;font-weight:600">Testomnia · PEWA™</p>
                <h1 style="font-family:Georgia,serif;font-size:32px;color:#F6F1E8;margin:8px 0 16px">Twój pełny raport jest gotowy</h1>
                <p style="margin:16px 0;font-size:14px;color:#9CA0B1">Typ <strong style="color:#E5B77A">${pewa.code}</strong></p>
                <h2 style="font-family:Georgia,serif;color:#E5B77A;margin:0 0 8px;font-size:24px">${pewa.label}</h2>
                <p style="font-style:italic;color:#9CA0B1;margin:0 0 24px">Supermoc: ${pewa.superpower}</p>
                <p style="margin:24px 0">Twoje pełne 12-stronicowe opracowanie:</p>
                <p><a href="${reportUrl}" style="display:inline-block;background:#E5B77A;color:#1a1109;padding:16px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">↓ Pobierz pełny raport PEWA™ (PDF)</a></p>
                <p style="margin:32px 0 12px;font-size:14px"><strong style="color:#F6F1E8">Bonus — typologia pacjentów</strong></p>
                <p style="margin:0 0 12px;font-size:13px;color:#9CA0B1">Słownik 4 typów pacjentów (z 800 testów). Dla zespołu — drukuj i powieś w gabinecie.</p>
                <p><a href="https://www.testomnia.pl/raporty/PEWA-typologia-pacjentow-z-ebooka.pdf" style="display:inline-block;background:transparent;color:#E5B77A;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:500;border:1px solid #E5B77A;font-size:13px">↓ Typologia pacjentów (PDF)</a></p>
                <p style="font-size:12px;color:#7A8294;margin-top:40px;line-height:1.5">© 2026 Excellent Patient Service Sp. z o.o. · NIP 5170359961 · KRS 0000429303<br>Model PEWA™ — Michał Katarzyński, 14 lat doświadczenia, 6 000 testów</p>
              </div>`,
              tags: ['pewa-raport', 'paid', pewa.code]
            })
          });
          await logEvent({ type: 'pewa_report_sent', email: buyerEmailForReport, meta: { code: pewa.code, reportUrl } });

          // Zapis do email_sequence — uruchamia 4-mailową sekwencję (dzień 3, 7, 14, 30)
          try {
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
            const paymentRow = await sql`SELECT id FROM payments WHERE stripe_session_id=${transactionId} LIMIT 1`;
            const paymentRowId = paymentRow[0]?.id || null;
            await sql`INSERT INTO email_sequence (email, payment_id, pewa_code, pewa_label, last_sent_step)
              VALUES (${buyerEmailForReport}, ${paymentRowId}, ${pewa.code}, ${pewa.label}, 0)`;
            await logEvent({ type: 'sequence_started', email: buyerEmailForReport, meta: { code: pewa.code } });
          } catch(e) { console.log('Sequence enroll failed:', e.message); }
        }
      } catch(e) { console.log('PEWA report send failed:', e.message); }

      // Wystaw fakture na Fakturowni
      try {
        // Pobierz dane do faktury z events (zapisane przy checkout)
        const ev = await sql`SELECT meta, email FROM events WHERE type='checkout_started' AND meta->>'transactionId'=${transactionId} ORDER BY created_at DESC LIMIT 1`;
        const meta = ev[0]?.meta || {};
        const buyerEmail = ev[0]?.email;
        const buyerName = [meta.firstName, meta.lastName].filter(Boolean).join(' ').trim() || buyerEmail;
        const inv = await createInvoice({
          buyerName, buyerEmail,
          buyerTaxNo: meta.taxNo || null,
          buyerCompanyName: meta.companyName || null,
          buyerStreet: meta.street || '',
          buyerCity: meta.city || '',
          buyerPostCode: meta.postCode || '',
          amountCents: amount,
          paymentMethod: 'card'
        });
        // Zapisz w bazie
        await sql`CREATE TABLE IF NOT EXISTS invoices (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
          fakturownia_id text,
          number text,
          buyer_name text,
          buyer_tax_no text,
          pdf_url text,
          view_url text,
          total_cents int,
          created_at timestamptz DEFAULT now()
        )`;
        const payments = await sql`SELECT id FROM payments WHERE stripe_session_id=${transactionId} LIMIT 1`;
        const paymentId = payments[0]?.id;
        await sql`INSERT INTO invoices (payment_id, fakturownia_id, number, buyer_name, buyer_tax_no, pdf_url, view_url, total_cents)
          VALUES (${paymentId||null}, ${String(inv.fakturowniaId)}, ${inv.number}, ${buyerName}, ${meta.taxNo||null}, ${inv.pdfUrl}, ${inv.viewUrl}, ${amount})`;
        await logEvent({ type: 'invoice_created', email: buyerEmail, meta: { invoiceNumber: inv.number, pdfUrl: inv.pdfUrl } });

        // Wysylka maila z faktura + info o raporcie
        try {
          await fetch(`https://api.brevo.com/v3/smtp/email`, {
            method: 'POST',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              sender: { name: 'Testomnia (DOP)', email: 'katarzynski.mike@gmail.com' },
              to: [{ email: buyerEmail }],
              subject: `Faktura ${inv.number} · Testomnia pełny raport`,
              htmlContent: `<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;background:#080E18;color:#D8D6CF">
                <p style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#E5B77A;font-weight:600">Testomnia</p>
                <h1 style="font-family:Georgia,serif;font-size:28px;color:#F6F1E8;margin:8px 0 16px">Dziękujemy za zakup!</h1>
                <p>Twoja płatność <strong style="color:#22c55e">19,00 zł</strong> została zaksięgowana.</p>
                <p>Faktura VAT <strong>${inv.number}</strong> jest do pobrania:</p>
                <p><a href="${inv.pdfUrl}" style="display:inline-block;background:#E5B77A;color:#1a1109;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:600">↓ Pobierz fakturę PDF</a></p>
                <p style="margin-top:24px">Pełny raport rozwojowy PDF zostanie wysłany w osobnej wiadomości w ciągu kilku minut.</p>
                <p style="font-size:12px;color:#7A8294;margin-top:32px">© 2026 Excellent Patient Service Sp. z o.o. · NIP 5170359961</p>
              </div>`,
              tags: ['invoice', 'payment']
            })
          });
        } catch(e) { console.log('Invoice mail failed:', e.message); }
      } catch(e) {
        console.log('Invoice creation failed:', e.message);
        await logEvent({ type: 'invoice_failed', meta: { transactionId, error: e.message } });
      }
    } else if (status === 'rejected' || status === 'failed' || status === 'cancelled') {
      await sql`UPDATE payments SET status='failed' WHERE stripe_session_id=${transactionId}`;
      await logEvent({ type: 'payment_failed', meta: { transactionId, status } });
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.log('Webhook handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
