// Ruler designer build: which traits can be picked, what a build costs, and the share code.
import { totalPoints } from './designer.js';

// ck3db clamps ages below 16 to 16.
export const MIN_AGE = 16;

export function designerTraits(dataset) {
  return dataset.traits.filter((t) => t.inDesigner);
}

// `opposites` names a trait id or a whole group (beauty_good, intellect_bad...), and some
// conflicts are declared by only one side, so a pair clashes if either side lists the other.
const lists = (a, b) => a.opposites.includes(b.id) || (b.group !== null && b.group !== undefined && a.opposites.includes(b.group));
// Tiers of one group (education_martial_1..5, beauty_good_1..3) are alternative levels of the same trait.
const sameTierGroup = (a, b) => Boolean(a.group) && a.group === b.group && a.level != null && b.level != null;
const clash = (a, b) => a.id !== b.id && (lists(a, b) || lists(b, a) || sameTierGroup(a, b));

// Ids that cannot be picked together with the selected traits.
export function conflictsOf(dataset, selected) {
  const chosen = dataset.traits.filter((t) => selected.includes(t.id));
  const blocked = new Set();
  for (const trait of dataset.traits) if (chosen.some((c) => clash(c, trait))) blocked.add(trait.id);
  return blocked;
}

export function evaluate(dataset, build) {
  const { rules, traits } = dataset;
  const byId = new Map(traits.map((t) => [t.id, t]));
  const known = (build.traits ?? []).filter((id) => byId.has(id));
  const total = totalPoints(rules, {
    age: Math.max(MIN_AGE, build.age),
    skills: build.skills,
    traitCosts: known.map((id) => byId.get(id).cost),
    sons: build.sons,
    daughters: build.daughters,
  });
  return { total, remaining: rules.pointMax - total };
}

// Share code: the build as JSON in URL-safe base64, so it fits in a link fragment.
export function encodeBuild(build) {
  const bytes = new TextEncoder().encode(JSON.stringify(build));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeBuild(code) {
  try {
    const binary = atob(code.replaceAll('-', '+').replaceAll('_', '/'));
    const build = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
    return build && typeof build === 'object' && Number.isFinite(build.age) ? build : null;
  } catch {
    return null;
  }
}

// Splits traits into tier groups (two or more levels of one group) and everything else.
export function tierGroups(traits) {
  const byGroup = new Map();
  for (const trait of traits) {
    if (!trait.group || trait.level == null) continue;
    if (!byGroup.has(trait.group)) byGroup.set(trait.group, []);
    byGroup.get(trait.group).push(trait);
  }
  const groups = [];
  const grouped = new Set();
  for (const [group, members] of byGroup) {
    if (members.length < 2) continue;
    members.sort((a, b) => a.level - b.level);
    groups.push({ group, members });
    for (const m of members) grouped.add(m.id);
  }
  return { groups, singles: traits.filter((t) => !grouped.has(t.id)) };
}

// New selection after picking one tier of a group (or none): the group holds at most one level.
export function setTier(selected, memberIds, chosenId) {
  const rest = selected.filter((id) => !memberIds.includes(id));
  return chosenId ? [...rest, chosenId] : rest;
}

// Categories where a character holds at most one trait (the game offers a single education).
const EXCLUSIVE_CATEGORIES = ['education'];

// Selection after picking `chosenId`, minus the traits it replaces in an exclusive category.
// Call it before adding the pick: it only removes.
export function dropRivals(dataset, selected, chosenId) {
  const category = dataset.traits.find((t) => t.id === chosenId)?.category;
  if (!EXCLUSIVE_CATEGORIES.includes(category)) return selected;
  const inCategory = new Set(dataset.traits.filter((t) => t.category === category).map((t) => t.id));
  return selected.filter((id) => !inCategory.has(id));
}
