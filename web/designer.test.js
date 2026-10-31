import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { parseSkillCosts, skillCost, parseDesignerDefines, ageCost, totalPoints } from './designer.js';

const SAMPLE = `
ruler_designer_general_skill_value_cost = {
  value = 0
  if = { limit = { scope:value > 0 scope:value < 5 } add = 2 multiply = scope:value }
  else_if = { limit = { scope:value > 4 scope:value < 9 } add = 4 multiply = { value = scope:value subtract = 4 } add = 8 }
  else_if = { limit = { scope:value > 16 } add = 17 multiply = { value = scope:value subtract = 16 } add = 96 }
}
ruler_designer_prowess_skill_value_cost = {
  value = 0
  if = { limit = { scope:value > 0 scope:value < 5 } add = 1 multiply = scope:value }
  else_if = { limit = { scope:value > 4 scope:value < 9 } add = 2 multiply = { value = scope:value subtract = 4 } add = 4 }
}`;

test('skill costs follow the tiers of the script value', () => {
  const { general, prowess } = parseSkillCosts(SAMPLE);
  assert.equal(skillCost(general, 0), 0);
  assert.equal(skillCost(general, 4), 8);
  assert.equal(skillCost(general, 5), 12);
  assert.equal(skillCost(general, 30), 334);
  assert.equal(skillCost(prowess, 5), 6);
  const viaJson = JSON.parse(JSON.stringify(general)); // saved datasets go through JSON
  assert.equal(skillCost(viaJson, 30), 334);
  assert.equal(skillCost(viaJson, 3), 6);
});

test('age multiplier is the one after the last level <= age', () => {
  const rules = { ageLevels: [10, 16, 18], ageMultipliers: [2, 2.25, 2.5, 2.7] };
  assert.equal(ageCost(rules, 9), 18);
  assert.equal(ageCost(rules, 16), 16 * 2.5);
  assert.equal(ageCost(rules, 18), 18 * 2.7);
  assert.equal(ageCost(rules, 90), 90 * 2.7);
});

test('total is truncated toward zero, not rounded', () => {
  const rules = { ageLevels: [], ageMultipliers: [2.7], defaultSkill: 5, childCost: { son: 10, daughter: 10 },
    skillCosts: parseSkillCosts(SAMPLE) };
  assert.equal(totalPoints(rules, { age: 18 }), 114); // 48.6 + 5 * 12 + 6 = 114.6
  assert.equal(totalPoints(rules, { age: 18, traitCosts: [-166] }), -51); // -51.4
  assert.equal(totalPoints(rules, { age: 18, sons: 1, daughters: 1 }), 134);
});

// Cross-check against the real game files and values read from ck3db (patch 1.20.1.2).
const real = existsSync('../data/script_values/02_ruler_designer_values.txt');
test('real game files reproduce the known default builds', { skip: !real }, () => {
  const read = (p) => readFileSync(p, 'utf8');
  const rules = {
    ...parseDesignerDefines(read('../data/defines/00_defines.txt')),
    skillCosts: parseSkillCosts(read('../data/script_values/02_ruler_designer_values.txt')),
  };
  const { general, prowess } = rules.skillCosts;
  assert.deepEqual([10, 15, 30].map((v) => skillCost(general, v)), [38, 85, 334]);
  assert.equal(skillCost(prowess, 10), 20);
  assert.equal(rules.pointMax, 400);
  // Default build (every skill 5, no traits, no children) at several ages.
  const expected = { 10: 106, 16: 106, 18: 114, 23: 132, 28: 133, 45: 97, 50: 76, 60: 72, 70: 66 };
  for (const [age, points] of Object.entries(expected)) {
    // ck3db clamps ages below 16 to 16.
    assert.equal(totalPoints(rules, { age: Math.max(16, Number(age)) }), points, `age ${age}`);
  }
});
