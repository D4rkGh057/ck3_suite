// Reads the few CK3 game files the calculator needs and builds a local dataset.
// Game files are read in the browser only; nothing is uploaded.
import { extractTraits, parseLocalization } from './paradox.js';
import { parseSkillCosts, parseDesignerDefines } from './designer.js';
import { CodedError } from './i18n.js';

const SCHEMA = 2;
const VALUES_FILE = '02_ruler_designer_values.txt';
const DEFINES_FILE = '00_defines.txt';
const DB_NAME = 'ck3-suite';
const STORE = 'dataset';

// `text()` is available on both File objects and the wrappers built below.
const isTraitScript = (name) => name.endsWith('.txt');
const isTraitLoc = (name) => name.endsWith('.yml') && /trait/i.test(name);

async function child(dir, name) {
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

async function fileIn(dir, name) {
  try {
    return await (await dir.getFileHandle(name)).getFile();
  } catch {
    return null;
  }
}

async function readDir(dir, accept) {
  const files = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file' && accept(name)) files.push(await handle.getFile());
  }
  return files;
}

// Languages available under `game/localization`, found without reading any file.
export async function listLanguages(gameDir) {
  const loc = await child(gameDir, 'localization');
  if (!loc) return [];
  const langs = [];
  for await (const [name, handle] of loc.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('replace')) langs.push(name);
  }
  return langs.sort();
}

// Chromium path: walks straight to the needed folders and ignores the rest of the ~18 GB tree.
export async function readFromGameDir(gameDir, language) {
  const common = await child(gameDir, 'common');
  const traits = common && (await child(common, 'traits'));
  if (!traits) throw new CodedError('missingTraitsDir', {}, 'Folder "common/traits" not found. Pick the game folder that contains "common" and "localization".');
  const values = await child(common, 'script_values');
  const defines = await child(common, 'defines');
  const valuesFile = values && (await fileIn(values, VALUES_FILE));
  const definesFile = defines && (await fileIn(defines, DEFINES_FILE));
  if (!valuesFile) throw new CodedError('missingValuesFile', { file: VALUES_FILE }, `File "common/script_values/${VALUES_FILE}" not found.`);
  if (!definesFile) throw new CodedError('missingDefinesFile', { file: DEFINES_FILE }, `File "common/defines/${DEFINES_FILE}" not found.`);
  const loc = await child(gameDir, 'localization');
  const langDir = loc && (await child(loc, language));
  if (!langDir) throw new CodedError('missingLocDir', { language }, `Folder "localization/${language}" not found.`);
  return {
    language,
    traitFiles: await readDir(traits, isTraitScript),
    locFiles: await readDir(langDir, isTraitLoc),
    valuesFile,
    definesFile,
  };
}

// Fallback path: the user picks the two small folders separately (<input webkitdirectory>).
// Only direct children are used, so nested folders are ignored.
export function readFromFileLists(traitList, locList, language, valuesFile = null, definesFile = null) {
  const direct = (f) => (f.webkitRelativePath || f.name).split('/').length <= 2;
  return {
    language,
    traitFiles: [...traitList].filter((f) => direct(f) && isTraitScript(f.name)),
    locFiles: [...locList].filter((f) => direct(f) && isTraitLoc(f.name)),
    valuesFile,
    definesFile,
  };
}

export async function buildDataset({ language, traitFiles, locFiles, valuesFile, definesFile }) {
  if (traitFiles.length === 0) throw new CodedError('noTraitFiles', {}, 'No trait files (.txt) found in the selected folder.');
  if (!valuesFile) throw new CodedError('selectValues', { file: VALUES_FILE }, `Select the file "${VALUES_FILE}" (game/common/script_values).`);
  if (!definesFile) throw new CodedError('selectDefines', { file: DEFINES_FILE }, `Select the file "${DEFINES_FILE}" (game/common/defines).`);
  const rules = {
    ...parseDesignerDefines(await definesFile.text()),
    skillCosts: parseSkillCosts(await valuesFile.text()),
  };
  const names = {};
  for (const file of locFiles) Object.assign(names, parseLocalization(await file.text()));
  const traits = [];
  for (const file of traitFiles) {
    for (const trait of extractTraits(await file.text())) {
      traits.push({ ...trait, name: names[`trait_${trait.id}`] ?? trait.id });
    }
  }
  if (traits.length === 0) throw new CodedError('noTraits', {}, 'The selected files contain no traits. Is this the "common/traits" folder?');
  return { schema: SCHEMA, language, generatedAt: new Date().toISOString(), rules, traits };
}

export function exportDataset(dataset) {
  return JSON.stringify(dataset);
}

export function parseDataset(json) {
  const data = JSON.parse(json);
  if (data?.schema !== SCHEMA || !Array.isArray(data.traits)) {
    throw new CodedError('notDataset', {}, 'This file is not a dataset exported by this tool.');
  }
  return data;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const saveDataset = (dataset) => withStore('readwrite', (s) => s.put(dataset, 'current'));
// Data saved by an older version lacks the point rules, so it counts as not imported.
export const loadDataset = () => withStore('readonly', (s) => s.get('current')).then((d) => (d?.schema === SCHEMA ? d : null));
export const clearDataset = () => withStore('readwrite', (s) => s.delete('current'));
