import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readJson, writeFile, BuildError } from './lib/util.js';
import { processImages } from './lib/images.js';
import { brandAssets } from './lib/brand.js';
import { loadCollections } from './lib/content.js';
import { renderPage } from './templates/pages.js';
import { checkSite } from './lib/check.js';
import { sitemap, robots, htaccess } from './lib/server-files.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const includeDrafts = process.argv.includes('--drafts');
// --noindex: temporary public preview (e.g. a free host). Built into dist-temp so the real dist/ is never touched.
const noindexAll = process.argv.includes('--noindex');
const preview = includeDrafts || noindexAll;
const dist = path.join(root, noindexAll ? 'dist-temp' : 'dist');

const errors = [];
const warnings = [];

const hashOf = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const minifyCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();

async function main() {
  const t0 = Date.now();
  const site = readJson(path.join(root, 'site.json'));
  const redirects = readJson(path.join(root, 'redirects.json')).filter((r) => r.enabled !== false);

  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  // ---- assets
  const images = await processImages({
    srcDir: path.join(root, 'images-src'),
    cacheDir: path.join(root, '.cache/images'),
    outDir: dist,
  });
  const defaultOg = await brandAssets({ root, dist });

  const css = minifyCss(fs.readFileSync(path.join(root, 'assets/css/main.css'), 'utf8'));
  const js = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
  const assets = {
    css: `/assets/css/main.${hashOf(css)}.css`,
    js: `/assets/js/main.${hashOf(js)}.js`,
    font: '/assets/fonts/vazirmatn-var.woff2',
  };
  writeFile(path.join(dist, assets.css), css);
  writeFile(path.join(dist, assets.js), js);
  fs.mkdirSync(path.join(dist, 'assets/fonts'), { recursive: true });
  fs.copyFileSync(path.join(root, 'assets/fonts/vazirmatn-var.woff2'), path.join(dist, assets.font));

  // ---- content
  const collections = loadCollections({ root, images, includeDrafts, errors, warnings });

  // pages that depend on another collection having published content (e.g. the blog index)
  const pages = [];
  for (const [name, items] of Object.entries(collections)) {
    for (const item of items) {
      const req = item.data.requires;
      if (req && !(collections[req]?.length > 0)) continue;
      item.template = String(item.data.template || (name === 'blog' ? 'blog-post' : 'page'));
      if (item.template === '404') item.url = '/404.html';
      if (preview) item.noindex = true;
      pages.push(item);
    }
  }
  // collections as seen by templates only include pages that will be built
  const built = new Set(pages);
  for (const k of Object.keys(collections)) collections[k] = collections[k].filter((p) => built.has(p));

  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const navItems = site.nav.filter((n) => byUrl.has(n.url));
  const ctx = { site, assets, images, collections, byUrl, navItems, defaultOg };

  // internal "related" references must point to real pages
  for (const p of pages) {
    for (const u of p.data.related || []) {
      if (!byUrl.has(u)) errors.push(`${p.file}: related URL ${u} does not exist`);
    }
  }
  // redirects must land on real pages and never chain
  const fromSet = new Set(redirects.map((r) => r.from));
  for (const r of redirects) {
    if (!byUrl.has(r.to)) errors.push(`redirects.json: target ${r.to} (from ${r.from}) is not a built page`);
    if (fromSet.has(r.to)) errors.push(`redirects.json: ${r.from} → ${r.to} would chain into another redirect`);
    if (byUrl.has(r.from)) errors.push(`redirects.json: ${r.from} is a live page; remove the redirect or the page`);
  }
  if (errors.length) throw new BuildError(errors);

  // ---- render
  for (const page of pages) {
    const html = renderPage(ctx, page);
    const out = page.url === '/404.html' ? path.join(dist, '404.html') : path.join(dist, page.url, 'index.html');
    writeFile(out, html);
  }

  // ---- server files
  const indexable = pages.filter((p) => !p.noindex && p.template !== '404');
  writeFile(path.join(dist, 'robots.txt'), robots(site, { preview }));
  if (preview) {
    writeFile(path.join(dist, 'sitemap.xml'), sitemap(site, []));
  } else {
    writeFile(path.join(dist, 'sitemap.xml'), sitemap(site, indexable));
  }
  if (noindexAll) {
    // Netlify reads _headers (and ignores vercel.json); this blocks indexing even for non-HTML files. .htaccess is Apache-only, so it is skipped here.
    writeFile(path.join(dist, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
    // Vercel reads vercel.json: same noindex header, and /services → /services/ to match the canonical URLs.
    writeFile(
      path.join(dist, 'vercel.json'),
      JSON.stringify(
        {
          trailingSlash: true,
          headers: [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }],
        },
        null,
        2,
      ) + '\n',
    );
  } else {
    writeFile(path.join(dist, '.htaccess'), htaccess(site, redirects));
  }

  // ---- verification: a broken link or a missing canonical fails the build
  const result = checkSite({ dist, siteUrl: site.url });
  errors.push(...result.errors);
  warnings.push(...result.warnings);

  const unreviewed = pages.filter((p) => p.reviewed === false);
  if (unreviewed.length) {
    const msg = `${unreviewed.length} page(s) need subject-matter review before publishing: ${unreviewed.map((p) => p.url).join(', ')}`;
    // --strict (npm run release): an unreviewed page blocks the release. Without it this is only a warning.
    if (process.argv.includes('--strict')) errors.push(`${msg}. Set "reviewed: true" after a specialist approves, or "draft: true" to hold the page back.`);
    else warnings.push(msg);
  }

  console.log(`Built ${pages.length} pages (${indexable.length} in sitemap) in ${Date.now() - t0} ms${preview ? ` [PREVIEW → ${path.basename(dist)}: noindex everywhere${includeDrafts ? ', drafts included' : ''}]` : ''}`);
  for (const w of warnings) console.warn(`  warning: ${w}`);
  if (errors.length) {
    // A failed release must not leave a publishable-looking dist/ behind.
    if (process.argv.includes('--strict')) fs.rmSync(dist, { recursive: true, force: true });
    throw new BuildError(errors);
  }
}

main().catch((e) => {
  console.error(e instanceof BuildError ? e.message : e);
  process.exit(1);
});
