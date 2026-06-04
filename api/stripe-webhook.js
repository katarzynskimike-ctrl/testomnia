// Webhook Stripe — oznacza płatność jako paid + opcjonalnie wysyła rozszerzony PDF
import Stripe from 'stripe';
import { getSql, logEvent } from './_db.js';

export const config = {
  api: { bodyParser: false }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const sql = getSql();
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await sql`UPDATE payments 
        SET status='paid', paid_at=now(), stripe_payment_intent=${session.payment_intent||null}
        WHERE stripe_session_id=${session.id}`;
      await logEvent({ type: 'payment_succeeded', email: session.customer_email, meta: { sessionId: session.id, amount: session.amount_total } });
      // TODO: trigger extended PDF email (Faza 3b)
    } else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object;
      await sql`UPDATE payments SET status='failed' WHERE stripe_session_id=${session.id || session.metadata?.session_id || ''}`;
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    console.log('Webhook handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
