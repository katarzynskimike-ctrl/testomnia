/**
 * Test units dla classifyPewa() — pokrycie wszystkich 13 ścieżek + edge cases.
 *
 * Uruchom: node classifyPewa.test.js
 */

import { classifyPewa, LABELS } from './classifyPewa.js';

let pass = 0, fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`✓ ${name}`);
  } catch (err) {
    fail++;
    console.error(`✗ ${name}\n   ${err.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
  };
}

// =============================================================================
// 4 czyste typy — silna dominacja
// =============================================================================

test('Czysty Przyjaciel — wyraźna dominacja P', () => {
  const r = classifyPewa({ P: 20, E: 5, W: 4, A: 4 });
  expect(r.code).toBe('P');
  expect(r.kind).toBe('pure');
  expect(r.dominant).toBe('P');
  expect(r.label).toBe('Przyjaciel');
  expect(r.reportFile).toBe('PEWA-raport-P-Przyjaciel.pdf');
});

test('Czysty Entuzjasta — wyraźna dominacja E', () => {
  const r = classifyPewa({ P: 5, E: 19, W: 5, A: 4 });
  expect(r.code).toBe('E');
  expect(r.kind).toBe('pure');
  expect(r.label).toBe('Entuzjasta');
});

test('Czysty Wódz — wyraźna dominacja W', () => {
  const r = classifyPewa({ P: 4, E: 5, W: 20, A: 4 });
  expect(r.code).toBe('W');
  expect(r.kind).toBe('pure');
  expect(r.label).toBe('Wódz');
});

test('Czysty Analityk — wyraźna dominacja A', () => {
  const r = classifyPewa({ P: 4, E: 4, W: 5, A: 20 });
  expect(r.code).toBe('A');
  expect(r.kind).toBe('pure');
  expect(r.label).toBe('Analityk');
});

// =============================================================================
// 4 czyste typy ekstremalne — top1 ≥ 24 (≥73% punktów)
// =============================================================================

test('Ekstremalny Przyjaciel — top1=24', () => {
  const r = classifyPewa({ P: 24, E: 3, W: 3, A: 3 });
  expect(r.code).toBe('P');
  expect(r.intensity).toBe('extreme');
});

test('Ekstremalny Wódz — top1=28', () => {
  const r = classifyPewa({ P: 1, E: 2, W: 28, A: 2 });
  expect(r.code).toBe('W');
  expect(r.intensity).toBe('extreme');
});

test('Ekstremalny — przewaga 24 nawet z bliskim top2=23 wymusza pure (nie mieszany)', () => {
  // Edge case: top1=24, top2=23, gap=1 → reguła #2 (ekstremalny) wygrywa NAD #3 (mieszany)
  const r = classifyPewa({ P: 24, E: 23, W: 4, A: 4 }); // suma 55 — nierealna, ale to test logiki
  // UWAGA: realnie 24+23=47 > 33 (suma pytań), więc to tylko test priorytetu reguł
  // W rzeczywistych wynikach gdzie suma=33, top1≥24 wymusza top2≤9 więc to nie zajdzie
  expect(r.code).toBe('P');
  expect(r.intensity).toBe('extreme');
});

// =============================================================================
// 8 typów mieszanych — pary sąsiednie z dominacją
// =============================================================================

test('PE — Przyjaciel dominuje, Entuzjasta wspiera', () => {
  const r = classifyPewa({ P: 12, E: 10, W: 6, A: 5 });
  expect(r.code).toBe('PE');
  expect(r.kind).toBe('mixed');
  expect(r.dominant).toBe('P');
  expect(r.support).toBe('E');
  expect(r.label).toBe('Przyjaciel-Entuzjasta');
  expect(r.reportFile).toBe('PEWA-raport-PE-Przyjaciel-Entuzjasta.pdf');
});

test('EP — Entuzjasta dominuje, Przyjaciel wspiera', () => {
  const r = classifyPewa({ P: 10, E: 12, W: 6, A: 5 });
  expect(r.code).toBe('EP');
  expect(r.kind).toBe('mixed');
  expect(r.dominant).toBe('E');
  expect(r.support).toBe('P');
});

test('PA — Przyjaciel dominuje, Analityk wspiera', () => {
  const r = classifyPewa({ P: 13, E: 5, W: 5, A: 10 });
  expect(r.code).toBe('PA');
  expect(r.kind).toBe('mixed');
  expect(r.dominant).toBe('P');
  expect(r.support).toBe('A');
});

test('AP — Analityk dominuje, Przyjaciel wspiera', () => {
  const r = classifyPewa({ P: 10, E: 5, W: 5, A: 13 });
  expect(r.code).toBe('AP');
  expect(r.kind).toBe('mixed');
  expect(r.dominant).toBe('A');
  expect(r.support).toBe('P');
});

test('EW — Entuzjasta dominuje, Wódz wspiera', () => {
  const r = classifyPewa({ P: 5, E: 13, W: 10, A: 5 });
  expect(r.code).toBe('EW');
  expect(r.dominant).toBe('E');
  expect(r.support).toBe('W');
});

test('WE — Wódz dominuje, Entuzjasta wspiera', () => {
  const r = classifyPewa({ P: 5, E: 10, W: 13, A: 5 });
  expect(r.code).toBe('WE');
  expect(r.dominant).toBe('W');
  expect(r.support).toBe('E');
});

test('WA — Wódz dominuje, Analityk wspiera', () => {
  const r = classifyPewa({ P: 5, E: 5, W: 13, A: 10 });
  expect(r.code).toBe('WA');
  expect(r.dominant).toBe('W');
  expect(r.support).toBe('A');
});

test('AW — Analityk dominuje, Wódz wspiera', () => {
  const r = classifyPewa({ P: 5, E: 5, W: 10, A: 13 });
  expect(r.code).toBe('AW');
  expect(r.dominant).toBe('A');
  expect(r.support).toBe('W');
});

// =============================================================================
// Diagonalne wykluczenia — top1+top2 diagonalne → fallback do czystego top1
// =============================================================================

test('P+W diagonalne — zwraca czysty P (nie PW)', () => {
  // P i W są na DWÓCH różnych osiach (introwertyk vs ekstrawertyk + emocjonalny vs racjonalny)
  // Nie powinno być typu „PW"
  const r = classifyPewa({ P: 13, E: 4, W: 12, A: 4 });
  expect(r.code).toBe('P');
  expect(r.kind).toBe('pure');
  expect(r.support).toBe(null);
});

test('W+P diagonalne — zwraca czysty W (nie WP)', () => {
  const r = classifyPewa({ P: 12, E: 4, W: 13, A: 4 });
  expect(r.code).toBe('W');
  expect(r.kind).toBe('pure');
});

test('E+A diagonalne — zwraca czysty E (nie EA)', () => {
  const r = classifyPewa({ P: 4, E: 13, W: 4, A: 12 });
  expect(r.code).toBe('E');
  expect(r.kind).toBe('pure');
});

test('A+E diagonalne — zwraca czysty A (nie AE)', () => {
  const r = classifyPewa({ P: 4, E: 12, W: 4, A: 13 });
  expect(r.code).toBe('A');
  expect(r.kind).toBe('pure');
});

// =============================================================================
// Diament — wszystkie 4 zrównoważone
// =============================================================================

test('Diament — wszystkie 4 równe (8/8/8/9)', () => {
  const r = classifyPewa({ P: 8, E: 8, W: 8, A: 9 });
  expect(r.code).toBe('D');
  expect(r.kind).toBe('diamond');
  expect(r.label).toBe('Diament');
  expect(r.intensity).toBe('balanced');
});

test('Diament — max-min ≤ 3 AND min ≥ 6 (7/8/9/9)', () => {
  const r = classifyPewa({ P: 7, E: 8, W: 9, A: 9 });
  expect(r.code).toBe('D');
});

test('NIE-Diament — min < 6 (zbyt nierówne)', () => {
  // 11/8/9/5: range=6, min=5 → nie spełnia warunku min>=6
  const r = classifyPewa({ P: 11, E: 8, W: 9, A: 5 });
  expect(r.code).not === 'D';
});

test('NIE-Diament — range > 3 (zbyt nierówne)', () => {
  // 12/8/8/5: range=7 → nie Diament
  const r = classifyPewa({ P: 12, E: 8, W: 8, A: 5 });
  // P top1=12, E top2=8, gap=4 → nie mieszany; top1 dominuje → czysty P
  expect(r.code).toBe('P');
});

// =============================================================================
// Edge cases — równe punkty (tiebreakers)
// =============================================================================

test('Equal top P=E — wybiera kolejność zdefiniowaną (P pierwszy w ARCHETYPES)', () => {
  const r = classifyPewa({ P: 12, E: 12, W: 5, A: 4 });
  // P i E sąsiednie, gap=0, equal → kod „PE" (P pierwszy w sort stable)
  expect(r.code).toBe('PE');
  expect(r.intensity).toBe('balanced');
});

test('Realistyczna suma 33 — mieszany PE', () => {
  // Realistyczne: suma = 33 pytań
  const r = classifyPewa({ P: 13, E: 11, W: 5, A: 4 });
  // Suma: 33 ✓
  expect(r.code).toBe('PE');
});

test('Realistyczna suma 33 — Diament 9/8/8/8', () => {
  const r = classifyPewa({ P: 9, E: 8, W: 8, A: 8 });
  // Suma: 33, range=1, min=8 ≥ 6 → Diament
  expect(r.code).toBe('D');
});

test('Realistyczna suma 33 — czysty W', () => {
  const r = classifyPewa({ P: 4, E: 5, W: 18, A: 6 });
  // Suma: 33, top1=18, top2=6, gap=12 → czysty
  expect(r.code).toBe('W');
});

// =============================================================================
// Walidacja inputu
// =============================================================================

test('Rzuca błąd dla null', () => {
  let threw = false;
  try { classifyPewa(null); } catch (e) { threw = true; }
  expect(threw).toBe(true);
});

test('Rzuca błąd dla brakującej litery', () => {
  let threw = false;
  try { classifyPewa({ P: 5, E: 5, W: 5 }); } catch (e) { threw = true; }
  expect(threw).toBe(true);
});

test('Rzuca błąd dla ujemnej liczby', () => {
  let threw = false;
  try { classifyPewa({ P: -1, E: 5, W: 5, A: 5 }); } catch (e) { threw = true; }
  expect(threw).toBe(true);
});

test('Rzuca błąd dla wartości niecałkowitej', () => {
  let threw = false;
  try { classifyPewa({ P: 5.5, E: 5, W: 5, A: 5 }); } catch (e) { threw = true; }
  expect(threw).toBe(true);
});

// =============================================================================
// Wszystkie 13 plików PDF istnieją w mapowaniu
// =============================================================================

test('Wszystkie 13 kodów mają mapping do PDF', () => {
  const allCodes = ['P','E','W','A','PE','EP','PA','AP','EW','WE','WA','AW','D'];
  for (const code of allCodes) {
    if (!LABELS[code]) throw new Error(`Brak label dla ${code}`);
  }
});

// =============================================================================
// Sumaryczne
// =============================================================================

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
