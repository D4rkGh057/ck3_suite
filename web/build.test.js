import test from 'node:test';
import assert from 'node:assert/strict';
import { designerTraits, conflictsOf, evaluate, encodeBuild, decodeBuild, MIN_AGE } from './build.js';

const dataset = {
  rules: {
    pointMax: 400, defaultSkill: 5, childCost: { son: 10, daughter: 10 },
    ageLevels: [], ageMultipliers: [2],
    skillCosts: { general: [{ min: null, max: null, factor: 2, subtract: 0, offset: 0 }], prowess: [{ min: null, max: null, factor: 1, subtract: 0, offset: 0 }] },
  },
  traits: [
    { id: 'brave', category: 'personality', cost: 20, opposites: ['craven'], inDesigner: true, names: { en: 'Brave', es: 'Valiente' } },
    { id: 'craven', category: 'personality', cost: -10, opposites: ['brave'], inDesigner: true, names: { en: 'Craven' } },
    { id: 'hidden', category: 'health', cost: 5, opposites: [], inDesigner: false, names: {} },
    { id: 'wounded', category: 'health', cost: -30, opposites: [], inDesigner: true, names: {} },
  ],
};

test('only traits offered by the designer are listed, grouped by category', () => {
  const list = designerTraits(dataset);
  assert.deepEqual(list.map((t) => t.id), ['brave', 'craven', 'wounded']);
});

test('picking a trait blocks its opposites', () => {
  assert.deepEqual([...conflictsOf(dataset, ['brave'])], ['craven']);
  assert.deepEqual([...conflictsOf(dataset, [])], []);
});

test('evaluate sums age, skills, traits and children, and reports what is left', () => {
  // age 20 * 2 = 40; five skills * (5 * 2) = 50; prowess 5 -> 5; brave 20; wounded -30; one son 10
  const r = evaluate(dataset, { age: 20, skills: {}, traits: ['brave', 'wounded'], sons: 1, daughters: 0 });
  assert.equal(r.total, 40 + 50 + 5 + 20 - 30 + 10);
  assert.equal(r.remaining, 400 - r.total);
});

test('unknown trait ids in a build are ignored instead of breaking the total', () => {
  const r = evaluate(dataset, { age: 20, traits: ['gone'] });
  assert.equal(r.total, 95);
});

test('age below the designer minimum is clamped', () => {
  assert.equal(evaluate(dataset, { age: 3 }).total, evaluate(dataset, { age: MIN_AGE }).total);
});

test('share code round-trips and rejects garbage', () => {
  const build = { age: 25, skills: { martial: 12 }, traits: ['brave'], sons: 2, daughters: 1 };
  assert.deepEqual(decodeBuild(encodeBuild(build)), build);
  assert.equal(decodeBuild('%%%not-a-build'), null);
  assert.equal(decodeBuild(''), null);
});
