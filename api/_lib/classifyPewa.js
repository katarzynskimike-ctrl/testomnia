/**
 * Model PEWA™ — klasyfikacja typu osobowości na podstawie wyniku testu DOP.
 *
 * Test ma 33 pytania. Każde pytanie przyznaje 1 punkt jednemu z 4 archetypów:
 *   P = Przyjaciel  (emocjonalny introwertyk)
 *   E = Entuzjasta  (emocjonalny ekstrawertyk)
 *   W = Wódz        (racjonalny ekstrawertyk)
 *   A = Analityk    (racjonalny introwertyk)
 *
 * Klasyfikator zwraca jeden z 13 typów:
 *   - 4 czyste: P, E, W, A
 *   - 8 mieszanych z dominacją: PE, EP, PA, AP, EW, WE, WA, AW
 *   - 1 zrównoważony: D (Diament)
 *
 * Mieszane występują tylko między archetypami SĄSIEDNIMI na kompasie DISC/PEWA:
 *   - P + E (oba emocjonalne)        ✓ możliwe: PE, EP
 *   - P + A (oba introwertyczne)     ✓ możliwe: PA, AP
 *   - W + A (oba racjonalne)         ✓ możliwe: WA, AW
 *   - W + E (oba ekstrawertyczne)    ✓ możliwe: WE, EW
 *
 * Kombinacje DIAGONALNE są wykluczone (różnią się na obydwu osiach):
 *   - P i W (intro/ekstra + emoc/racj)  ✗ nie ma typu „PW" ani „WP"
 *   - E i A (intro/ekstra + emoc/racj)  ✗ nie ma typu „EA" ani „AE"
 *
 * Reguły klasyfikacji (w kolejności sprawdzania):
 *   1. DIAMENT — gdy max-min ≤ 3 AND min ≥ 6 (wszystkie 4 zrównoważone)
 *   2. CZYSTY EKSTREMALNY — gdy top1 ≥ 24 (dominacja przytłaczająca)
 *   3. MIESZANY — gdy top1-top2 ≤ 3 AND para sąsiednia (nie diagonalna)
 *   4. CZYSTY — pozostałe przypadki
 */

const ARCHETYPES = ['P', 'E', 'W', 'A'];

const DIAGONAL_PAIRS = new Set(['PW', 'WP', 'EA', 'AE']);

const LABELS = {
  P: 'Przyjaciel',
  E: 'Entuzjasta',
  W: 'Wódz',
  A: 'Analityk',
  PE: 'Przyjaciel-Entuzjasta',
  EP: 'Entuzjasta-Przyjaciel',
  PA: 'Przyjaciel-Analityk',
  AP: 'Analityk-Przyjaciel',
  EW: 'Entuzjasta-Wódz',
  WE: 'Wódz-Entuzjasta',
  WA: 'Wódz-Analityk',
  AW: 'Analityk-Wódz',
  D:  'Diament',
};

const SUPERPOWERS = {
  P: 'cierpliwa stabilność',
  E: 'zaraźliwa energia',
  W: 'szybka decyzja',
  A: 'głęboka precyzja',
  PE: 'ciepło + iskra',
  EP: 'energia + ciepło',
  PA: 'ciepło + precyzja',
  AP: 'precyzja + ciepło',
  EW: 'energia + napęd',
  WE: 'napęd + energia',
  WA: 'decyzja + dane',
  AW: 'dane + decyzja',
  D:  'mistrzowska elastyczność',
};

/**
 * Klasyfikuje wynik testu PEWA do jednego z 13 typów.
 *
 * @param {{P:number, E:number, W:number, A:number}} counts — liczba punktów dla każdego archetypu
 * @returns {{
 *   code: string,        // np. 'PE'
 *   label: string,       // np. 'Przyjaciel-Entuzjasta'
 *   superpower: string,  // np. 'ciepło + iskra'
 *   kind: 'pure'|'mixed'|'diamond',
 *   intensity: 'extreme'|'strong'|'moderate'|'balanced',
 *   dominant: string,    // dominujący archetyp (litera)
 *   support: string|null,// wspierający archetyp lub null
 *   sorted: [string, number][],  // posortowane od najwyższego
 *   reportFile: string,  // nazwa PDF do wysłania
 * }}
 */
function classifyPewa(input) {
  // Walidacja — przyjmuje {P,E,W,A} lub {P,E,W,A,axisEmotional,axisSocial,flexibility}
  if (!input || typeof input !== 'object') {
    throw new TypeError('classifyPewa: input musi być obiektem {P,E,W,A,...}');
  }
  const counts = { P: input.P, E: input.E, W: input.W, A: input.A };
  for (const k of ARCHETYPES) {
    if (typeof counts[k] !== 'number' || counts[k] < 0 || !Number.isInteger(counts[k])) {
      throw new TypeError(`classifyPewa: counts.${k} musi być nieujemną liczbą całkowitą (otrzymano ${counts[k]})`);
    }
  }
  // Opcjonalne osie kalibracyjne (v1.3+) — Likert 1-5
  const axisEmotional = typeof input.axisEmotional === 'number' ? input.axisEmotional : null;
  const axisSocial    = typeof input.axisSocial    === 'number' ? input.axisSocial    : null;
  const flexibility   = typeof input.flexibility   === 'number' ? input.flexibility   : null;

  // Sortuj od najwyższej
  const sorted = ARCHETYPES
    .map(k => [k, counts[k]])
    .sort((a, b) => b[1] - a[1]);

  const [top1, top2] = sorted;
  const [bot1] = sorted.slice(-1);
  const max = top1[1];
  const min = bot1[1];
  const range = max - min;
  const gap12 = top1[1] - top2[1];

  // Reguła 1: DIAMENT
  // Wszystkie 4 archetypy zrównoważone (różnica max-min mała, każdy znaczący)
  // v1.3+: jeśli mamy flexibility, wymagamy flexibility >= 4
  const flexOk = flexibility === null || flexibility >= 4;
  if (range <= 3 && min >= 6 && flexOk) {
    return makeResult({
      code: 'D',
      kind: 'diamond',
      intensity: 'balanced',
      dominant: top1[0],
      support: null,
      sorted,
      calibration: { axisEmotional, axisSocial, flexibility },
    });
  }

  // Reguła 2: CZYSTY EKSTREMALNY
  // Przytłaczająca dominacja jednego archetypu (≥24 z 33 pytań = ≥73%)
  if (max >= 24) {
    return makeResult({
      code: top1[0],
      kind: 'pure',
      intensity: 'extreme',
      dominant: top1[0],
      support: null,
      sorted,
      calibration: { axisEmotional, axisSocial, flexibility },
    });
  }

  // Reguła 3: MIESZANY
  // Top1 i top2 blisko siebie (gap ≤ 3) AND para sąsiednia (nie diagonalna)
  let pair = top1[0] + top2[0];
  let dominant = top1[0];
  let support = top2[0];

  if (gap12 <= 3 && !DIAGONAL_PAIRS.has(pair)) {
    // v1.3+: gdy gap top1-top2 ≤ 2 i mamy osie kalibracyjne, użyj ich do disambiguacji dominacji
    if (gap12 <= 2 && axisEmotional !== null && axisSocial !== null) {
      const swapped = axisDisambiguate(top1[0], top2[0], axisEmotional, axisSocial);
      if (swapped) {
        dominant = top2[0];
        support = top1[0];
        pair = dominant + support;
      }
    }
    return makeResult({
      code: pair,
      kind: 'mixed',
      intensity: gap12 === 0 ? 'balanced' : (gap12 <= 1 ? 'moderate' : 'strong'),
      dominant,
      support,
      sorted,
      calibration: { axisEmotional, axisSocial, flexibility },
    });
  }

  // Reguła 4: CZYSTY (domyślny)
  // Top1 wyraźnie wyższy ALBO top2 jest diagonalny (więc mieszany nie istnieje)
  return makeResult({
    code: top1[0],
    kind: 'pure',
    intensity: max >= 18 ? 'strong' : 'moderate',
    dominant: top1[0],
    support: null,
    sorted,
    calibration: { axisEmotional, axisSocial, flexibility },
  });
}

/**
 * Disambiguacja: gdy gap top1-top2 jest mały (≤2), użyj osi kalibracyjnych
 * żeby zdecydować który archetyp NAPRAWDĘ dominuje. Zwraca true jeśli należy zamienić.
 *
 * Każdy archetyp ma swoją sygnaturę osi (przybliżoną):
 *   P: emocjonalny (4-5) + introwertyk (1-2)
 *   E: emocjonalny (4-5) + ekstrawertyk (4-5)
 *   W: racjonalny (1-2) + ekstrawertyk (4-5)
 *   A: racjonalny (1-2) + introwertyk (1-2)
 *
 * Sprawdzamy który z top1/top2 BLIŻSZY signature osi z kalibracji.
 */
function axisDisambiguate(top1, top2, axisEmotional, axisSocial) {
  const signatures = {
    P: { e: 4.5, s: 1.5 },
    E: { e: 4.5, s: 4.5 },
    W: { e: 1.5, s: 4.5 },
    A: { e: 1.5, s: 1.5 },
  };
  const dist = (sig) => Math.sqrt(
    Math.pow(sig.e - axisEmotional, 2) + Math.pow(sig.s - axisSocial, 2)
  );
  const d1 = dist(signatures[top1]);
  const d2 = dist(signatures[top2]);
  // Jeśli top2 wyraźnie bliżej osiom kalibracyjnym → zamień
  return (d2 + 0.5) < d1;
}

function makeResult({ code, kind, intensity, dominant, support, sorted, calibration }) {
  return {
    code,
    label: LABELS[code],
    superpower: SUPERPOWERS[code],
    kind,
    intensity,
    dominant,
    support,
    sorted,
    reportFile: getReportFile(code),
    calibration: calibration || null,
  };
}

const REPORT_FILES = {
  P:  'PEWA-raport-P-Przyjaciel.pdf',
  E:  'PEWA-raport-E-Entuzjasta.pdf',
  W:  'PEWA-raport-W-Wodz.pdf',
  A:  'PEWA-raport-A-Analityk.pdf',
  PE: 'PEWA-raport-PE-Przyjaciel-Entuzjasta.pdf',
  EP: 'PEWA-raport-EP-Entuzjasta-Przyjaciel.pdf',
  PA: 'PEWA-raport-PA-Przyjaciel-Analityk.pdf',
  AP: 'PEWA-raport-AP-Analityk-Przyjaciel.pdf',
  EW: 'PEWA-raport-EW-Entuzjasta-Wodz.pdf',
  WE: 'PEWA-raport-WE-Wodz-Entuzjasta.pdf',
  WA: 'PEWA-raport-WA-Wodz-Analityk.pdf',
  AW: 'PEWA-raport-AW-Analityk-Wodz.pdf',
  D:  'PEWA-raport-D-Diament.pdf',
};

function getReportFile(code) {
  return REPORT_FILES[code] || REPORT_FILES.P;
}

/**
 * Adapter dla legacy nazw użytych w teście „4 typy osobowości".
 * Mapuje { opiekun, inspirator, strateg, ekspert } → { P, E, W, A }
 * a następnie woła classifyPewa().
 */
function classifyPewaLegacy(legacyCounts) {
  const input = {
    P: legacyCounts.opiekun || 0,
    E: legacyCounts.inspirator || 0,
    W: legacyCounts.strateg || 0,
    A: legacyCounts.ekspert || 0,
  };
  // Przepuść kalibrację jeśli jest (v1.3+)
  if (typeof legacyCounts.axisEmotional === 'number') input.axisEmotional = legacyCounts.axisEmotional;
  if (typeof legacyCounts.axisSocial    === 'number') input.axisSocial    = legacyCounts.axisSocial;
  if (typeof legacyCounts.flexibility   === 'number') input.flexibility   = legacyCounts.flexibility;
  return classifyPewa(input);
}

/**
 * Zwraca pełen URL do raportu PEWA na testomnia.pl.
 */
function getReportUrl(code, baseUrl = 'https://www.testomnia.pl') {
  return `${baseUrl}/raporty/${getReportFile(code)}`;
}

export { classifyPewa, classifyPewaLegacy, getReportFile, getReportUrl, LABELS, SUPERPOWERS, REPORT_FILES };
export default classifyPewa;
