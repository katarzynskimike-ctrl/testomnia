// imoje (ING Bank Slaski) - tworzenie transakcji
import { randomUUID } from 'node:crypto';
import { getSql, ensureSchema } from './_db.js';

const PRICE_PLN_GROSZE = 3900;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const merchantId = process.env.IMOJE_MERCHANT_ID;
    const serviceId = process.env.IMOJE_SERVICE_ID;
    const apiKey = process.env.IMOJE_API_KEY;
    if (!merchantId || !serviceId || !apiKey) {
      return res.status(503).json({ error: 'imoje nie skonfigurowany — admin musi ustawic IMOJE_MERCHANT_ID, IMOJE_SERVICE_ID, IMOJE_API_KEY w env vars' });
    }

    const { email, firstName, lastName, resultId, productType, taxNo, companyName, street, city, postCode } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Brak email' });

    const orderId = randomUUID();
    const origin = req.headers['origin'] || `https://${req.headers.host}`;
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.IMOJE_SANDBOX;
    const apiBase = isProduction ? 'https://api.imoje.pl/v1' : 'https://sandbox.imoje.pl/api/v1';

    // Tworzenie transakcji w imoje
    const body = {
      type: 'sale',
      serviceId,
      amount: PRICE_PLN_GROSZE,
      currency: 'PLN',
      orderId,
      title: 'Wielki Test Osobowości · Pełny raport PDF',
      successReturnUrl: `${origin}/payment-success.html?o=${orderId}`,
      failureReturnUrl: `${origin}/payment-cancel.html?o=${orderId}`,
      cancelReturnUrl: `${origin}/payment-cancel.html?o=${orderId}`,
      notificationUrl: `${origin}/api/imoje-webhook`,
      customer: {
        firstName: firstName || '',
        lastName: lastName || '',
        email
      }
    };

    const r = await fetch(`${apiBase}/merchant/${merchantId}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        accept: 'application/json'
      },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok) {
      console.log('imoje error:', j);
      return res.status(502).json({ error: 'imoje API error', detail: j });
    }

    const paymentUrl = j?.action?.url || j?.paymentUrl;
    const transactionId = j?.transaction?.id || j?.id;

    // Zapis płatności jako pending
    try {
      const sql = getSql();
      await ensureSchema();
      const customers = await sql`SELECT id FROM customers WHERE email=${email} LIMIT 1`;
      const customerId = customers[0]?.id || null;
      await sql`INSERT INTO payments 
        (customer_id, test_result_id, stripe_session_id, amount_cents, currency, status, product_type)
        VALUES (${customerId}, ${resultId||null}, ${transactionId}, ${PRICE_PLN_GROSZE}, 'pln', 'pending', ${productType||'full_report_4typy'})`;
      // Zapis danych do faktury w events (potem do faktury)
      await sql`INSERT INTO events (type, email, meta) VALUES ('checkout_started', ${email}, ${JSON.stringify({orderId, firstName, lastName, taxNo, companyName, street, city, postCode, transactionId})})`;
    } catch(e) { console.log('DB pending payment failed:', e.message); }

    return res.status(200).json({ url: paymentUrl, transactionId, orderId });
  } catch (e) {
    console.log('Checkout error:', e);
    return res.status(500).json({ error: e.message });
  }
}
