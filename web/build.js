// Ruler designer build: which traits can be picked, what a build costs, and the share code.
import { totalPoints } from './designer.js';

// ck3db clamps ages below 16 to 16.
export const MIN_AGE = 16;

export function designerTraits(dataset) {
  return dataset.traits.filter((t) => t.inDesigner);
}

// Ids that cannot be picked together with the selected traits.
export function conflictsOf(dataset, selected) {
  const blocked = new Set();
  const byId = new Map(dataset.traits.map((t) => [t.id, t]));
  for (const id of selected) for (const opposite of byId.get(id)?.opposites ?? []) blocked.add(opposite);
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
