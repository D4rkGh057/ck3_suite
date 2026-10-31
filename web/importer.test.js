import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listLanguages, readFromGameDir, readFromFileLists, buildDataset, exportDataset, parseDataset,
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
const VALUES = `ruler_designer_general_skill_value_cost = { if = { limit = { scope:value > 0 } add = 2 multiply = scope:value } }
ruler_designer_prowess_skill_value_cost = { if = { limit = { scope:value > 0 } add = 1 multiply = scope:value } }`;
const DEFINES = 'NRulerDesigner = { IRONMAN_POINT_MAX = 400 DEFAULT_SKILL_VALUE = 5 GENERATED_SONS_MULTIPLIER = 10 GENERATED_DAUGHTERS_MULTIPLIER = 10 AGE_LEVELS = { 10 } AGE_LEVEL_MULTIPLIERS = { 2 3 } }';
const rulesFiles = { valuesFile: file('v.txt', VALUES), definesFile: file('d.txt', DEFINES) };

test('readFromGameDir reads only traits and localization files', async () => {
  const reads = [];
  const game = fakeDir({
    common: {
      traits: { '00_traits.txt': TRAITS, 'x.lookup': 'skip' },
      defines: { '00_defines.txt': DEFINES, 'big.txt': 'x' },
      script_values: { '02_ruler_designer_values.txt': VALUES, 'other.txt': 'skip' },
    },
    localization: { spanish: { 'traits_l_spanish.yml': LOC, 'other_l_spanish.yml': 'skip' }, english: {} },
    gfx: { 'huge.dds': 'x' },
  }, reads);
  assert.deepEqual(await listLanguages(game), ['english', 'spanish']);
  const dataset = await buildDataset(await readFromGameDir(game, 'spanish'));
  assert.deepEqual(reads.sort(), ['00_defines.txt', '00_traits.txt', '02_ruler_designer_values.txt', 'traits_l_spanish.yml']);
  assert.equal(dataset.rules.pointMax, 400);
  assert.equal(dataset.rules.skillCosts.general[0].factor, 2);
  assert.equal(dataset.traits[0].name, 'Valiente');
  assert.equal(dataset.traits[0].cost, 40);
});

test('readFromGameDir explains which folder is missing', async () => {
  await assert.rejects(readFromGameDir(fakeDir({ gfx: {} }), 'spanish'), /common\/traits/);
  const withRules = { traits: {}, defines: { '00_defines.txt': DEFINES }, script_values: { '02_ruler_designer_values.txt': VALUES } };
  await assert.rejects(readFromGameDir(fakeDir({ common: withRules }), 'spanish'), /localization\/spanish/);
  await assert.rejects(readFromGameDir(fakeDir({ common: { traits: {}, defines: {} } }), 'spanish'), /02_ruler_designer_values/);
});

test('readFromFileLists ignores nested folders and unrelated files', async () => {
  const input = readFromFileLists(
    [file('00_traits.txt', TRAITS, 'traits/00_traits.txt'), file('n.txt', 'x', 'traits/sub/n.txt')],
    [file('traits_l_spanish.yml', LOC, 'spanish/traits_l_spanish.yml'), file('a_l_spanish.yml', 'x', 'spanish/a_l_spanish.yml')],
    'spanish',
  );
  assert.equal(input.traitFiles.length, 1);
  assert.equal(input.locFiles.length, 1);
});

test('buildDataset falls back to the id and rejects empty input', async () => {
  const dataset = await buildDataset({ language: 'english', traitFiles: [file('a.txt', TRAITS)], locFiles: [], ...rulesFiles });
  assert.equal(dataset.traits[0].name, 'brave');
  await assert.rejects(buildDataset({ language: 'english', traitFiles: [], locFiles: [], ...rulesFiles }), /No trait files/);
  await assert.rejects(buildDataset({ language: 'english', traitFiles: [file('a.txt', '# empty')], locFiles: [], ...rulesFiles }), /no traits/);
});

test('exported datasets round-trip and foreign JSON is rejected', async () => {
  const dataset = await buildDataset({ language: 'english', traitFiles: [file('a.txt', TRAITS)], locFiles: [], ...rulesFiles });
  assert.deepEqual(parseDataset(exportDataset(dataset)), dataset);
  await assert.rejects(buildDataset({ language: 'english', traitFiles: [file('a.txt', TRAITS)], locFiles: [] }), /script_values/);
  assert.throws(() => parseDataset('{"hello":1}'), /not a dataset/);
});
