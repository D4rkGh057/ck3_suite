import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, extractTraits, parseLocalization } from './paradox.js';

test('parseScript keeps repeated keys, comments and bare values', () => {
  const tree = parseScript(`﻿# comment
@x = 30
t = { flag = a # trailing
  flag = b
  opposites = { chaste lustful } }`);
  assert.deepEqual(tree[0], ['@x', '30']);
  const body = tree[1][1];
  assert.deepEqual(body.filter(([k]) => k === 'flag').map(([, v]) => v), ['a', 'b']);
  assert.deepEqual(body.find(([k]) => k === 'opposites')[1], [[null, 'chaste'], [null, 'lustful']]);
});

test('extractTraits reads cost, category, level and opposites', () => {
  const traits = extractTraits(`
education_intrigue_2 = { category = education level = 2 ruler_designer_cost = 20 }
lustful = { category = personality opposites = { chaste } ruler_designer_cost = 25 }
intellect_good_3 = { opposites = { dull } ruler_designer_cost = 240 }`);
  assert.equal(traits.length, 3);
  assert.deepEqual(traits[0], {
    id: 'education_intrigue_2', category: 'education', cost: 20,
    group: null, level: 2, opposites: [], flags: [],
  });
  assert.deepEqual(traits[1].opposites, ['chaste']);
  assert.equal(traits[2].category, null);
  assert.equal(traits[2].cost, 240);
});

test('parseLocalization reads quoted values', () => {
  const loc = parseLocalization('l_spanish:\n trait_brave: "Valiente"\n trait_x:0 "A \\"b\\""');
  assert.equal(loc.trait_brave, 'Valiente');
});
