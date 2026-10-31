// Ruler designer point rules, read from the game's own script files.
import { parseScript } from './paradox.js';
import { CodedError } from './i18n.js';

const first = (entries, key) => entries.find(([k]) => k === key)?.[1];
const num = (v) => Number(v);

function topLevelBlock(source, name) {
  const block = parseScript(source).find(([k]) => k === name)?.[1];
  if (!Array.isArray(block)) throw new CodedError('blockNotFound', { name }, `"${name}" not found in the script values file.`);
  return block;
}

// A skill cost is a chain of `if / else_if` tiers. Each one computes
//   cost = add * (value - subtract) + add2     (`multiply = scope:value` means subtract 0, add2 0)
// and applies for `lower < scope:value < upper`.
function parseTiers(block) {
  const tiers = [];
  for (const [key, body] of block) {
    if ((key !== 'if' && key !== 'else_if') || !Array.isArray(body)) continue;
    const limit = first(body, 'limit') ?? [];
    const lower = first(limit, 'scope:value >');
    const upper = first(limit, 'scope:value <');
    const adds = body.filter(([k]) => k === 'add').map(([, v]) => num(v));
    const multiply = first(body, 'multiply');
    const subtract = Array.isArray(multiply) ? num(first(multiply, 'subtract') ?? 0) : 0;
    tiers.push({
      // null means unbounded; Infinity would not survive the JSON export.
      min: lower === undefined ? null : num(lower) + 1,
      max: upper === undefined ? null : num(upper) - 1,
      factor: adds[0],
      subtract,
      offset: adds[1] ?? 0,
    });
  }
  if (tiers.length === 0) throw new CodedError('noTiers', {}, 'No cost tiers found in the script values file.');
  return tiers;
}

export function parseSkillCosts(source) {
  const general = parseTiers(topLevelBlock(source, 'ruler_designer_general_skill_value_cost'));
  const prowess = parseTiers(topLevelBlock(source, 'ruler_designer_prowess_skill_value_cost'));
  return { general, prowess };
}

// Points a base skill value costs. Values outside every tier (0 or less) cost nothing.
export function skillCost(tiers, value) {
  const tier = tiers.find((t) => (t.min === null || value >= t.min) && (t.max === null || value <= t.max));
  return tier ? tier.factor * (value - tier.subtract) + tier.offset : 0;
}

export function parseDesignerDefines(source) {
  const block = topLevelBlock(source, 'NRulerDesigner');
  const list = (key) => first(block, key).map(([, v]) => num(v));
  return {
    pointMax: num(first(block, 'IRONMAN_POINT_MAX')),
    defaultSkill: num(first(block, 'DEFAULT_SKILL_VALUE')),
    childCost: { son: num(first(block, 'GENERATED_SONS_MULTIPLIER')), daughter: num(first(block, 'GENERATED_DAUGHTERS_MULTIPLIER')) },
    ageLevels: list('AGE_LEVELS'),
    ageMultipliers: list('AGE_LEVEL_MULTIPLIERS'),
  };
}

// The multiplier for an age is the one after the last age level that is <= age.
// There is one more multiplier than levels, so the last one covers the oldest ages.
export function ageCost({ ageLevels, ageMultipliers }, age) {
  const index = ageLevels.filter((level) => level <= age).length;
  return age * ageMultipliers[index];
}

export const SKILLS = ['diplomacy', 'martial', 'stewardship', 'intrigue', 'learning', 'prowess'];

// Total points of a build. Parts keep their fractions; the game truncates the total toward zero.
//   build: { age, skills: { diplomacy: 5, ... }, traitCosts: [..], sons, daughters }
export function totalPoints(rules, build) {
  const { age, skills = {}, traitCosts = [], sons = 0, daughters = 0 } = build;
  let total = ageCost(rules, age);
  for (const skill of SKILLS) {
    const tiers = skill === 'prowess' ? rules.skillCosts.prowess : rules.skillCosts.general;
    total += skillCost(tiers, skills[skill] ?? rules.defaultSkill);
  }
  total += traitCosts.reduce((a, b) => a + b, 0);
  total += sons * rules.childCost.son + daughters * rules.childCost.daughter;
  return Math.trunc(total);
}
