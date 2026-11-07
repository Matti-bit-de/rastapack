// Small front matter parser (a safe YAML subset): scalars, inline lists, block lists.

function unquote(v) {
  const m = v.match(/^(["'])(.*)\1$/s);
  return m ? m[2] : v;
}

function scalar(v) {
  v = v.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  return unquote(v);
}

function value(v) {
  v = v.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((x) => scalar(x)) : [];
  }
  return scalar(v);
}

export function parseFrontMatter(text, file = 'file') {
  const m = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: front matter block (---) is missing`);

  const data = {};
  let key = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;

    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(scalar(item[1]));
      continue;
    }
    const kv = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) throw new Error(`${file}: cannot parse front matter line: "${raw}"`);
    key = kv[1];
    data[key] = kv[2] === '' ? [] : value(kv[2]);
  }
  return { data, body: m[2] };
}
