// Unsubscribe z PEWA sequence
import { getSql, logEvent } from './_db.js';

export default async function handler(req, res) {
  const email = (req.query?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send('<h1>Niepoprawny email</h1>');
  }
  try {
    const sql = getSql();
    await sql`UPDATE email_sequence SET unsubscribed = true WHERE email = ${email}`;
    await logEvent({ type: 'sequence_unsubscribed', email });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Wypisano</title></head><body style="font-family:-apple-system,sans-serif;background:#080E18;color:#F6F1E8;margin:0;padding:40px 20px;text-align:center"><h1 style="font-family:Georgia,serif;color:#E5B77A">Wypisano z sekwencji</h1><p>Email <strong>${email}</strong> nie otrzyma więcej wiadomości z sekwencji PEWA™.</p><p style="color:#9CA0B1;margin-top:24px"><a href="https://www.testomnia.pl" style="color:#E5B77A">← testomnia.pl</a></p></body></html>`);
  } catch (e) {
    return res.status(500).send('<h1>Błąd</h1>');
  }
}
