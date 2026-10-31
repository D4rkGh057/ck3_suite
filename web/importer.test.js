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

test('readFromGameDir reads only traits and localization files', async () => {
  const reads = [];
  const game = fakeDir({
    common: { traits: { '00_traits.txt': TRAITS, 'x.lookup': 'skip' }, defines: { 'big.txt': 'x' } },
    localization: { spanish: { 'traits_l_spanish.yml': LOC, 'other_l_spanish.yml': 'skip' }, english: {} },
    gfx: { 'huge.dds': 'x' },
  }, reads);
  assert.deepEqual(await listLanguages(game), ['english', 'spanish']);
  const dataset = await buildDataset(await readFromGameDir(game, 'spanish'));
  assert.deepEqual(reads.sort(), ['00_traits.txt', 'traits_l_spanish.yml']);
  assert.equal(dataset.traits[0].name, 'Valiente');
  assert.equal(dataset.traits[0].cost, 40);
});

test('readFromGameDir explains which folder is missing', async () => {
  await assert.rejects(readFromGameDir(fakeDir({ gfx: {} }), 'spanish'), /common\/traits/);
  await assert.rejects(readFromGameDir(fakeDir({ common: { traits: {} } }), 'spanish'), /localization\/spanish/);
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
  const dataset = await buildDataset({ language: 'english', traitFiles: [file('a.txt', TRAITS)], locFiles: [] });
  assert.equal(dataset.traits[0].name, 'brave');
  await assert.rejects(buildDataset({ language: 'english', traitFiles: [], locFiles: [] }), /No trait files/);
  await assert.rejects(buildDataset({ language: 'english', traitFiles: [file('a.txt', '# empty')], locFiles: [] }), /no traits/);
});

test('exported datasets round-trip and foreign JSON is rejected', async () => {
  const dataset = await buildDataset({ language: 'english', traitFiles: [file('a.txt', TRAITS)], locFiles: [] });
  assert.deepEqual(parseDataset(exportDataset(dataset)), dataset);
  assert.throws(() => parseDataset('{"hello":1}'), /not a dataset/);
});
