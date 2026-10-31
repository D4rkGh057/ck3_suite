import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, extractTraits, parseLocalization, resolveReferences } from './paradox.js';

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

test('parseScript keeps comparison operators in the key', () => {
  const [[, body]] = parseScript('t = { v > 4 v < 9 w >= 1 x = 2 y ?= 3 }');
  assert.deepEqual(body, [['v >', '4'], ['v <', '9'], ['w >=', '1'], ['x', '2'], ['y', '3']]);
});

test('extractTraits reads cost, category, level and opposites', () => {
  const traits = extractTraits(`
education_intrigue_2 = { category = education level = 2 ruler_designer_cost = 20 }
lustful = { category = personality opposites = { chaste } ruler_designer_cost = 25 }
intellect_good_3 = { opposites = { dull } ruler_designer_cost = 240 }`);
  assert.equal(traits.length, 3);
  assert.deepEqual(traits[0], {
    id: 'education_intrigue_2', category: 'education', cost: 20,
    group: null, level: 2, opposites: [], flags: [], inDesigner: true,
  });
  assert.deepEqual(traits[1].opposites, ['chaste']);
  assert.equal(traits[2].category, null);
  assert.equal(traits[2].cost, 240);
});

test('extractTraits flags traits the ruler designer does not offer', () => {
  const traits = extractTraits(`
hidden = { shown_in_ruler_designer = no ruler_designer_cost = 10 }
shown = { shown_in_ruler_designer = yes }
default = { category = lifestyle }`);
  assert.deepEqual(traits.map((t) => t.inDesigner), [false, true, true]);
});

test('parseLocalization reads quoted values', () => {
  const loc = parseLocalization('l_spanish:\n trait_brave: "Valiente"\n trait_x:0 "A \\"b\\""');
  assert.equal(loc.trait_brave, 'Valiente');
});

test('resolveReferences replaces $key$ with the referenced text', () => {
  const out = resolveReferences({ a: '$b$', b: '$c$', c: 'Melancólico', plain: 'Valiente' });
  assert.equal(out.a, 'Melancólico');
  assert.equal(out.plain, 'Valiente');
});

test('resolveReferences drops entries whose reference cannot be resolved or loops', () => {
  const out = resolveReferences({ a: '$missing$', x: '$y$', y: '$x$', ok: 'Fine' });
  assert.equal('a' in out, false);
  assert.equal('x' in out, false);
  assert.equal(out.ok, 'Fine');
});

test('resolveReferences keeps text that merely mentions a reference among other words', () => {
  assert.equal(resolveReferences({ a: 'Son of $b$', b: 'Ragnar' }).a, 'Son of Ragnar');
});
