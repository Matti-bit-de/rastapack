import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { walk } from './util.js';

const htmlCache = new Map();

function load(file) {
  if (!htmlCache.has(file)) htmlCache.set(file, parse(fs.readFileSync(file, 'utf8')));
  return htmlCache.get(file);
}

/** Map a site path ("/services/") to the file that serves it, or null. */
export function resolveSitePath(dist, sitePath) {
  const clean = decodeURI(sitePath.split('#')[0].split('?')[0]);
  const direct = path.join(dist, clean);
  if (clean.endsWith('/')) {
    const idx = path.join(direct, 'index.html');
    return fs.existsSync(idx) ? idx : null;
  }
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  return null;
}

export const urlForFile = (dist, file) => {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
};

/**
 * Structural checks on the built site. Used by the build (fails on any problem)
 * and by the test run.
 */
export function checkSite({ dist, siteUrl }) {
  const errors = [];
  const warnings = [];
  const files = walk(dist, (f) => f.endsWith('.html'));
  const canonicals = new Map();

  for (const file of files) {
    const url = urlForFile(dist, file);
    const root = load(file);
    const is404 = url === '/404.html';
    const tag = (m) => `${url}: ${m}`;

    // --- head
    const title = root.querySelector('title')?.text.trim();
    if (!title) errors.push(tag('missing <title>'));
    const desc = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    if (!desc) errors.push(tag('missing meta description'));

    const canon = root.querySelectorAll('link[rel="canonical"]');
    if (is404) {
      if (canon.length) errors.push(tag('404 page must not declare a canonical'));
    } else if (canon.length !== 1) {
      errors.push(tag(`expected exactly one canonical, found ${canon.length}`));
    } else {
      const href = canon[0].getAttribute('href');
      if (href !== `${siteUrl}${url}`) errors.push(tag(`canonical is "${href}", expected "${siteUrl}${url}"`));
      if (canonicals.has(href)) errors.push(tag(`canonical duplicates ${canonicals.get(href)}`));
      canonicals.set(href, url);
    }

    // --- headings
    const h1s = root.querySelectorAll('h1');
    if (h1s.length !== 1) errors.push(tag(`expected one <h1>, found ${h1s.length}`));
    let last = 1;
    for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const level = Number(h.tagName[1]);
      if (level > last + 1) warnings.push(tag(`heading level jumps from h${last} to h${level} ("${h.text.trim().slice(0, 40)}")`));
      last = level;
    }

    // --- images
    for (const img of root.querySelectorAll('img')) {
      const src = img.getAttribute('src') || '';
      if (!img.hasAttribute('alt')) errors.push(tag(`<img src="${src}"> has no alt attribute`));
      if (!img.getAttribute('width') || !img.getAttribute('height')) errors.push(tag(`<img src="${src}"> has no width/height`));
    }

    // --- internal links and assets
    const refs = [];
    for (const el of root.querySelectorAll('a[href]')) refs.push(['a', el.getAttribute('href')]);
    for (const el of root.querySelectorAll('link[href]')) refs.push(['link', el.getAttribute('href')]);
    for (const el of root.querySelectorAll('script[src]')) refs.push(['script', el.getAttribute('src')]);
    for (const el of root.querySelectorAll('img[src]')) refs.push(['img', el.getAttribute('src')]);
    for (const el of root.querySelectorAll('source[srcset]')) {
      for (const part of el.getAttribute('srcset').split(',')) refs.push(['srcset', part.trim().split(/\s+/)[0]]);
    }

    for (const [kind, href] of refs) {
      if (!href) {
        errors.push(tag(`empty ${kind} reference`));
        continue;
      }
      if (/^(https?:|mailto:|tel:|data:)/i.test(href)) {
        if (/^http:\/\//i.test(href)) warnings.push(tag(`insecure http:// reference: ${href}`));
        if (href.startsWith(siteUrl) && kind === 'a') warnings.push(tag(`internal link written as absolute URL: ${href}`));
        continue;
      }
      if (href.startsWith('#')) {
        if (href.length > 1 && !root.querySelector(`[id="${href.slice(1)}"]`)) errors.push(tag(`broken anchor ${href}`));
        continue;
      }
      if (!href.startsWith('/')) {
        errors.push(tag(`relative ${kind} reference "${href}": use root-absolute paths`));
        continue;
      }
      const target = resolveSitePath(dist, href);
      if (!target) {
        errors.push(tag(`broken ${kind} reference: ${href}`));
        continue;
      }
      const hash = href.split('#')[1];
      if (hash && target.endsWith('.html') && !load(target).querySelector(`[id="${decodeURIComponent(hash)}"]`)) {
        errors.push(tag(`broken anchor ${href}`));
      }
    }
  }
  return { errors, warnings, files };
}
