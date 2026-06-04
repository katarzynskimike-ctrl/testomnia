// Jednorazowy endpoint do dodania verified sender w Brevo
// GET /api/add-sender?email=kontakt@testomnia.pl&name=Testomnia
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const email = (req.query?.email || '').trim();
  const name = (req.query?.name || 'Testomnia').trim();
  if (!email) { return res.status(400).json({ error: 'missing ?email=' }); }
  try {
    const r = await fetch('https://api.brevo.com/v3/senders', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return res.status(r.status).json({ status: r.status, brevo: json });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
