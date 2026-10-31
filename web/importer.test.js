import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFromGameDir, readFromFileLists, buildDataset, exportDataset, parseDataset, traitName,
} from './importer.js';

const file = (name, text, path = name) => ({ name, webkitRelativePath: path, text: async () => text });

// Minimal fake of FileSystemDirectoryHandle. `reads` records every file actually opened.
function fakeDir(tree, reads = []) {
  return {
    kind: 'directory',
    async getDirectoryHandle(name) {
      if (tree[name] && !(tree[name] instanceof Function) && typeof tree[name] === 'object') return fakeDir(tree[name], reads);
      throw new Error('NotFoundError');
    },
    async getFileHandle(name) {
      if (typeof tree[name] !== 'string') throw new Error('NotFoundError');
      return { kind: 'file', getFile: async () => { reads.push(name); return file(name, tree[name]); } };
    },
    async *entries() {
      for (const [name, value] of Object.entries(tree)) {
        yield typeof value === 'string'
          ? [name, { kind: 'file', getFile: async () => { reads.push(name); return file(name, value); } }]
          : [name, fakeDir(value, reads)];
      }
    },
  };
}

const TRAITS = 'brave = { category = personality ruler_designer_cost = 40 opposites = { craven } }';
const LOC = 'l_spanish:\n trait_brave: "Valiente"';
const LOC_EN = 'l_english:\n trait_brave: "Brave"';
const VALUES = `ruler_designer_general_skill_value_cost = { if = { limit = { scope:value > 0 } add = 2 multiply = scope:value } }
ruler_designer_prowess_skill_value_cost = { if = { limit = { scope:value > 0 } add = 1 multiply = scope:value } }`;
const DEFINES = 'NRulerDesigner = { IRONMAN_POINT_MAX = 400 DEFAULT_SKILL_VALUE = 5 GENERATED_SONS_MULTIPLIER = 10 GENERATED_DAUGHTERS_MULTIPLIER = 10 AGE_LEVELS = { 10 } AGE_LEVEL_MULTIPLIERS = { 2 3 } }';
const locBoth = { en: [file('traits_l_english.yml', LOC_EN)], es: [file('traits_l_spanish.yml', LOC)] };
const rulesFiles = { valuesFile: file('v.txt', VALUES), definesFile: file('d.txt', DEFINES) };

test('readFromGameDir reads only traits and localization files', async () => {
  const reads = [];
  const game = fakeDir({
    common: {
      traits: { '00_traits.txt': TRAITS, 'x.lookup': 'skip' },
      defines: { '00_defines.txt': DEFINES, 'big.txt': 'x' },
      script_values: { '02_ruler_designer_values.txt': VALUES, 'other.txt': 'skip' },
    },
    localization: {
      spanish: { 'traits_l_spanish.yml': LOC, 'other_l_spanish.yml': 'skip' },
      english: { 'traits_l_english.yml': LOC_EN },
      french: { 'traits_l_french.yml': 'skip' },
    },
    gfx: { 'huge.dds': 'x' },
  }, reads);
  const dataset = await buildDataset(await readFromGameDir(game));
  assert.deepEqual(reads.sort(), ['00_defines.txt', '00_traits.txt', '02_ruler_designer_values.txt', 'traits_l_english.yml', 'traits_l_spanish.yml']);
  assert.deepEqual(dataset.languages.sort(), ['en', 'es']);
  assert.equal(dataset.rules.pointMax, 400);
  assert.equal(dataset.rules.skillCosts.general[0].factor, 2);
  assert.deepEqual(dataset.traits[0].names, { en: 'Brave', es: 'Valiente' });
  assert.equal(dataset.traits[0].cost, 40);
});

test('readFromGameDir explains which folder is missing', async () => {
  await assert.rejects(readFromGameDir(fakeDir({ gfx: {} })), /common\/traits/);
  const withRules = { traits: {}, defines: { '00_defines.txt': DEFINES }, script_values: { '02_ruler_designer_values.txt': VALUES } };
  await assert.rejects(readFromGameDir(fakeDir({ common: withRules })), /localization\/english/);
  await assert.rejects(readFromGameDir(fakeDir({ common: { traits: {}, defines: {} } })), /02_ruler_designer_values/);
});

test('readFromFileLists ignores nested folders and unrelated files', async () => {
  const input = readFromFileLists(
    [file('00_traits.txt', TRAITS, 'traits/00_traits.txt'), file('n.txt', 'x', 'traits/sub/n.txt')],
    {
      es: [file('traits_l_spanish.yml', LOC, 'spanish/traits_l_spanish.yml'), file('a_l_spanish.yml', 'x', 'spanish/a_l_spanish.yml')],
      en: [],
    },
  );
  assert.equal(input.traitFiles.length, 1);
  assert.deepEqual(Object.keys(input.locByLang), ['es']);
  assert.equal(input.locByLang.es.length, 1);
});

test('trait names follow the requested language with fallbacks', async () => {
  const only = await buildDataset({ traitFiles: [file('a.txt', TRAITS)], locByLang: { en: locBoth.en }, ...rulesFiles });
  assert.equal(traitName(only.traits[0], 'en'), 'Brave');
  assert.equal(traitName(only.traits[0], 'es'), 'Brave'); // Spanish missing: falls back to English
  const both = await buildDataset({ traitFiles: [file('a.txt', TRAITS)], locByLang: locBoth, ...rulesFiles });
  assert.equal(traitName(both.traits[0], 'es'), 'Valiente');
  assert.equal(traitName({ id: 'x', names: {} }, 'es'), 'x'); // nothing localized: shows the id
});

test('buildDataset rejects empty input', async () => {
  await assert.rejects(buildDataset({ traitFiles: [], locByLang: locBoth, ...rulesFiles }), /No trait files/);
  await assert.rejects(buildDataset({ traitFiles: [file('a.txt', '# empty')], locByLang: locBoth, ...rulesFiles }), /no traits/);
  await assert.rejects(buildDataset({ traitFiles: [file('a.txt', TRAITS)], locByLang: {}, ...rulesFiles }), /localization folder/);
});

test('exported datasets round-trip and foreign JSON is rejected', async () => {
  const dataset = await buildDataset({ traitFiles: [file('a.txt', TRAITS)], locByLang: locBoth, ...rulesFiles });
  assert.deepEqual(parseDataset(exportDataset(dataset)), dataset);
  await assert.rejects(buildDataset({ traitFiles: [file('a.txt', TRAITS)], locByLang: locBoth }), /script_values/);
  assert.throws(() => parseDataset('{"hello":1}'), /not a dataset/);
});
