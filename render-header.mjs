// GitHub profile header: one day in Dubai, an hour a second.
//   ring    the personal 24-lobe mark (src/lib/glyph.ts, seeded from the full name); the day so far traces
//           round it in ink, led by the signal dot, once every 24 s
//   shadow  the name casts the shadow Dubai's sun would put on a south-facing wall at each hour
//           (NOAA solar position, equinox): left in the morning, down at noon, right in the evening, none at night
//   paper   (light) moves through the site's dawn, day, dusk and night tints
// Real, selectable text in the site's fonts, embedded as tiny subsets (only the letters used), so the file
// is small and GitHub's image proxy shows it exactly. No script; holds still at 15:00 under reduced motion.
//
// Usage (run outside the site's dependencies; these packages are only needed here):
//   mkdir ghcard && cd ghcard && npm init -y && npm i subset-font@2.4.0
//   put Instrument-Serif.ttf and IBM-Plex-Mono.ttf (Google Fonts, OFL) in ghcard/fonts/
//   node <this file> <portfolio-root> <out-dir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import subsetFont from "subset-font";

const [root, out] = process.argv.slice(2);
const { makeGlyph } = await import(pathToFileURL(join(root, "src/lib/glyph.ts")).href);
const SERIF_TTF = readFileSync(new URL("./fonts/Instrument-Serif.ttf", import.meta.url));
const MONO_TTF = readFileSync(new URL("./fonts/IBM-Plex-Mono.ttf", import.meta.url));

const W = 1200, H = 360, PAD = 72, MARK = 250;
const CX = W - PAD - MARK / 2, CY = H / 2;
const DAY = 24; // seconds per loop: one hour a second
const STILL = 15; // the hour shown under reduced motion
const r2 = (n) => Math.round(n * 100) / 100;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&#39;");

/* ─── Copy ─── */
const NAME = "Muhammed Favas";
const KICKER = "favas.dev";
const LINE1 = "Backend engineer in Dubai";
const LINE2 = "Payments, connected devices, and VYNA at Nayrix";
const CAPTION = "one day in Dubai, an hour a second";
const HOURS = [["00", 0], ["06", 0.25], ["12", 0.5], ["18", 0.75]];

/* ─── Fonts: subset to the letters used, metrics for baselines ─── */
function metrics(ttf) {
  const n = ttf.readUInt16BE(4);
  const table = (tag) => {
    for (let i = 0; i < n; i++) { const o = 12 + i * 16; if (ttf.toString("latin1", o, o + 4) === tag) return ttf.readUInt32BE(o + 8); }
    throw new Error(`no ${tag} table`);
  };
  const upm = ttf.readUInt16BE(table("head") + 18);
  const hhea = table("hhea");
  return { upm, asc: ttf.readInt16BE(hhea + 4), desc: ttf.readInt16BE(hhea + 6) };
}
const SERIF = metrics(SERIF_TTF), MONO = metrics(MONO_TTF);
const serifWoff2 = await subsetFont(SERIF_TTF, NAME, { targetFormat: "woff2" });
const monoWoff2 = await subsetFont(MONO_TTF, [KICKER, LINE1, LINE2, CAPTION, ...HOURS.map((x) => x[0])].join(""), { targetFormat: "woff2" });
// Baseline for a box whose top is `top`, with CSS line-height 1 (the name) or normal (the rest)
const baseline = (m, size, top, tight) => {
  const asc = (m.asc / m.upm) * size, desc = (-m.desc / m.upm) * size;
  return r2(tight ? top + (size - (asc + desc)) / 2 + asc : top + asc);
};

/* ─── The mark ─── */
const glyph = makeGlyph("Muhammed Favas Thachaparamban", 24, MARK, { samples: 720, wobble: 0.25, depth: 0.045, alignLobes: true, inset: 22 });
const ox = CX - MARK / 2, oy = CY - MARK / 2;
const ring = glyph.path.replace(/(\d+\.\d)\d+/g, "$1");
const still = glyph.pointAt(STILL / 24);

/* ─── The sun over Dubai at each hour (equinox), as a south-facing wall sees it ─── */
const RAD = Math.PI / 180, LAT = 25.2048 * RAD, LON = 55.2708, TZ = 240, DOY = 80;
const g = ((2 * Math.PI) / 365) * (DOY - 1);
const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
function sunAt(hour) {
  const ha = ((hour * 60 + eq + 4 * LON - TZ) / 4 - 180) * RAD;
  const el = Math.asin(Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(ha));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT)) + Math.PI;
  const facing = -Math.cos(az);
  if (el <= 0 || facing <= 0) return { x: 0, y: 0, a: 0, el };
  let x = Math.sin(az) / Math.cos(az), y = Math.tan(el) / facing;
  const len = Math.hypot(x, y);
  if (len > 2.5) { x *= 2.5 / len; y *= 2.5 / len; }
  return { x, y, a: Math.min(1, el / RAD / 6) * Math.min(1, facing * 5), el };
}

const THEMES = {
  light: {
    ink: "#111111", muted: "#5E5A53", rule: "#D3CDC2", signal: "#FF4F1F", shade: "38,50,72", shadeScale: 1,
    // dawn blush, day neutral, dusk amber, night stone (the site's daypart papers)
    paper: { 0: "#E5E8E9", 5: "#E5E8E9", 6.5: "#F6EEE8", 8: "#F2EFE8", 16.5: "#F2EFE8", 18: "#F3EADB", 19.3: "#E5E8E9", 24: "#E5E8E9" },
  },
  dark: {
    ink: "#ECE7DE", muted: "#9C978E", rule: "#3D444E", signal: "#FF6A3D", shade: "0,0,0", shadeScale: 3.2,
    paper: { 0: "#0D1117", 24: "#0D1117" },
  },
};

for (const [name, t] of Object.entries(THEMES)) {
  const LIFT = 5.5; // ≈ 0.045em of the 122px name, as on the site
  const shadowAt = (hr) => {
    const s = sunAt(hr);
    if (!s.a) return "drop-shadow(0 0 0 rgba(0,0,0,0))";
    const soft = 0.6 + Math.hypot(s.x, s.y) * 0.7;
    return `drop-shadow(${r2(s.x * LIFT)}px ${r2(s.y * LIFT)}px ${r2(soft * LIFT)}px rgba(${t.shade},${r2(Math.min(0.6, 0.13 * s.a * t.shadeScale))}))`;
  };
  const sunFrames = Array.from({ length: 25 }, (_, hr) => `${r2((hr / 24) * 100)}%{filter:${shadowAt(hr)}}`).join("");
  const paperFrames = Object.entries(t.paper).map(([hr, col]) => `${r2((hr / 24) * 100)}%{fill:${col}}`).join("");
  const stillPaper = Object.entries(t.paper).reduce((c, [k, v]) => (+k <= STILL ? v : c), t.paper[0]);

  const TR = MARK / 2 - 46;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI, len = i % 5 === 0 ? 6 : 3;
    return `<line x1="${r2(CX + TR * Math.sin(a))}" y1="${r2(CY - TR * Math.cos(a))}" x2="${r2(CX + (TR - len) * Math.sin(a))}" y2="${r2(CY - (TR - len) * Math.cos(a))}"/>`;
  }).join("");
  const LR = MARK / 2 - 4;
  const hourLabels = HOURS.map(([txt, f]) => {
    const a = f * 2 * Math.PI;
    return `<text x="${r2(CX + LR * Math.sin(a))}" y="${r2(CY - LR * Math.cos(a))}" text-anchor="middle" dominant-baseline="central">${txt}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Muhammed Favas, backend engineer in Dubai. A ring of 24 lobes marks one day in Dubai, traced an hour a second.">
<style>
@font-face{font-family:S;src:url(data:font/woff2;base64,${serifWoff2.toString("base64")}) format("woff2")}
@font-face{font-family:M;src:url(data:font/woff2;base64,${monoWoff2.toString("base64")}) format("woff2")}
.s{font-family:S,Georgia,serif}.m{font-family:M,ui-monospace,monospace}
.paper{animation:paper ${DAY}s linear infinite}
.name{animation:sun ${DAY}s linear infinite}
.day{stroke-dasharray:1;stroke-dashoffset:1;animation:day ${DAY}s linear infinite}
.still{display:none}
@keyframes paper{${paperFrames}}
@keyframes sun{${sunFrames}}
@keyframes day{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion: reduce){
.paper,.name,.day{animation:none}
.paper{fill:${stillPaper}}
.name{filter:${shadowAt(STILL)}}
.day{stroke-dashoffset:${r2(1 - STILL / 24)}}
.moving{display:none}
.still{display:inline}
}
</style>
<rect class="paper" x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.paper[8] ?? t.paper[0]}" stroke="${t.rule}"/>
<text class="m" x="${PAD + 4}" y="${baseline(MONO, 20, 58)}" font-size="20" fill="${t.muted}" letter-spacing="0.5">${esc(KICKER)}</text>
<text class="s name" x="${PAD}" y="${baseline(SERIF, 122, 92, true)}" font-size="122" fill="${t.ink}" letter-spacing="-2">${esc(NAME)}</text>
<text class="m" x="${PAD + 4}" y="${baseline(MONO, 25, 244)}" font-size="25" fill="${t.ink}">${esc(LINE1)}</text>
<text class="m" x="${PAD + 4}" y="${baseline(MONO, 19, 282)}" font-size="19" fill="${t.muted}">${esc(LINE2)}</text>
<g class="m" font-size="13" fill="${t.muted}">${hourLabels}<text x="${W - PAD + 30}" y="${H - 22}" text-anchor="end">${esc(CAPTION)}</text></g>
<g stroke="${t.rule}" stroke-width="1" stroke-linecap="round">${ticks}</g>
<g transform="translate(${ox} ${oy})" fill="none" stroke-linejoin="round">
<path d="${ring}" stroke="${t.rule}" stroke-width="1.4"/>
<path id="ring-${name}" class="day" d="${ring}" pathLength="1" stroke="${t.ink}" stroke-width="1.8"/>
</g>
<g class="moving" transform="translate(${ox} ${oy})"><circle r="6.5" fill="${t.signal}"><animateMotion dur="${DAY}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1" keyTimes="0;1"><mpath href="#ring-${name}"/></animateMotion></circle></g>
<circle class="still" cx="${r2(still.x + ox)}" cy="${r2(still.y + oy)}" r="6.5" fill="${t.signal}"/>
</svg>
`;

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `header-${name}.svg`), svg);
  console.log(`header-${name}.svg ${(svg.length / 1024).toFixed(1)} KB`);
}
console.log(`fonts: serif subset ${(serifWoff2.length / 1024).toFixed(1)} KB, mono subset ${(monoWoff2.length / 1024).toFixed(1)} KB`);
