// Reads the few CK3 game files the calculator needs and builds a local dataset.
// Game files are read in the browser only; nothing is uploaded.
import { extractTraits, parseLocalization, resolveReferences } from './paradox.js';
import { parseSkillCosts, parseDesignerDefines } from './designer.js';
import { CodedError } from './i18n.js';

const SCHEMA = 3;
// Interface language code -> the game's localization folder. Trait names are stored in both.
export const GAME_LANGS = { en: 'english', es: 'spanish' };
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

// Chromium path: walks straight to the needed folders and ignores the rest of the ~18 GB tree.
export async function readFromGameDir(gameDir) {
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
  const locByLang = {};
  for (const [code, folder] of Object.entries(GAME_LANGS)) {
    const dir = loc && (await child(loc, folder));
    if (dir) locByLang[code] = await readDir(dir, isTraitLoc);
  }
  if (Object.keys(locByLang).length === 0) {
    throw new CodedError('noSupportedLanguage', {}, 'Neither "localization/english" nor "localization/spanish" was found.');
  }
  return { traitFiles: await readDir(traits, isTraitScript), locByLang, valuesFile, definesFile };
}

// Fallback path: the user picks the small folders separately (<input webkitdirectory>).
// `locLists` maps a language code to the files of its folder; only direct children are used.
export function readFromFileLists(traitList, locLists, valuesFile = null, definesFile = null) {
  const direct = (f) => (f.webkitRelativePath || f.name).split('/').length <= 2;
  const locByLang = {};
  for (const [code, list] of Object.entries(locLists)) {
    const files = [...list].filter((f) => direct(f) && isTraitLoc(f.name));
    if (files.length > 0) locByLang[code] = files;
  }
  return {
    traitFiles: [...traitList].filter((f) => direct(f) && isTraitScript(f.name)),
    locByLang,
    valuesFile,
    definesFile,
  };
}

// Name of a trait in the interface language, falling back to the other language, then to its id.
export function traitName(trait, lang) {
  return trait.names?.[lang] ?? trait.names?.en ?? trait.names?.es ?? trait.id;
}

export async function buildDataset({ traitFiles, locByLang = {}, valuesFile, definesFile }) {
  if (traitFiles.length === 0) throw new CodedError('noTraitFiles', {}, 'No trait files (.txt) found in the selected folder.');
  if (!valuesFile) throw new CodedError('selectValues', { file: VALUES_FILE }, `Select the file "${VALUES_FILE}" (game/common/script_values).`);
  if (!definesFile) throw new CodedError('selectDefines', { file: DEFINES_FILE }, `Select the file "${DEFINES_FILE}" (game/common/defines).`);
  if (Object.keys(locByLang).length === 0) throw new CodedError('noLocFiles', {}, 'Select at least one localization folder (English or Spanish).');
  const rules = {
    ...parseDesignerDefines(await definesFile.text()),
    skillCosts: parseSkillCosts(await valuesFile.text()),
  };
  const localized = {};
  for (const [code, files] of Object.entries(locByLang)) {
    localized[code] = {};
    for (const file of files) Object.assign(localized[code], parseLocalization(await file.text()));
    localized[code] = resolveReferences(localized[code]);
  }
  const traits = [];
  for (const file of traitFiles) {
    for (const trait of extractTraits(await file.text())) {
      const names = {};
      for (const [code, table] of Object.entries(localized)) {
        if (table[`trait_${trait.id}`] !== undefined) names[code] = table[`trait_${trait.id}`];
      }
      traits.push({ ...trait, names });
    }
  }
  if (traits.length === 0) throw new CodedError('noTraits', {}, 'The selected files contain no traits. Is this the "common/traits" folder?');
  return { schema: SCHEMA, languages: Object.keys(localized), generatedAt: new Date().toISOString(), rules, traits };
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
