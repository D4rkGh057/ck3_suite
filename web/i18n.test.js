import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { messages, translate, detectLang, describeError, CodedError } from './i18n.js';

test('both languages define exactly the same keys', () => {
  assert.deepEqual(Object.keys(messages.es).sort(), Object.keys(messages.en).sort());
});

test('placeholders match between languages', () => {
  const holes = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(messages.en)) {
    assert.deepEqual(holes(messages.es[key]), holes(messages.en[key]), key);
  }
});

test('every key used by the page or thrown as an error exists', () => {
  const sources = ['index.html', 'importer.js', 'designer.js'].map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
  const used = new Set();
  for (const m of sources.matchAll(/data-i18n(?:-html|-aria)?="([\w.]+)"/g)) used.add(m[1]);
  for (const m of sources.matchAll(/new CodedError\('(\w+)'/g)) used.add(`err.${m[1]}`);
  for (const m of sources.matchAll(/\bt\('([\w.]+)'/g)) used.add(m[1]);
  assert.ok(used.size > 20);
  for (const key of used) assert.ok(key in messages.en, `missing key: ${key}`);
});

test('translate fills placeholders and falls back to English, then to the key', () => {
  assert.equal(translate('es', 'status.done', { count: 306 }), 'Listo: 306 rasgos.');
  assert.equal(translate('fr', 'status.done', { count: 1 }), 'Done: 1 traits.');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
});

test('language is saved choice, else browser language, else English', () => {
  assert.equal(detectLang('es', 'en-US'), 'es');
  assert.equal(detectLang(null, 'es-AR'), 'es');
  assert.equal(detectLang('xx', 'de'), 'en');
});

test('coded errors are translated, plain errors keep their message', () => {
  const err = new CodedError('missingValuesFile', { file: '02.txt' }, 'English text');
  assert.equal(describeError('es', err), 'No se encontró el archivo "common/script_values/02.txt".');
  assert.equal(describeError('en', new Error('boom')), 'boom');
});
