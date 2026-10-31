import test from 'node:test';
import assert from 'node:assert/strict';
import { designerTraits, conflictsOf, evaluate, encodeBuild, decodeBuild, tierGroups, setTier, dropRivals, MIN_AGE } from './build.js';

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

// Real data shape: `opposites` may name a trait id or a whole group, and tiers of one group
// (education_martial_1..5, beauty_good_1..3) exclude each other even when none lists the others.
const tiered = {
  traits: [
    { id: 'beauty_good_1', group: 'beauty_good', level: 1, opposites: ['beauty_bad'] },
    { id: 'beauty_good_2', group: 'beauty_good', level: 2, opposites: ['beauty_bad', 'beauty_good_1'] },
    { id: 'beauty_bad_1', group: 'beauty_bad', level: 1, opposites: ['beauty_good'] },
    { id: 'education_martial_1', group: 'education_martial', level: 1, opposites: [] },
    { id: 'education_martial_3', group: 'education_martial', level: 3, opposites: [] },
    { id: 'shrewd', group: null, level: null, opposites: ['intellect_bad'] },
    { id: 'intellect_bad_1', group: 'intellect_bad', level: 1, opposites: [] },
  ],
};

test('an opposite that names a group blocks every tier of that group', () => {
  assert.deepEqual([...conflictsOf(tiered, ['beauty_good_1'])].sort(), ['beauty_bad_1', 'beauty_good_2']);
});

test('tiers of the same group exclude each other even with no declared opposites', () => {
  assert.deepEqual([...conflictsOf(tiered, ['education_martial_1'])], ['education_martial_3']);
});

test('a conflict declared by only one side still blocks both ways', () => {
  assert.deepEqual([...conflictsOf(tiered, ['intellect_bad_1'])], ['shrewd']);
  assert.deepEqual([...conflictsOf(tiered, ['shrewd'])], ['intellect_bad_1']);
});

test('a selected trait never blocks itself', () => {
  assert.ok(!conflictsOf(tiered, ['beauty_good_1']).has('beauty_good_1'));
});

test('traits sharing a group with levels become one tier group, ordered by level', () => {
  const traits = [
    { id: 'beauty_good_2', group: 'beauty_good', level: 2 },
    { id: 'brave', group: null, level: null },
    { id: 'beauty_good_1', group: 'beauty_good', level: 1 },
    { id: 'lonely', group: 'solo', level: 1 },
  ];
  const { groups, singles } = tierGroups(traits);
  assert.deepEqual(groups.map((g) => [g.group, g.members.map((t) => t.id)]), [['beauty_good', ['beauty_good_1', 'beauty_good_2']]]);
  assert.deepEqual(singles.map((t) => t.id).sort(), ['brave', 'lonely']);
});

test('choosing a tier replaces the other tiers of its group and keeps unrelated traits', () => {
  const members = ['beauty_good_1', 'beauty_good_2', 'beauty_good_3'];
  assert.deepEqual(setTier(['brave', 'beauty_good_1'], members, 'beauty_good_3'), ['brave', 'beauty_good_3']);
  assert.deepEqual(setTier(['brave', 'beauty_good_1'], members, null), ['brave']);
});

test('a character has one education: picking one replaces any other education', () => {
  const ds = { traits: [
    { id: 'education_martial_3', category: 'education' },
    { id: 'education_diplomacy_1', category: 'education' },
    { id: 'brave', category: 'personality' },
  ] };
  assert.deepEqual(dropRivals(ds, ['brave', 'education_martial_3'], 'education_diplomacy_1'), ['brave']);
  assert.deepEqual(dropRivals(ds, ['education_martial_3'], 'brave'), ['education_martial_3']);
});
