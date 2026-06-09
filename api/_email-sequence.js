// PEWA email sequence — 5 maili po opłacie (dzień 0/3/7/14/30)
// Dzień 0 = mail z raportem (już wysyłany w imoje-webhook)
// Dzień 3, 7, 14, 30 = bonus content marketing

const SENDER = { name: 'Testomnia (DOP)', email: 'katarzynski.mike@gmail.com' };
const BASE_URL = 'https://www.testomnia.pl';

function brandHeader(eyebrow, title) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#080E18">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%">
<tr><td style="padding:0 0 28px;text-align:center">
<p style="margin:0;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#E5B77A;font-weight:600">Testomnia · PEWA™</p>
<h1 style="margin:8px 0 4px;font-family:Georgia,serif;font-size:30px;line-height:1.1;color:#F6F1E8;font-weight:600">${title}</h1>
<p style="margin:6px 0 0;font-size:13px;color:#9CA0B1">${eyebrow}</p></td></tr>
<tr><td style="padding:0 8px">`;
}

function brandFooter() {
  return `</td></tr>
<tr><td style="padding:32px 16px 0;border-top:1px solid rgba(255,255,255,.08);text-align:center;color:#7A8294;font-size:12px;line-height:1.6">
<p style="margin:0">© 2026 Excellent Patient Service Sp. z o.o. · NIP 5170359961 · KRS 0000429303</p>
<p style="margin:14px 0 0"><a href="${BASE_URL}" style="color:#E5B77A;text-decoration:none">testomnia.pl</a> · <a href="${BASE_URL}/regulamin.html" style="color:#9CA0B1;text-decoration:underline">Regulamin</a></p>
<p style="margin:14px 0 0;font-size:11px;opacity:.7">Nie chcesz więcej maili? <a href="${BASE_URL}/api/unsubscribe?email=__EMAIL__" style="color:#9CA0B1">Wypisz się</a></p>
</td></tr></table></td></tr></table>`;
}

function section(content) {
  return `<table role="presentation" width="100%" style="margin-bottom:18px"><tr><td style="padding:24px 28px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:#0D1423;color:#D8D6CF;line-height:1.65;font-size:15px">${content}</td></tr></table>`;
}

function cta(url, text, secondary = false) {
  if (secondary) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0"><tr><td style="background:transparent;border:1px solid #E5B77A;border-radius:999px"><a href="${url}" style="display:inline-block;padding:13px 26px;color:#E5B77A;text-decoration:none;font-weight:500;font-size:14px">${text}</a></td></tr></table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0"><tr><td style="background:#E5B77A;border-radius:999px"><a href="${url}" style="display:inline-block;padding:15px 30px;color:#1a1109;text-decoration:none;font-weight:600;font-size:15px">${text}</a></td></tr></table>`;
}

// ============================================================================
// DZIEŃ 3 — Słownik pacjentów + 1 case study
// ============================================================================
export function buildDay3({ email, pewaCode, pewaLabel }) {
  const body = brandHeader('Dzień 3 · Bonus dla zespołu', 'Drukuj słownik pacjentów do gabinetu')
  + section(`
    <p style="margin:0 0 14px"><strong style="color:#F6F1E8">${email.split('@')[0]}</strong>, jeśli już przeczytałeś/aś swój raport PEWA — to teraz jest dobry moment na zespół.</p>
    <p style="margin:0 0 14px">Twoja wizyta z pacjentem to jedno. Ale recepcjonistka, asystentka, higienistka — oni też mają swoje typy. I oni też rozmawiają z pacjentem przed Tobą i po Tobie.</p>
    <p style="margin:0 0 20px"><strong style="color:#E5B77A">Słownik pacjentów PEWA™</strong> — drukowalny PDF, gotowy do powieszenia w pokoju zespołu. Każdy z 4 typów pacjenta, jak go rozpoznać, jakich słów używa, co MÓWIĆ, czego NIE mówić. Z 800 testów stomatologicznych Michała.</p>
    ${cta(BASE_URL + '/raporty/PEWA-typologia-pacjentow-z-ebooka.pdf', '↓ Pobierz słownik pacjentów (PDF)')}
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Case z gabinetu</p>
    <p style="margin:0 0 14px"><em>Z ebooka „Jak zaspokoić 7 podstawowych potrzeb pacjentów stomatologicznych", Michał Katarzyński, 2017:</em></p>
    <p style="margin:0 0 12px;font-style:italic;color:#E5B77A">Pacjent Przyjaciel siada na fotelu. Dr Kowalski mówi: <strong>„Proszę się niczego nie obawiać. Wszystko będzie dobrze."</strong></p>
    <p style="margin:0 0 12px">Pacjent czuje się zdominowany. Wódz powiedział mu „nie obawiaj się", ale on TYLKO TAKIM zdaniem mówi do siebie: <em>aha, mam się obawiać.</em></p>
    <p style="margin:0 0 12px;color:#9CA0B1">Co powiedzieć zamiast?</p>
    <p style="margin:0;font-style:italic;color:#E5B77A"><strong>„Może Pani być spokojna — zajmiemy się Panią odpowiednio. Mamy bardzo bezpieczne, komfortowe znieczulenia."</strong></p>
    <p style="margin:14px 0 0;color:#9CA0B1;font-size:13px">Różnica: spokojna troska zamiast komendy „nie obawiaj się".</p>
  `)
  + brandFooter().replace(/__EMAIL__/g, encodeURIComponent(email));

  return {
    subject: `Drukuj słownik pacjentów (bonus po pełnym raporcie)`,
    htmlContent: `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#080E18;font-family:'Helvetica Neue',Arial,sans-serif;color:#D8D6CF">${body}</body></html>`,
    tags: ['pewa-sequence', 'day-3', pewaCode]
  };
}

// ============================================================================
// DZIEŃ 7 — Jak rozpoznać typ pacjenta w 30 sek
// ============================================================================
export function buildDay7({ email, pewaCode, pewaLabel }) {
  const body = brandHeader('Dzień 7 · Praktyka', 'Rozpoznaj typ pacjenta w 30 sek')
  + section(`
    <p style="margin:0 0 14px">Tydzień temu poznałeś/aś swój kod PEWA. Teraz spróbujmy odwrotnie: jak rozpoznać typ <em>pacjenta</em> zanim usiądzie na fotelu.</p>
    <p style="margin:0 0 18px">Recepcjonistka ma 30 sekund. Asystentka 60. Ty — masz pierwszą minutę. Jeśli rozpoznasz typ w tym czasie, dostosujesz język i pacjent czuje się „u siebie".</p>
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#e87a78;font-weight:600">P · Przyjaciel</p>
    <p style="margin:0 0 8px"><strong>Sygnały:</strong> stoi z dystansem, niepewnie, czeka aż się odezwiesz, mówi cicho.</p>
    <p style="margin:0;color:#9CA0B1;font-size:13px"><em>Słowa:</em> bliskość, ciepło, opieka, bezpiecznie</p>
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#f0b34a;font-weight:600">E · Entuzjasta</p>
    <p style="margin:0 0 8px"><strong>Sygnały:</strong> szybko mówi, dotyka pulpitu, pyta o samopoczucie recepcjonistki, dłonie w ruchu.</p>
    <p style="margin:0;color:#9CA0B1;font-size:13px"><em>Słowa:</em> fantastycznie, super, rewelacja</p>
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#c14a4a;font-weight:600">W · Wódz</p>
    <p style="margin:0 0 8px"><strong>Sygnały:</strong> pyta o konkrety („o której?", „ile czasu?"), patrzy na zegar, nie wchodzi w small-talk.</p>
    <p style="margin:0;color:#9CA0B1;font-size:13px"><em>Słowa:</em> zdecydowanie, najlepiej, strategia</p>
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#3d6e8c;font-weight:600">A · Analityk</p>
    <p style="margin:0 0 8px"><strong>Sygnały:</strong> pyta o procedury, materiały, kwalifikacje. Ma listę pytań. Sprawdził Twoją stronę PRZED wizytą.</p>
    <p style="margin:0;color:#9CA0B1;font-size:13px"><em>Słowa:</em> dokładnie, dane, krok po kroku</p>
  `)
  + section(`
    <p style="margin:0">W pełnym raporcie PEWA (sekcja 5) masz to rozpisane szczegółowo — z konkretnymi zdaniami DO mówić i NIE mówić do każdego typu.</p>
    ${cta(BASE_URL + '/raporty/PEWA-typologia-pacjentow-z-ebooka.pdf', '↓ Pełna typologia pacjentów (PDF)', true)}
  `)
  + brandFooter().replace(/__EMAIL__/g, encodeURIComponent(email));

  return {
    subject: `Jak rozpoznać typ pacjenta w 30 sekund`,
    htmlContent: `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#080E18;font-family:'Helvetica Neue',Arial,sans-serif;color:#D8D6CF">${body}</body></html>`,
    tags: ['pewa-sequence', 'day-7', pewaCode]
  };
}

// ============================================================================
// DZIEŃ 14 — Zespół musi rozumieć siebie (cross-sell Test 6)
// ============================================================================
export function buildDay14({ email, pewaCode, pewaLabel }) {
  const body = brandHeader('Dzień 14 · Cały zespół', 'Wprowadź PEWA™ w całym zespole')
  + section(`
    <p style="margin:0 0 14px">Najlepsza praktyka medyczna nie ma najlepszego lekarza. Ma najlepszy <strong style="color:#F6F1E8">zespół</strong>.</p>
    <p style="margin:0 0 14px">Twój kod to <strong style="color:#E5B77A">${pewaCode} · ${pewaLabel}</strong>. Ale recepcjonistka też ma swój typ. Asystentka też. Higienistka też.</p>
    <p style="margin:0 0 14px">Wyobraź sobie: ranek, briefing 5 minut. Każdy mówi swój kod PEWA i co dziś potrzebuje od zespołu. Wódz: „idziemy, mam plan". Przyjaciel: „dziś bądźcie blisko, czuję pacjenta z lękiem". Analityk: „mam pytanie o protokół X".</p>
    <p style="margin:0 0 14px">To zmienia praktykę. Nie magią, mechaniką.</p>
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Propozycja</p>
    <p style="margin:0 0 14px">Wyślij ten link wszystkim w zespole. Każdy robi test bezpłatnie. Po 5 testach masz mapę typów całego zespołu.</p>
    <p style="margin:0 0 8px;font-size:14px;color:#9CA0B1">Link do udostępnienia:</p>
    <p style="margin:0;font-family:monospace;font-size:13px;background:#080E18;padding:10px 14px;border-radius:6px;color:#E5B77A;word-break:break-all">${BASE_URL}/wielki-test.html</p>
    ${cta(BASE_URL + '/wielki-test.html', 'Otwórz Wielki Test', true)}
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Bonus za 2 tygodnie</p>
    <p style="margin:0">Za 16 dni dostaniesz wiadomość z prośbą o krótki feedback. Twoja opinia kształtuje następne wersje PEWA.</p>
  `)
  + brandFooter().replace(/__EMAIL__/g, encodeURIComponent(email));

  return {
    subject: `Wprowadź PEWA w całym zespole (dzień 14)`,
    htmlContent: `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#080E18;font-family:'Helvetica Neue',Arial,sans-serif;color:#D8D6CF">${body}</body></html>`,
    tags: ['pewa-sequence', 'day-14', pewaCode]
  };
}

// ============================================================================
// DZIEŃ 30 — Feedback request + cross-sell innego testu
// ============================================================================
export function buildDay30({ email, pewaCode, pewaLabel }) {
  const body = brandHeader('Dzień 30 · Twoja opinia', 'Jak poszło z PEWA?')
  + section(`
    <p style="margin:0 0 14px">Minął miesiąc od Twojego pełnego raportu <strong style="color:#E5B77A">${pewaCode}</strong>.</p>
    <p style="margin:0 0 14px">Pytanie: co się zmieniło? Wprowadziłeś/aś coś z planu 30 dni? Pacjent zareagował inaczej? Zespół zaczął używać kodów PEWA na briefingach?</p>
    <p style="margin:0 0 18px"><strong style="color:#F6F1E8">Daj mi znać — odpisz na tego maila.</strong> 2-3 zdania wystarczą. Czytam każdą odpowiedź osobiście. Twoja opinia kształtuje następne wersje testów.</p>
  `)
  + section(`
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#E5B77A;font-weight:600">Jeśli PEWA Ci się przydał…</p>
    <p style="margin:0 0 14px">…to mamy 6 kolejnych testów DOP. Każdy z innym kątem:</p>
    <ul style="margin:0 0 14px;padding-left:20px;color:#D8D6CF;line-height:1.7">
      <li><strong>Test 3</strong> — Styl menedżera praktyki (jak prowadzisz zespół)</li>
      <li><strong>Test 4</strong> — Wszechstronne przywództwo</li>
      <li><strong>Test 6</strong> — DOP wiedza zespołu (audyt wiedzy całej grupy)</li>
      <li><strong>Test 7</strong> — Macierz Suwerenności (strategia rozwoju praktyki)</li>
    </ul>
    ${cta(BASE_URL + '/#testy', 'Zobacz wszystkie 7 testów')}
  `)
  + section(`
    <p style="margin:0;font-style:italic;color:#9CA0B1">Dziękuję za zaufanie. Każdy raport to dla mnie kolejny test mojej własnej hipotezy: że doskonała obsługa pacjenta da się nauczyć i mierzyć.<br><br>— Michał Katarzyński</p>
  `)
  + brandFooter().replace(/__EMAIL__/g, encodeURIComponent(email));

  return {
    subject: `Dzień 30 — jak poszło z PEWA? (krótka prośba o feedback)`,
    htmlContent: `<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#080E18;font-family:'Helvetica Neue',Arial,sans-serif;color:#D8D6CF">${body}</body></html>`,
    tags: ['pewa-sequence', 'day-30', pewaCode]
  };
}

export const SEQUENCE_STEPS = [
  { step: 3,  delayDays: 3,  builder: buildDay3 },
  { step: 7,  delayDays: 7,  builder: buildDay7 },
  { step: 14, delayDays: 14, builder: buildDay14 },
  { step: 30, delayDays: 30, builder: buildDay30 },
];
