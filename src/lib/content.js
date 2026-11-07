import fs from 'node:fs';
import path from 'node:path';
import { parseFrontMatter } from './frontmatter.js';
import { renderMarkdown } from './markdown.js';

/**
 * Collections: each folder in content/ is a collection. A new service, case study
 * or article is just a new .md file in the right folder. No template changes needed.
 */
export const COLLECTIONS = {
  pages: { dir: 'content/pages', base: null, required: ['title', 'description', 'url', 'updated'] },
  services: { dir: 'content/services', base: '/services', required: ['title', 'description', 'summary', 'order', 'updated'] },
  industries: { dir: 'content/industries', base: '/industries', required: ['title', 'description', 'summary', 'order', 'updated'] },
  portfolio: { dir: 'content/portfolio', base: '/portfolio', required: ['title', 'description', 'summary', 'updated'] },
  blog: { dir: 'content/blog', base: '/blog', required: ['title', 'description', 'date', 'updated'] },
};

const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 170;

const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function loadCollections({ root, images, includeDrafts, errors, warnings }) {
  const out = {};

  for (const [name, def] of Object.entries(COLLECTIONS)) {
    const dir = path.join(root, def.dir);
    const items = [];
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];

    for (const f of files) {
      const rel = `${def.dir}/${f}`;
      const slug = f.replace(/\.md$/, '');
      let parsed;
      try {
        parsed = parseFrontMatter(fs.readFileSync(path.join(dir, f), 'utf8'), rel);
      } catch (e) {
        errors.push(e.message);
        continue;
      }
      const { data, body } = parsed;

      for (const key of def.required) {
        if (data[key] === undefined || data[key] === '' || (Array.isArray(data[key]) && !data[key].length)) {
          errors.push(`${rel}: required field "${key}" is empty or missing`);
        }
      }
      for (const key of ['updated', 'date']) {
        if (data[key] !== undefined && !isIsoDate(data[key])) errors.push(`${rel}: "${key}" must be YYYY-MM-DD`);
      }

      const draft = data.draft === true;
      if (draft && !includeDrafts) continue;

      const url = def.base === null ? data.url : `${def.base}/${slug}/`;
      if (typeof url !== 'string' || !/^\/([a-z0-9-]+\/)*$/.test(url)) {
        errors.push(`${rel}: url "${url}" must be lowercase latin segments, start and end with "/"`);
      }

      const seoTitle = data.seo_title || data.title;
      if (String(seoTitle).length > TITLE_MAX) warnings.push(`${rel}: title is ${String(seoTitle).length} chars (max ${TITLE_MAX})`);
      const dl = String(data.description || '').length;
      if (dl && (dl < DESC_MIN || dl > DESC_MAX)) warnings.push(`${rel}: description is ${dl} chars (target ${DESC_MIN}-${DESC_MAX})`);

      const md = renderMarkdown(body, { file: rel, images, errors });
      items.push({
        collection: name,
        slug,
        file: rel,
        url,
        draft,
        reviewed: data.reviewed !== false,
        noindex: data.noindex === true || draft,
        data,
        html: md.html,
        headings: md.headings,
        words: md.words,
      });
    }

    items.sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999) || a.slug.localeCompare(b.slug));
    out[name] = items;
  }

  // blog: newest first
  out.blog.sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));

  // duplicate URL guard
  const seen = new Map();
  for (const item of Object.values(out).flat()) {
    if (seen.has(item.url)) errors.push(`${item.file}: URL ${item.url} is already used by ${seen.get(item.url)}`);
    seen.set(item.url, item.file);
  }

  return out;
}
