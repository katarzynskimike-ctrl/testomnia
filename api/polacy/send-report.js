// Wielki Test Polaków — bezpłatny wynik na email + CTA do pełnego raportu 39 zł
import { saveResult, markEmailSent, logEvent } from '../_db.js';
import { classifyPewaLegacy, getReportUrl, LABELS } from '../_lib/classifyPewa.js';

const SENDER = { name: 'Wielki Test Osobowości', email: 'katarzynski.mike@gmail.com' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, result } = body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Niepoprawny email' });
    if (!result?.counts) return res.status(400).json({ error: 'Brak counts w result' });
    if (!process.env.BREVO_API_KEY) return res.status(500).json({ error: 'BREVO_API_KEY missing' });

    // Klasyfikuj PEWA (z kalibracją jeśli jest)
    const inputForPewa = { ...result.counts };
    if (result.calibration) {
      if (typeof result.calibration.axisEmotional === 'number') inputForPewa.axisEmotional = result.calibration.axisEmotional;
      if (typeof result.calibration.axisSocial    === 'number') inputForPewa.axisSocial    = result.calibration.axisSocial;
      if (typeof result.calibration.flexibility   === 'number') inputForPewa.flexibility   = result.calibration.flexibility;
    }
    const pewa = classifyPewaLegacy(inputForPewa);

    // Zapis wyniku
    let resultId = null;
    try {
      const saved = await saveResult({
        email,
        testSlug: 'wielki-test-polakow',
        dominant: result?.dominant,
        counts: result?.counts || {},
        total: result?.total || 0,
        ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
        userAgent: req.headers['user-agent'] || null,
        referrer: req.headers['referer'] || null,
        calibration: result?.calibration || null
      });
      resultId = saved.resultId;
      await logEvent({ type: 'wielki_result_saved', email, meta: { code: pewa.code, intensity: pewa.intensity } });
    } catch(e) { console.log('DB save failed (non-blocking):', e.message); }

    const subject = `Twój profil: ${pewa.code} · ${pewa.label} (Wielki Test Osobowości)`;
    const htmlContent = renderEmail(pewa, email, resultId);

    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept':'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type':'application/json' },
      body: JSON.stringify({ sender: SENDER, to: [{ email }], subject, htmlContent, tags:['wielki-test', pewa.code] })
    });
    if (!r.ok) { const errText = await r.text(); return res.status(502).json({ error: 'Brevo API', detail: errText.substring(0,500) }); }
    const data = await r.json();
    if (resultId && data.messageId) { try { await markEmailSent(resultId, data.messageId); } catch(e) {} }

    return res.status(200).json({ success: true, code: pewa.code, label: pewa.label });
  } catch (e) {
    console.log('send-report error:', e);
    return res.status(500).json({ error: e.message || 'Internal' });
  }
}

function renderEmail(pewa, email, resultId) {
  const checkoutUrl = `https://www.testomnia.pl/polacy/test.html?upgrade=1&type=${pewa.code}${resultId ? '&rid='+resultId : ''}`;
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf8f3;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#faf8f3">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#fff;border-radius:18px;border:1px solid #ece8de">
  <tr><td style="padding:36px 32px 16px;text-align:center">
    <p style="margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a87a4d;font-weight:600">Wielki Test Osobowości</p>
    <h1 style="margin:14px 0 4px;font-family:Georgia,serif;font-size:32px;line-height:1.1;color:#1a1a1a;font-weight:600">Twój profil</h1>
  </td></tr>
  <tr><td style="padding:0 32px 24px">
    <div style="padding:28px;background:#faf8f3;border-radius:14px;text-align:center;margin-bottom:20px;border:1px solid #ece8de">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a87a4d;font-weight:600">Twój typ PEWA</p>
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:48px;color:#1a1a1a;font-weight:600;line-height:1">${pewa.code}</p>
      <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:20px;color:#a87a4d;font-style:italic">${pewa.label}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#6b6b6b">Supermoc: ${pewa.superpower}</p>
    </div>

    <p style="margin:0 0 12px;font-size:15px;color:#1a1a1a;line-height:1.65">Cześć!</p>
    <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.65">Wynik Twojego Wielkiego Testu Osobowości to <strong>${pewa.code} · ${pewa.label}</strong>. To jeden z 13 typów modelu PEWA™ — autorskiej metodologii Michała Katarzyńskiego opartej na 14 latach badań i 6 000 testów.</p>
    <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.65">Chcesz dowiedzieć się więcej? <strong>Pełny raport rozwojowy (10 stron, 10 sekcji)</strong> czeka na Ciebie:</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto"><tr><td style="background:#1a1a1a;border-radius:999px">
      <a href="${checkoutUrl}" style="display:inline-block;padding:16px 36px;color:#fff;text-decoration:none;font-weight:600;font-size:15px">Zamów pełny raport · 39 zł →</a>
    </td></tr></table>

    <p style="margin:24px 0 8px;font-size:13px;color:#6b6b6b">Co znajdziesz w pełnym raporcie:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#6b6b6b;font-size:13px;line-height:1.7">
      <li>Pełny opis Twojej supermocy + 10 mocnych stron</li>
      <li>9 naturalnych wyzwań + pierwsza pomoc</li>
      <li>Plan rozwoju 30 i 90 dni</li>
      <li>Twój profil w pracy, w związku, w rodzinie</li>
      <li>Słownik typów osobowości — jak rozpoznawać innych</li>
    </ul>

    <p style="margin:24px 0 0;font-size:12px;color:#9CA0B1;text-align:center">Płatność BLIK / karta / przelew · faktura VAT · PDF w mailu w 2 minuty</p>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #ece8de;text-align:center;color:#9CA0B1;font-size:12px;line-height:1.6">
    <p style="margin:0">© 2026 Excellent Patient Service Sp. z o.o. · NIP 5170359961 · KRS 0000429303</p>
    <p style="margin:14px 0 0"><a href="https://testomnia.pl/polacy/" style="color:#a87a4d;text-decoration:none">testomnia.pl/polacy</a> · <a href="https://www.testomnia.pl/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#6b6b6b">Wypisz się</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
