// Vercel Serverless Function: /api/send-report
// Wysyła HTML raport z wynikiem testu przez Brevo

const SENDER = { name: 'Testomnia (DOP)', email: 'katarzynski.mike@gmail.com' };

const TEST_NAMES = {
  '4-typy-osobowosci': 'Test 1 · 4 typy osobowości (DISC)',
  'wiedzy-lekarza': 'Test 2 · Wiedza lekarza',
  'stylu-menadzera': 'Test 3 · Styl menedżera praktyki',
  'wszechstronnego-przywodztwa': 'Test 4 · Wszechstronne przywództwo',
  'komunikacja-pokolenia': 'Test 5 · Komunikacja pokoleń',
  'dop-wiedza': 'Test 6 · DOP — wiedza zespołu',
  'macierz-suwerennosci': 'Test 7 · Macierz suwerenności'
};

const DISC = {
  opiekun: { name:'Przyjaciel', sub:'Emocjonalny Słuchacz', color:'#22c55e',
    desc:'Jesteś empatycznym słuchaczem. Decyzje podejmujesz po sercu, ważne są dla Ciebie relacje i poczucie bezpieczeństwa. W kontakcie z lekarzem szukasz zaufania i ciepła.',
    strengths:['Empatia i ciepło w relacjach','Lojalność wobec zespołu','Cierpliwość w trudnych rozmowach'],
    risks:['Trudność z odmową','Branie spraw zbyt osobiście','Długie wahanie przed decyzją'],
    advice:'Ćwicz świadome stawianie granic. Zacznij od małych „nie" — np. odmów jednej dodatkowej prośby tygodniowo. Po miesiącu zauważysz, że Twoja energia rośnie, a relacje pozostają silne.' },
  inspirator: { name:'Entuzjasta', sub:'Emocjonalny Mówca', color:'#eab308',
    desc:'Jesteś energetyczny i otwarty. Idziesz za emocjami, lubisz nowe doświadczenia i ludzi. Decyzje podejmujesz spontanicznie.',
    strengths:['Energia, która porywa innych','Otwartość na nowe pomysły','Naturalny PR i nawiązywanie relacji'],
    risks:['Pomijanie szczegółów','Łatwa zmiana zdania','Słabość do obietnic bez konkretów'],
    advice:'Wprowadź jeden „dzień analityka" w tygodniu — godzinę bez nowych pomysłów, tylko na finalizowanie tego, co już zacząłeś. Pisz checklisty przed ważnymi rozmowami.' },
  strateg: { name:'Wódz', sub:'Racjonalny Mówca', color:'#ef4444',
    desc:'Jesteś zdecydowany i konkretny. Cenisz wynik, kompetencje i tempo. Chcesz mieć kontrolę i wpływ na decyzję.',
    strengths:['Szybkie podejmowanie decyzji','Jasna komunikacja oczekiwań','Skupienie na celu'],
    risks:['Zbyt szybkie wnioskowanie','Niedosłuchiwanie wątpliwości','Frustracja gdy proces trwa długo'],
    advice:'Wprowadź zasadę „3 pytań przed decyzją": Co mówią dane? Co mówi zespół? Co mówi pacjent? Spowolnij o 24 godziny na decyzjach większych niż 10 000 zł.' },
  ekspert: { name:'Analityk', sub:'Racjonalny Słuchacz', color:'#3b82f6',
    desc:'Jesteś dokładny i ostrożny. Potrzebujesz danych, faktów, drugiej opinii zanim się zdecydujesz. Cenisz kompetencje i precyzję.',
    strengths:['Głęboka analiza i precyzja','Wiarygodność w argumentach','Spokój pod presją'],
    risks:['Paraliż analizy','Zbyt długie odkładanie decyzji','Chłodny dystans do drugiej osoby'],
    advice:'Wprowadź zasadę „80% wystarczy". Gdy masz 80% danych i decyzja jest odwracalna — działaj. Ćwicz „warmup minute" — pierwsze 60 sek rozmowy poświęć na ciepło, nie na fakty.' }
};

function discReport(r) {
  const d = DISC[r.dominant] || DISC.opiekun;
  const counts = r.counts || {};
  const total = Object.values(counts).reduce((a,b)=>a+(b||0),0) || 1;
  const order = ['opiekun','inspirator','strateg','ekspert'].sort((a,b)=>(counts[b]||0)-(counts[a]||0));
  const bars = order.map(k=>{const m=DISC[k];const c=counts[k]||0;const p=Math.round((c/total)*100);return `<tr><td style="padding:8px 12px 8px 0;width:140px;vertical-align:middle"><span style="display:inline-block;width:10px;height:10px;background:${m.color};border-radius:2px;margin-right:8px;vertical-align:middle"></span><strong style="color:#F6F1E8">${m.name}</strong><br><span style="font-size:12px;color:#9CA0B1">${m.sub}</span></td><td style="padding:8px 0;width:100%;vertical-align:middle"><div style="background:#080E18;height:10px;border-radius:999px;overflow:hidden"><div style="height:10px;width:${Math.max(2,p)}%;background:${m.color};border-radius:999px"></div></div></td><td style="padding:8px 0 8px 16px;text-align:right;vertical-align:middle;color:#F6F1E8;font-weight:700;white-space:nowrap">${p}% <span style="color:#9CA0B1;font-weight:400;font-size:12px">(${c} pkt)</span></td></tr>`;}).join('');
  return `<section style="padding:32px 28px;border:1px solid rgba(229,183,122,.25);border-radius:18px;background:#0D1423;margin-bottom:18px">
<p style="margin:0 0 14px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#E5B77A;font-weight:600">Twój dominujący styl</p>
<h2 style="margin:0;font-family:Georgia,serif;font-size:36px;line-height:1.05;color:${d.color};font-weight:600">${d.name}</h2>
<p style="margin:8px 0 0;font-size:14px;color:#9CA0B1">${d.sub}</p></section>
<section style="padding:24px 28px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:#0D1423;margin-bottom:18px">
<p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Co znaczy Twój wynik</p>
<p style="margin:0;color:#D8D6CF;line-height:1.65;font-size:15px">${d.desc}</p></section>
<section style="padding:24px 28px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:#0D1423;margin-bottom:18px">
<p style="margin:0 0 14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Podział 4 stylów</p>
<table style="width:100%;border-collapse:collapse">${bars}</table></section>
<section style="padding:24px 28px;border:1px solid rgba(34,197,94,.3);border-radius:18px;background:#0D1423;margin-bottom:18px">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6FCF97;font-weight:600">Co Ci pomaga</p>
<ul style="margin:0;padding-left:20px;color:#D8D6CF;font-size:15px;line-height:1.7">${d.strengths.map(s=>`<li>${s}</li>`).join('')}</ul></section>
<section style="padding:24px 28px;border:1px solid rgba(226,106,106,.3);border-radius:18px;background:#0D1423;margin-bottom:18px">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E26A6A;font-weight:600">Na co uważać</p>
<ul style="margin:0;padding-left:20px;color:#D8D6CF;font-size:15px;line-height:1.7">${d.risks.map(r=>`<li>${r}</li>`).join('')}</ul></section>
<section style="padding:28px;border:1px solid rgba(229,183,122,.4);border-radius:18px;background:linear-gradient(180deg,rgba(229,183,122,.1),rgba(229,183,122,.03));margin-bottom:18px">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Pierwszy krok — plan 30 dni</p>
<p style="margin:0;color:#F6F1E8;line-height:1.7;font-size:16px;font-style:italic;font-family:Georgia,serif">${d.advice}</p></section>`;
}

function genericReport(slug, r) {
  return `<section style="padding:32px 28px;border:1px solid rgba(229,183,122,.25);border-radius:18px;background:#0D1423">
<h2 style="margin:0 0 14px;font-family:Georgia,serif;font-size:28px;color:#E5B77A;font-weight:600">Twój wynik</h2>
<p style="color:#D8D6CF;line-height:1.7;font-size:15px">Twój wynik z testu został zapisany. Pełniejszy template raportu dla tego testu jest w przygotowaniu — wkrótce otrzymasz rozbudowaną wersję.</p>
<pre style="background:#080E18;padding:16px;border-radius:12px;color:#9CA0B1;font-size:12px;overflow-x:auto;white-space:pre-wrap;font-family:monospace">${JSON.stringify(r,null,2)}</pre></section>`;
}

function renderEmail(slug, result) {
  const name = TEST_NAMES[slug] || 'Test Testomnia';
  const body = slug === '4-typy-osobowosci' ? discReport(result) : genericReport(slug, result);
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Twój raport · ${name}</title></head>
<body style="margin:0;padding:0;background:#080E18;font-family:'Helvetica Neue',Arial,sans-serif;color:#D8D6CF">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#080E18"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%">
<tr><td style="padding:0 0 28px;text-align:center">
<p style="margin:0;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#E5B77A;font-weight:600">Testomnia</p>
<h1 style="margin:8px 0 4px;font-family:Georgia,serif;font-size:32px;line-height:1.1;color:#F6F1E8;font-weight:600">Twój raport jest gotowy</h1>
<p style="margin:6px 0 0;font-size:14px;color:#9CA0B1">${name}</p></td></tr>
<tr><td>${body}</td></tr>
<tr><td style="padding:8px 28px 24px;text-align:center;color:#9CA0B1;font-size:13px;line-height:1.6">
Chcesz wydrukować raport? W przeglądarce: <strong>Ctrl/Cmd + P</strong> → zapisz jako PDF.</td></tr>
<tr><td style="padding:28px 16px 0;border-top:1px solid rgba(255,255,255,.08);text-align:center;color:#7A8294;font-size:12px;line-height:1.6">
<p style="margin:0">© 2026 Excellent Patient Service Sp. z o.o. · NIP 5170359961 · KRS 0000429303</p>
<p style="margin:8px 0 0">ul. Teodora Lubomirskiego 39/E, 36-040 Boguchwała</p>
<p style="margin:14px 0 0;font-size:11px;opacity:.7">Test rozwojowy i edukacyjny. <strong>Nie stanowi diagnozy psychologicznej, medycznej ani orzeczniczej.</strong></p>
<p style="margin:10px 0 0"><a href="https://testomnia.pl" style="color:#E5B77A;text-decoration:none">testomnia.pl</a> · <a href="https://testomnia.pl/regulamin.html" style="color:#9CA0B1;text-decoration:underline">Regulamin</a> · <a href="https://testomnia.pl/polityka-prywatnosci.html" style="color:#9CA0B1;text-decoration:underline">Polityka</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, slug, result } = body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Niepoprawny email' });
    if (!slug || !result) return res.status(400).json({ error: 'Brak danych testu' });
    if (!process.env.BREVO_API_KEY) return res.status(500).json({ error: 'BREVO_API_KEY missing' });
    const subject = `Twój raport · ${TEST_NAMES[slug] || 'Test Testomnia'}`;
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept':'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type':'application/json' },
      body: JSON.stringify({ sender: SENDER, to: [{ email }], subject, htmlContent: renderEmail(slug, result), tags:['raport',slug] })
    });
    if (!r.ok) { const errText = await r.text(); return res.status(502).json({ error: 'Brevo API', detail: errText.substring(0,500) }); }
    const data = await r.json();
    return res.status(200).json({ success: true, messageId: data.messageId });
  } catch (e) { return res.status(500).json({ error: e.message || 'Internal' }); }
}
