import { Marked } from 'marked';
import { esc } from './util.js';

const slugify = (text) =>
  text
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

/**
 * Render a Markdown body to HTML.
 * - "#" (h1) is not allowed: the page title is the only h1.
 * - Images must exist in images-src and must have alt text (build fails otherwise).
 * - Returns the HTML, the h2/h3 outline and a word count.
 */
export function renderMarkdown(body, { file, images, errors }) {
  const headings = [];
  const used = new Set();

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }) {
        if (depth === 1) {
          errors.push(`${file}: use "##" or lower in the body; the page title already renders the h1`);
        }
        let id = slugify(text) || `section-${headings.length + 1}`;
        while (used.has(id)) id += '-2';
        used.add(id);
        if (depth <= 3) headings.push({ depth, id, text });
        return `<h${depth} id="${esc(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      paragraph({ tokens }) {
        if (tokens.length === 1 && tokens[0].type === 'image') return this.parser.parseInline(tokens);
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      image({ href, title, text }) {
        try {
          const picture = images.picture(href, text);
          const caption = title ? `<figcaption>${esc(title)}</figcaption>` : '';
          return `<figure class="figure">${picture}${caption}</figure>\n`;
        } catch (e) {
          errors.push(`${file}: ${e.message}`);
          return '';
        }
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const t = title ? ` title="${esc(title)}"` : '';
        const external = /^https?:\/\//i.test(href);
        const rel = external ? ' rel="noopener"' : '';
        return `<a href="${esc(href)}"${t}${rel}>${inner}</a>`;
      },
    },
  });

  const html = marked.parse(body);
  const words = body.split(/\s+/).filter(Boolean).length;
  return { html, headings, words };
}
