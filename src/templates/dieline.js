import { esc } from '../lib/util.js';

/**
 * Straight tuck-end box dieline, drawn with the real convention:
 * solid line = cut, dashed line = fold. Dimensions are in drawing units.
 */
export function dieline({ l = 60, w = 40, h = 80, label, annotated = false, animate = false, idPrefix = 'dl' } = {}) {
  const g = 11; // glue flap width
  const t = w; // tuck flap depth
  const d = w * 0.55; // dust flap depth
  const pad = 14;

  const xg = g;
  const x1 = g + l;
  const x2 = g + l + w;
  const x3 = g + 2 * l + w;
  const x4 = g + 2 * l + 2 * w;
  const y0 = t + 4;
  const y1 = y0 + h;
  const R = (n) => Math.round(n * 100) / 100;

  const cut = [
    `M${xg} ${y0}`,
    // glue flap
    `L0 ${y0 + 8} L0 ${y1 - 8} L${xg} ${y1}`,
    // bottom, left to right
    `L${xg + 3} ${y1 + t} L${x1 - 3} ${y1 + t} L${x1} ${y1}`,
    `L${x1 + 4} ${y1 + d} L${x2 - 4} ${y1 + d} L${x2} ${y1}`,
    `L${x2 + 3} ${y1 + t} L${x3 - 3} ${y1 + t} L${x3} ${y1}`,
    `L${x3 + 4} ${y1 + d} L${x4 - 4} ${y1 + d} L${x4} ${y1}`,
    // right edge up
    `L${x4} ${y0}`,
    // top, right to left
    `L${x4 - 4} ${y0 - d} L${x3 + 4} ${y0 - d} L${x3} ${y0}`,
    `L${x3 - 3} ${y0 - t} L${x2 + 3} ${y0 - t} L${x2} ${y0}`,
    `L${x2 - 4} ${y0 - d} L${x1 + 4} ${y0 - d} L${x1} ${y0}`,
    `L${x1 - 3} ${y0 - t} L${xg + 3} ${y0 - t} L${xg} ${y0}Z`,
  ].join(' ');

  const fold = [
    ...[xg, x1, x2, x3].map((x) => `M${x} ${y0} L${x} ${y1}`),
    `M${xg} ${y0} L${x4} ${y0}`,
    `M${xg} ${y1} L${x4} ${y1}`,
  ].join(' ');

  const vbW = x4 + pad * 2 + (annotated ? 16 : 0);
  const vbH = y1 + t + pad * 2 + (annotated ? 14 : 0);
  const ox = pad;
  const oy = pad;

  const dims = annotated
    ? `
    <g class="dl-dim" transform="translate(${ox} ${oy})">
      <path d="M${xg} ${y1 + t + 9} L${x1} ${y1 + t + 9}" /><text x="${R((xg + x1) / 2)}" y="${y1 + t + 19}" text-anchor="middle">طول</text>
      <path d="M${x1} ${y1 + t + 9} L${x2} ${y1 + t + 9}" /><text x="${R((x1 + x2) / 2)}" y="${y1 + t + 19}" text-anchor="middle">عرض</text>
      <path d="M${x4 + 7} ${y0} L${x4 + 7} ${y1}" /><text x="${x4 + 17}" y="${R((y0 + y1) / 2)}" transform="rotate(90 ${x4 + 17} ${R((y0 + y1) / 2)})" text-anchor="middle">ارتفاع</text>
    </g>`
    : '';

  const labelText = label || 'دایلاین جعبه‌ی تاشو؛ خط ممتد برش و خط‌چین تا';
  const title = `${idPrefix}-t`;
  return `<svg class="dieline${animate ? ' dieline--draw' : ''}" viewBox="0 0 ${R(vbW)} ${R(vbH)}" role="img" aria-labelledby="${title}" xmlns="http://www.w3.org/2000/svg">
  <title id="${title}">${esc(labelText)}</title>
  <g transform="translate(${ox} ${oy})">
    <path class="dl-panel" d="${cut}" />
    <path class="dl-fold" d="${fold}" />
    <path class="dl-cut" d="${cut}" pathLength="1" />
  </g>${dims}
</svg>`;
}

/** Legend explaining the line convention. Real information, not decoration. */
export function dielineLegend() {
  return `<ul class="legend" aria-label="راهنمای خطوط نقشه">
  <li><svg width="34" height="8" viewBox="0 0 34 8" aria-hidden="true"><path d="M0 4h34" class="dl-cut" stroke-width="2.4"/></svg>خط برش</li>
  <li><svg width="34" height="8" viewBox="0 0 34 8" aria-hidden="true"><path d="M0 4h34" class="dl-fold" stroke-width="2.4"/></svg>خط تا</li>
</ul>`;
}
