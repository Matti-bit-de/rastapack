import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { esc } from './util.js';

const WIDTHS = [480, 960, 1600];
const FALLBACK_WIDTH = 960;
const DEFAULT_SIZES = '(min-width: 64rem) 64rem, 100vw';

const isFresh = (out, input) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(input).mtimeMs;

/**
 * Create optimized WebP/AVIF variants (and a 1200x630 social image) for every
 * PNG/JPG in srcDir. Variants are cached in cacheDir and copied to outDir/img.
 */
export async function processImages({ srcDir, cacheDir, outDir }) {
  const registry = new Map();
  const files = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter((f) => /\.(png|jpe?g)$/i.test(f)) : [];
  fs.mkdirSync(cacheDir, { recursive: true });

  for (const file of files) {
    const input = path.join(srcDir, file);
    const base = path.parse(file).name;
    const meta = await sharp(input).metadata();

    const set = new Set(WIDTHS.filter((w) => w <= meta.width));
    if (meta.width <= WIDTHS.at(-1)) set.add(meta.width);
    const widths = [...set].sort((a, b) => a - b);

    for (const w of widths) {
      const webp = path.join(cacheDir, `${base}-${w}.webp`);
      const avif = path.join(cacheDir, `${base}-${w}.avif`);
      if (!isFresh(webp, input)) await sharp(input).resize({ width: w }).webp({ quality: 78 }).toFile(webp);
      if (!isFresh(avif, input)) await sharp(input).resize({ width: w }).avif({ quality: 50, effort: 4 }).toFile(avif);
    }
    const og = path.join(cacheDir, `${base}-og.jpg`);
    if (!isFresh(og, input)) {
      await sharp(input).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(og);
    }

    registry.set(file, { file, base, width: meta.width, height: meta.height, widths });
  }

  if (files.length) {
    fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
    for (const f of fs.readdirSync(cacheDir)) {
      const base = f.replace(/-(\d+|og)\.(webp|avif|jpg)$/, '');
      if (files.some((s) => path.parse(s).name === base)) {
        fs.copyFileSync(path.join(cacheDir, f), path.join(outDir, 'img', f));
      }
    }
  }

  return imageApi(registry);
}

function imageApi(registry) {
  const get = (name) => {
    const img = registry.get(name);
    if (!img) throw new Error(`image "${name}" was not found in images-src/`);
    return img;
  };

  return {
    has: (name) => registry.has(name),
    og(name) {
      const img = get(name);
      return { path: `/img/${img.base}-og.jpg`, width: 1200, height: 630 };
    },
    /** A <picture> with AVIF + WebP sources, explicit width/height and mandatory alt text. */
    picture(name, alt, { eager = false, sizes = DEFAULT_SIZES, className = '', decorative = false } = {}) {
      const img = get(name);
      if (!decorative && (!alt || !String(alt).trim())) throw new Error(`image "${name}" needs alt text`);
      if (decorative) alt = '';

      const fallbackW = img.widths.reduce((best, w) =>
        Math.abs(w - FALLBACK_WIDTH) < Math.abs(best - FALLBACK_WIDTH) ? w : best,
      );
      const height = Math.round((img.height * fallbackW) / img.width);
      const srcset = (ext) => img.widths.map((w) => `/img/${img.base}-${w}.${ext} ${w}w`).join(', ');
      const loading = eager ? 'eager' : 'lazy';
      const priority = eager ? ' fetchpriority="high"' : '';
      const cls = className ? ` class="${esc(className)}"` : '';

      return (
        `<picture>` +
        `<source type="image/avif" srcset="${srcset('avif')}" sizes="${esc(sizes)}">` +
        `<source type="image/webp" srcset="${srcset('webp')}" sizes="${esc(sizes)}">` +
        `<img${cls} src="/img/${img.base}-${fallbackW}.webp" width="${fallbackW}" height="${height}" ` +
        `alt="${esc(alt)}" loading="${loading}" decoding="async"${priority}>` +
        `</picture>`
      );
    },
  };
}
