// Parser for Paradox script and localization files. Runs in the browser and in Node.

const OPERATORS = new Set(['=', '?=', '==', '!=', '<', '>', '<=', '>=']);

function tokenize(text) {
  const tokens = [];
  const src = text.replace(/^﻿/, '');
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '{' || c === '}') { tokens.push(c); i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j++;
      tokens.push({ str: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < src.length && !/[\s{}#"]/.test(src[j])) j++;
    // An operator glued to a word (e.g. "a=b") is rare in vanilla files; split it anyway.
    const word = src.slice(i, j);
    const m = word.match(/^(.*?)(\?=|==|!=|<=|>=|=|<|>)(.*)$/);
    if (m && m[1] !== '' && !word.startsWith('@')) {
      tokens.push(m[1], m[2]);
      if (m[3] !== '') tokens.push(m[3]);
    } else {
      tokens.push(word);
    }
    i = j;
  }
  return tokens;
}

const text = (t) => (typeof t === 'string' ? t : t.str);

// Returns a list of [key, value] entries. `value` is a string or a nested entry list.
// Keys repeat (e.g. several `flag = ...`), so a list is used instead of an object.
// Bare values inside a block (e.g. `opposites = { chaste }`) get a null key.
export function parseScript(source) {
  const tokens = tokenize(source);
  let pos = 0;

  function parseBlock(untilClose) {
    const entries = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok === '}') {
        pos++;
        if (untilClose) return entries;
        continue;
      }
      pos++;
      if (tok === '{') {
        entries.push([null, parseBlock(true)]);
        continue;
      }
      if (OPERATORS.has(tokens[pos])) {
        pos++;
        const next = tokens[pos++];
        entries.push([text(tok), next === '{' ? parseBlock(true) : text(next)]);
      } else {
        entries.push([null, text(tok)]);
      }
    }
    return entries;
  }

  return parseBlock(false);
}

const first = (entries, key) => entries.find(([k]) => k === key)?.[1];
const all = (entries, key) => entries.filter(([k]) => k === key).map(([, v]) => v);

// Pulls the fields the calculator needs out of a traits file.
export function extractTraits(source) {
  const traits = [];
  for (const [id, body] of parseScript(source)) {
    if (!id || id.startsWith('@') || !Array.isArray(body)) continue;
    // Congenital traits define no `category`; every top-level block in a traits file is a trait.
    const category = first(body, 'category') ?? null;
    const cost = first(body, 'ruler_designer_cost');
    const opposites = first(body, 'opposites');
    const level = first(body, 'level');
    traits.push({
      id,
      category,
      cost: cost === undefined ? 0 : Number(cost),
      group: first(body, 'group') ?? null,
      level: level === undefined ? null : Number(level),
      opposites: Array.isArray(opposites) ? opposites.map(([, v]) => v) : [],
      flags: all(body, 'flag'),
    });
  }
  return traits;
}

// Parses `key: "value"` lines of a CK3 .yml localization file into a plain object.
export function parseLocalization(source) {
  const out = {};
  for (const line of source.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_.-]+):\d*\s+"(.*)"\s*(?:#.*)?$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
