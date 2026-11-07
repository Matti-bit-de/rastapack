// Automated checks on dist/. Run: npm run build && npm test
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { checkSite, urlForFile, resolveSitePath } from '../src/lib/check.js';
import { walk } from '../src/lib/util.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(root, 'site.json'), 'utf8'));
const redirects = JSON.parse(fs.readFileSync(path.join(root, 'redirects.json'), 'utf8')).filter((r) => r.enabled !== false);

assert.ok(fs.existsSync(dist), 'dist/ is missing. Run "npm run build" first.');

const htmlFiles = walk(dist, (f) => f.endsWith('.html'));
const pages = htmlFiles.map((file) => ({ file, url: urlForFile(dist, file), root: parse(fs.readFileSync(file, 'utf8')) }));
const sitemapXml = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

test('1. every page has one correct, unique canonical (404 has none)', () => {
  const seen = new Set();
  for (const p of pages) {
    const c = p.root.querySelectorAll('link[rel="canonical"]');
    if (p.url === '/404.html') {
      assert.equal(c.length, 0, '404 must not have a canonical');
      continue;
    }
    assert.equal(c.length, 1, `${p.url}: need exactly one canonical`);
    const href = c[0].getAttribute('href');
    assert.equal(href, `${site.url}${p.url}`, `${p.url}: wrong canonical`);
    assert.ok(!seen.has(href), `${p.url}: duplicate canonical`);
    seen.add(href);
  }
});

test('2. sitemap holds exactly the indexable pages: no drafts, no 404, no noindex', () => {
  const indexable = pages
    .filter((p) => p.url !== '/404.html')
    .filter((p) => !/noindex/i.test(p.root.querySelector('meta[name="robots"]')?.getAttribute('content') || ''))
    .map((p) => `${site.url}${p.url}`)
    .sort();
  assert.deepEqual([...sitemapUrls].sort(), indexable);
  assert.ok(!sitemapUrls.some((u) => /draft|404/.test(u)), 'draft or 404 URL in sitemap');
  for (const p of pages) {
    const robots = p.root.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    if (p.url === '/404.html') assert.match(robots, /noindex/, '404 should be noindex');
  }
  assert.ok(!fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8').includes('Disallow: /\n'), 'robots.txt blocks the whole site');
  assert.match(fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/rastapack\.ir\/sitemap\.xml/);
});

test('3. every image has width, height, alt and an optimized AVIF/WebP source', () => {
  for (const p of pages) {
    for (const img of p.root.querySelectorAll('img')) {
      assert.ok(img.hasAttribute('alt'), `${p.url}: img without alt`);
      assert.ok(Number(img.getAttribute('width')) > 0 && Number(img.getAttribute('height')) > 0, `${p.url}: img without size`);
      const picture = img.parentNode;
      assert.equal(picture.tagName?.toLowerCase(), 'picture', `${p.url}: img outside <picture>`);
      const types = picture.querySelectorAll('source').map((s) => s.getAttribute('type'));
      assert.ok(types.includes('image/avif') && types.includes('image/webp'), `${p.url}: missing avif/webp`);
    }
  }
});

test('4. no broken internal links, assets or anchors', () => {
  const { errors } = checkSite({ dist, siteUrl: site.url });
  assert.deepEqual(errors, []);
});

test('5. 404 page exists and redirects are valid, non-chained 301s', () => {
  assert.ok(fs.existsSync(path.join(dist, '404.html')), '404.html missing');
  const ht = fs.readFileSync(path.join(dist, '.htaccess'), 'utf8');
  assert.match(ht, /ErrorDocument 404 \/404\.html/);
  assert.match(ht, /R=301/, 'HTTPS/host redirect missing');
  const from = new Set(redirects.map((r) => r.from));
  for (const r of redirects) {
    assert.ok(resolveSitePath(dist, r.to), `redirect target ${r.to} does not exist`);
    assert.ok(!from.has(r.to), `redirect chain at ${r.to}`);
    assert.ok(!resolveSitePath(dist, r.from), `redirect source ${r.from} is a live page`);
  }
});

test('6. Schema is valid JSON and only contains confirmed company data', () => {
  let orgCount = 0;
  for (const p of pages) {
    for (const s of p.root.querySelectorAll('script[type="application/ld+json"]')) {
      const data = JSON.parse(s.text);
      if (data['@type'] === 'Organization') {
        orgCount++;
        assert.equal(data.name, site.name);
        assert.deepEqual(data.telephone, [site.phone.tel, site.mobile.tel]);
        assert.equal(data.address.streetAddress, site.address.street);
        assert.equal(data.address.addressLocality, site.address.locality);
        // fields without confirmed data must be absent, not empty or invented
        assert.ok(!('email' in data), 'email was not provided, so it must not be in Schema');
        assert.ok(!('sameAs' in data), 'no social profiles were provided');
        assert.ok(!('foundingDate' in data) && !('openingHours' in data) && !('geo' in data));
      }
      assert.ok(!JSON.stringify(data).includes('""'), `${p.url}: empty string inside Schema`);
    }
  }
  assert.equal(orgCount, 1, 'Organization Schema should appear once (home page)');
  const home = pages.find((p) => p.url === '/');
  assert.ok(home.root.querySelectorAll('script[type="application/ld+json"]').length >= 2);
  const inner = pages.find((p) => p.url === '/services/structural-design/');
  assert.ok(inner.root.querySelector('script[type="application/ld+json"]').text.includes('BreadcrumbList'));
});

test('7. on-page basics: title, description, one h1, lang/dir, viewport', () => {
  for (const p of pages) {
    const html = p.root.querySelector('html');
    assert.equal(html.getAttribute('lang'), 'fa');
    assert.equal(html.getAttribute('dir'), 'rtl');
    assert.ok(p.root.querySelector('meta[name="viewport"]'));
    assert.equal(p.root.querySelectorAll('h1').length, 1, `${p.url}: h1 count`);
    const title = p.root.querySelector('title').text.trim();
    assert.ok(title.length > 10 && title.length <= 65, `${p.url}: title length ${title.length}`);
    const desc = p.root.querySelector('meta[name="description"]').getAttribute('content');
    assert.ok(desc.length >= 70 && desc.length <= 170, `${p.url}: description length ${desc.length}`);
  }
  const titles = pages.map((p) => p.root.querySelector('title').text.trim());
  assert.equal(new Set(titles).size, titles.length, 'duplicate <title>');
  const descs = pages.map((p) => p.root.querySelector('meta[name="description"]').getAttribute('content'));
  assert.equal(new Set(descs).size, descs.length, 'duplicate meta description');
});

test('8. unfinished pages are not published', () => {
  const urls = pages.map((p) => p.url);
  assert.ok(!urls.some((u) => /draft/.test(u)), 'a draft page was built');
  const nav = pages.find((p) => p.url === '/').root.querySelectorAll('.site-nav a').map((a) => a.getAttribute('href'));
  assert.ok(!nav.includes('/portfolio/') && !nav.includes('/blog/'), 'empty sections must not appear in the menu');
});

test('9. no placeholder text and no unconfirmed contact data on the site', () => {
  for (const p of pages) {
    const text = fs.readFileSync(p.file, 'utf8');
    assert.ok(!/lorem|TODO|example\.com|xxx/i.test(text), `${p.url}: placeholder text`);
    assert.ok(!/@/.test(p.root.querySelector('main').text), `${p.url}: unexpected e-mail in content`);
  }
});

test('10. weight: CSS and JS are small, hashed, and the font is preloaded', () => {
  const css = walk(path.join(dist, 'assets/css')).map((f) => fs.statSync(f).size);
  const js = walk(path.join(dist, 'assets/js')).map((f) => fs.statSync(f).size);
  assert.ok(css[0] < 20000, `CSS is ${css[0]} bytes`);
  assert.ok(js[0] < 2000, `JS is ${js[0]} bytes`);
  for (const f of walk(path.join(dist, 'assets'), (f) => /\.(css|js)$/.test(f))) assert.match(f, /\.[0-9a-f]{10}\.(css|js)$/);
  const home = pages.find((p) => p.url === '/').root;
  assert.ok(home.querySelector('link[rel="preload"][as="font"][crossorigin]'));
  assert.equal(home.querySelectorAll('script[src]').every((s) => s.hasAttribute('defer')), true, 'scripts must be deferred');
});
