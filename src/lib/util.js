import fs from 'node:fs';
import path from 'node:path';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const faDate = (iso) =>
  new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const faNumber = (n) => Number(n).toLocaleString('fa-IR');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function walk(dir, filter = () => true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

export class BuildError extends Error {
  constructor(errors) {
    super(`Build failed with ${errors.length} problem(s):\n - ${errors.join('\n - ')}`);
    this.errors = errors;
  }
}

/** Escape JSON for safe embedding inside a <script type="application/ld+json"> tag. */
const LS = new RegExp(String.fromCharCode(0x2028), 'g');
const PS = new RegExp(String.fromCharCode(0x2029), 'g');
export const jsonForScript = (obj) =>
  JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029');
