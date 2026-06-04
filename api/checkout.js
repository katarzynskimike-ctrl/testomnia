// Tworzy Stripe Checkout Session dla rozszerzonego raportu (19 zł)
import Stripe from 'stripe';
import { getSql, ensureSchema } from './_db.js';

const PRICE_PLN_GROSZE = 1900; // 19 zł

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe nie skonfigurowany — admin musi dodać STRIPE_SECRET_KEY w env vars' });
    }

    const { email, resultId, productType } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Brak email' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
    const origin = req.headers['origin'] || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'blik', 'p24'],
      currency: 'pln',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'pln',
          unit_amount: PRICE_PLN_GROSZE,
          product_data: {
            name: 'Testomnia · Pełny raport rozwojowy',
            description: 'Rozszerzona analiza wyników testu osobowości: plan rozwoju 30 i 90 dni, ćwiczenia praktyczne, scenariusze rozmów z pacjentem, sugerowane książki/szkolenia.',
          },
        },
        quantity: 1,
      }],
      success_url: `${origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancel.html`,
      metadata: {
        email,
        resultId: resultId || '',
        productType: productType || 'full_report_4typy'
      }
    });

    // Zapis płatności jako pending w bazie
    try {
      const sql = getSql();
      await ensureSchema();
      const customers = await sql`SELECT id FROM customers WHERE email=${email} LIMIT 1`;
      const customerId = customers[0]?.id || null;
      await sql`INSERT INTO payments (customer_id, test_result_id, stripe_session_id, amount_cents, currency, status, product_type)
        VALUES (${customerId}, ${resultId||null}, ${session.id}, ${PRICE_PLN_GROSZE}, 'pln', 'pending', ${productType||'full_report_4typy'})`;
    } catch(e) { console.log('DB pending payment failed:', e.message); }

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.log('Checkout error:', e);
    return res.status(500).json({ error: e.message });
  }
}
