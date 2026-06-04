import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Fonty zlokalizowane w public/fonts; sciezka wzgledem api/compass.js
const FONTS_DIR = join(__dirname, '_fonts');
let FONT_REG = null, FONT_BOLD = null;
try { FONT_REG = readFileSync(join(FONTS_DIR, 'DejaVuSans.ttf')); console.log('FONT_REG loaded:', FONT_REG.length, 'bytes from', FONTS_DIR); } catch(e) { console.log('FONT_REG failed:', e.message, 'dir:', FONTS_DIR); }
try { FONT_BOLD = readFileSync(join(FONTS_DIR, 'DejaVuSans-Bold.ttf')); console.log('FONT_BOLD loaded:', FONT_BOLD.length, 'bytes'); } catch(e) { console.log('FONT_BOLD failed:', e.message); }

const META = {
  opiekun:    {name:'Przyjaciel', color:'#22c55e'},
  inspirator: {name:'Entuzjasta', color:'#eab308'},
  strateg:    {name:'Wódz',       color:'#ef4444'},
  ekspert:    {name:'Analityk',   color:'#3b82f6'}
};

function buildSvg(counts) {
  const opi = counts.opiekun || 0;
  const ins = counts.inspirator || 0;
  const str = counts.strateg || 0;
  const eks = counts.ekspert || 0;
  const totalQ = (opi + ins + str + eks) || 33;
  const mowca = str + ins, sluchacz = opi + eks;
  const emoc = opi + ins, rac = str + eks;
  const maxPt = 33;
  const cx = 320, cy = 260, rMax = 158;
  const ptScale = rMax / maxPt;
  const mowcaX = cx + mowca * ptScale;
  const sluchaczX = cx - sluchacz * ptScale;
  const emocY = cy - emoc * ptScale;
  const racY = cy + rac * ptScale;

  const archs = [
    {pkt: opi, dx: -1, dy: -1, color: META.opiekun.color},
    {pkt: ins, dx: +1, dy: -1, color: META.inspirator.color},
    {pkt: str, dx: +1, dy: +1, color: META.strateg.color},
    {pkt: eks, dx: -1, dy: +1, color: META.ekspert.color}
  ];
  const dom = archs.reduce((a, b) => b.pkt > a.pkt ? b : a);
  const domFrac = dom.pkt / maxPt;
  const diag = 1 / Math.SQRT2;
  const dotX = cx + dom.dx * domFrac * rMax * diag;
  const dotY = cy + dom.dy * domFrac * rMax * diag;
  const dotPct = Math.round(dom.pkt / totalQ * 100);

  function vt(text, x, fs, color, w) {
    const SP = 14;
    const chars = Array.from(text);
    const n = chars.length;
    const half = ((n - 1) * SP) / 2;
    return chars.map((ch, i) =>
      `<text x="${x}" y="${cy - half + i*SP}" text-anchor="middle" font-size="${fs}" font-weight="${w}" fill="${color}" letter-spacing="1">${ch}</text>`
    ).join('');
  }

  const minAxisPt = Math.min(emoc, rac, mowca, sluchacz);
  const tickVals = minAxisPt > 3 ? [18, 33] : [3, 18, 33];

  let ticks = '';
  tickVals.forEach(p => {
    const o = p * ptScale;
    const atEdge = (p === maxPt);
    ticks += `<line x1="${cx+o}" y1="${cy-3}" x2="${cx+o}" y2="${cy+3}" stroke="#E5B77A" stroke-width="1"/>`;
    ticks += `<text x="${cx+o - (atEdge?5:0)}" y="${cy+13}" text-anchor="${atEdge?'end':'middle'}" font-size="10" fill="#9CA0B1">${p}</text>`;
    ticks += `<line x1="${cx-o}" y1="${cy-3}" x2="${cx-o}" y2="${cy+3}" stroke="#E5B77A" stroke-width="1"/>`;
    ticks += `<text x="${cx-o + (atEdge?5:0)}" y="${cy+13}" text-anchor="${atEdge?'start':'middle'}" font-size="10" fill="#9CA0B1">${p}</text>`;
    ticks += `<line x1="${cx-3}" y1="${cy-o}" x2="${cx+3}" y2="${cy-o}" stroke="#E5B77A" stroke-width="1"/>`;
    ticks += `<text x="${cx-7}" y="${cy-o + (atEdge?10:3)}" text-anchor="end" font-size="10" fill="#9CA0B1">${p}</text>`;
    ticks += `<line x1="${cx-3}" y1="${cy+o}" x2="${cx+3}" y2="${cy+o}" stroke="#E5B77A" stroke-width="1"/>`;
    ticks += `<text x="${cx-7}" y="${cy+o - (atEdge?5:-3)}" text-anchor="end" font-size="10" fill="#9CA0B1">${p}</text>`;
  });
  ticks += `<text x="${cx-6}" y="${cy+13}" text-anchor="end" font-size="10" fill="#9CA0B1">0</text>`;

  const arrSz = 6;
  const xPktL = cx - rMax - 10, xSluL = cx - rMax - 50, xIntL = cx - rMax - 70;
  const xPktR = cx + rMax + 10, xMowR = cx + rMax + 50, xEkstR = cx + rMax + 70;

  return `<svg viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" width="680" height="520">
<rect width="680" height="520" fill="#0D1423"/>
<rect x="${cx-rMax}" y="${cy-rMax}" width="${rMax}" height="${rMax}" fill="${META.opiekun.color}" opacity=".04"/>
<rect x="${cx}" y="${cy-rMax}" width="${rMax}" height="${rMax}" fill="${META.inspirator.color}" opacity=".04"/>
<rect x="${cx-rMax}" y="${cy}" width="${rMax}" height="${rMax}" fill="${META.ekspert.color}" opacity=".04"/>
<rect x="${cx}" y="${cy}" width="${rMax}" height="${rMax}" fill="${META.strateg.color}" opacity=".04"/>
<rect x="${cx-rMax}" y="${cy-rMax}" width="${rMax*2}" height="${rMax*2}" fill="none" stroke="rgba(229,183,122,.32)" stroke-width="1"/>
${ticks}
<line x1="${cx-rMax}" y1="${cy}" x2="${cx+rMax}" y2="${cy}" stroke="#E5B77A" stroke-width="1.5"/>
<line x1="${cx}" y1="${cy-rMax}" x2="${cx}" y2="${cy+rMax}" stroke="#E5B77A" stroke-width="1.5"/>
<polygon points="${cx+rMax-arrSz},${cy-arrSz/2} ${cx+rMax-arrSz},${cy+arrSz/2} ${cx+rMax},${cy}" fill="#E5B77A"/>
<polygon points="${cx-rMax+arrSz},${cy-arrSz/2} ${cx-rMax+arrSz},${cy+arrSz/2} ${cx-rMax},${cy}" fill="#E5B77A"/>
<polygon points="${cx-arrSz/2},${cy-rMax+arrSz} ${cx+arrSz/2},${cy-rMax+arrSz} ${cx},${cy-rMax}" fill="#E5B77A"/>
<polygon points="${cx-arrSz/2},${cy+rMax-arrSz} ${cx+arrSz/2},${cy+rMax-arrSz} ${cx},${cy+rMax}" fill="#E5B77A"/>
<polygon points="${cx},${emocY} ${mowcaX},${cy} ${cx},${racY} ${sluchaczX},${cy}" fill="rgba(229,183,122,.12)" stroke="#E5B77A" stroke-width="1.5" stroke-linejoin="round"/>
<circle cx="${cx}" cy="${emocY}" r="5" fill="${META.opiekun.color}" stroke="#0D1423" stroke-width="1.5"/>
<circle cx="${mowcaX}" cy="${cy}" r="5" fill="${META.strateg.color}" stroke="#0D1423" stroke-width="1.5"/>
<circle cx="${cx}" cy="${racY}" r="5" fill="${META.ekspert.color}" stroke="#0D1423" stroke-width="1.5"/>
<circle cx="${sluchaczX}" cy="${cy}" r="5" fill="${META.inspirator.color}" stroke="#0D1423" stroke-width="1.5"/>
<text x="${cx-rMax+10}" y="${cy-rMax+18}" font-size="13" font-weight="700" fill="${META.opiekun.color}">Przyjaciel</text>
<text x="${cx+rMax-10}" y="${cy-rMax+18}" font-size="13" font-weight="700" fill="${META.inspirator.color}" text-anchor="end">Entuzjasta</text>
<text x="${cx-rMax+10}" y="${cy+rMax-7}" font-size="13" font-weight="700" fill="${META.ekspert.color}">Analityk</text>
<text x="${cx+rMax-10}" y="${cy+rMax-7}" font-size="13" font-weight="700" fill="${META.strateg.color}" text-anchor="end">Wódz</text>
<text x="${cx}" y="${cy-rMax-22}" text-anchor="middle" font-size="11" font-weight="700" fill="#F6F1E8" letter-spacing="2">EMOCJONALNY</text>
<text x="${cx}" y="${cy-rMax-8}" text-anchor="middle" font-size="10" font-weight="600" fill="#E5B77A" letter-spacing="1.5">EMOCJE &#183; <tspan fill="${META.opiekun.color}" font-weight="700">${emoc} pkt</tspan></text>
<text x="${cx}" y="${cy+rMax+30}" text-anchor="middle" font-size="11" font-weight="700" fill="#F6F1E8" letter-spacing="2">RACJONALNY</text>
<text x="${cx}" y="${cy+rMax+18}" text-anchor="middle" font-size="10" font-weight="600" fill="#E5B77A" letter-spacing="1.5">FAKTY &#183; <tspan fill="${META.ekspert.color}" font-weight="700">${rac} pkt</tspan></text>
<text x="${xPktL}" y="${cy+4}" text-anchor="end" font-size="11" font-weight="700" fill="${META.inspirator.color}">${sluchacz} pkt</text>
${vt('SŁUCHACZ', xSluL, 10, '#E5B77A', '600')}
${vt('INTROWERTYK', xIntL, 10, '#F6F1E8', '700')}
<text x="${xPktR}" y="${cy+4}" text-anchor="start" font-size="11" font-weight="700" fill="${META.strateg.color}">${mowca} pkt</text>
${vt('MÓWCA', xMowR, 10, '#E5B77A', '600')}
${vt('EKSTRAWERTYK', xEkstR, 10, '#F6F1E8', '700')}
<line x1="${cx}" y1="${cy}" x2="${dotX}" y2="${dotY}" stroke="${dom.color}" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/>
<circle cx="${dotX}" cy="${dotY}" r="4.5" fill="#E5B77A" stroke="#0D1423" stroke-width="1.8"/>
<text x="${dotX + (dom.dx*10)}" y="${dotY + (dom.dy*10) + 4}" text-anchor="${dom.dx>0?'start':'end'}" font-size="10" font-weight="700" fill="#E5B77A">${dotPct}%</text>
</svg>`;
}

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const counts = {
      opiekun:    parseInt(q.o, 10) || 0,
      inspirator: parseInt(q.i, 10) || 0,
      strateg:    parseInt(q.s, 10) || 0,
      ekspert:    parseInt(q.e, 10) || 0
    };
    const svg = buildSvg(counts);
    const fontBuffers = [FONT_REG, FONT_BOLD].filter(Boolean);
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 680 },
      font: {
        fontBuffers,
        loadSystemFonts: false,
        defaultFontFamily: 'DejaVu Sans',
        serifFamily: 'DejaVu Sans',
        sansSerifFamily: 'DejaVu Sans',
        cursiveFamily: 'DejaVu Sans',
        fantasyFamily: 'DejaVu Sans',
        monospaceFamily: 'DejaVu Sans'
      }
    });
    const png = resvg.render().asPng();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.status(200).send(Buffer.from(png));
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
