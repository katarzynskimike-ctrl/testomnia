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
function classifyPewa(counts) {
  // Walidacja
  if (!counts || typeof counts !== 'object') {
    throw new TypeError('classifyPewa: counts musi być obiektem {P,E,W,A}');
  }
  for (const k of ARCHETYPES) {
    if (typeof counts[k] !== 'number' || counts[k] < 0 || !Number.isInteger(counts[k])) {
      throw new TypeError(`classifyPewa: counts.${k} musi być nieujemną liczbą całkowitą (otrzymano ${counts[k]})`);
    }
  }

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
  if (range <= 3 && min >= 6) {
    return makeResult({
      code: 'D',
      kind: 'diamond',
      intensity: 'balanced',
      dominant: top1[0],
      support: null,
      sorted,
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
    });
  }

  // Reguła 3: MIESZANY
  // Top1 i top2 blisko siebie (gap ≤ 3) AND para sąsiednia (nie diagonalna)
  const pair = top1[0] + top2[0];
  if (gap12 <= 3 && !DIAGONAL_PAIRS.has(pair)) {
    return makeResult({
      code: pair,             // np. 'PE' (dominuje top1)
      kind: 'mixed',
      intensity: gap12 === 0 ? 'balanced' : (gap12 <= 1 ? 'moderate' : 'strong'),
      dominant: top1[0],
      support: top2[0],
      sorted,
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
  });
}

function makeResult({ code, kind, intensity, dominant, support, sorted }) {
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
  const counts = {
    P: legacyCounts.opiekun || 0,
    E: legacyCounts.inspirator || 0,
    W: legacyCounts.strateg || 0,
    A: legacyCounts.ekspert || 0,
  };
  return classifyPewa(counts);
}

/**
 * Zwraca pełen URL do raportu PEWA na testomnia.pl.
 */
function getReportUrl(code, baseUrl = 'https://www.testomnia.pl') {
  return `${baseUrl}/raporty/${getReportFile(code)}`;
}

export { classifyPewa, classifyPewaLegacy, getReportFile, getReportUrl, LABELS, SUPERPOWERS, REPORT_FILES };
export default classifyPewa;
