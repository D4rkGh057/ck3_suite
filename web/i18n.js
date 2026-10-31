// Interface texts in English and Spanish. Game data (trait names) comes from the game's own language.

export const LANGS = ['en', 'es'];
const STORAGE_KEY = 'ck3-suite-lang';

// An error with a code the interface can translate. `message` stays in English for logs and tests.
export class CodedError extends Error {
  constructor(code, params, message) {
    super(message);
    this.code = code;
    this.params = params ?? {};
  }
}

export const messages = {
  en: {
    'title': 'CK3 Build Suite',
    'intro': 'Import your own game data once. Files are read in this browser and never uploaded.',
    'ui.language': 'Interface language',
    'import.title': '1. Import from your game',
    'direct.text': 'Pick the <code>game</code> folder of Crusader Kings III. Only the files the tools need are read, not the rest of the install.',
    'direct.pick': 'Choose game folder',
    'direct.import': 'Import',
    'direct.language': 'Game language',
    'manual.note': 'Your browser does not allow opening the game folder directly. Direct import works in Chrome, Edge and Opera, and in Brave after enabling <code>brave://flags/#file-system-access-api</code>. Firefox and Safari do not support it. Pick the two small folders and the two files separately instead.',
    'manual.traits': 'Traits folder (<code>game/common/traits</code>)',
    'manual.loc': 'Localization folder (<code>game/localization/spanish</code> or <code>english</code>)',
    'manual.values': 'Skill costs file (<code>game/common/script_values/02_ruler_designer_values.txt</code>)',
    'manual.defines': 'Defines file (<code>game/common/defines/00_defines.txt</code>)',
    'manual.import': 'Import',
    'transfer.title': 'Move data between devices',
    'transfer.text': 'Export on your computer, import on your phone.',
    'transfer.export': 'Export file',
    'transfer.clear': 'Remove saved data',
    'summary.title': 'Loaded data',
    'summary.text': '{count} traits ({language}), imported {date}.',
    'summary.category': 'Category',
    'summary.traits': 'Traits',
    'status.reading': 'Reading files...',
    'status.done': 'Done: {count} traits.',
    'status.saveFailed': 'Imported, but this browser could not save the data. Export it to keep a copy.',
    'status.folderSelected': 'Folder selected. Choose a language and import.',
    'status.fileImported': 'Data imported from file.',
    'status.removed': 'Saved data removed.',
    'cat.congenital': 'congenital',
    'cat.education': 'education',
    'cat.lifestyle': 'lifestyle',
    'cat.personality': 'personality',
    'cat.childhood': 'childhood',
    'cat.fame': 'fame',
    'cat.health': 'health',
    'cat.commander': 'commander',
    'cat.winter_commander': 'winter commander',
    'cat.court_type': 'court type',
    'err.noLocalization': 'No "localization" folder found. Pick the folder named "game".',
    'err.missingTraitsDir': 'Folder "common/traits" not found. Pick the game folder that contains "common" and "localization".',
    'err.missingValuesFile': 'File "common/script_values/{file}" not found.',
    'err.missingDefinesFile': 'File "common/defines/{file}" not found.',
    'err.missingLocDir': 'Folder "localization/{language}" not found.',
    'err.noTraitFiles': 'No trait files (.txt) found in the selected folder.',
    'err.selectValues': 'Select the file "{file}" (game/common/script_values).',
    'err.selectDefines': 'Select the file "{file}" (game/common/defines).',
    'err.noTraits': 'The selected files contain no traits. Is this the "common/traits" folder?',
    'err.notDataset': 'This file is not a dataset exported by this tool.',
    'err.blockNotFound': '"{name}" not found in the game file.',
    'err.noTiers': 'No cost tiers found in the script values file.',
  },
  es: {
    'title': 'CK3 Build Suite',
    'intro': 'Importá los datos de tu propio juego una sola vez. Los archivos se leen en este navegador y nunca se suben.',
    'ui.language': 'Idioma de la interfaz',
    'import.title': '1. Importar desde tu juego',
    'direct.text': 'Elegí la carpeta <code>game</code> de Crusader Kings III. Solo se leen los archivos que necesitan las herramientas, no el resto de la instalación.',
    'direct.pick': 'Elegir carpeta del juego',
    'direct.import': 'Importar',
    'direct.language': 'Idioma del juego',
    'manual.note': 'Tu navegador no permite abrir la carpeta del juego directamente. La importación directa funciona en Chrome, Edge y Opera, y en Brave tras activar <code>brave://flags/#file-system-access-api</code>. Firefox y Safari no la soportan. En su lugar, elegí por separado las dos carpetas chicas y los dos archivos.',
    'manual.traits': 'Carpeta de rasgos (<code>game/common/traits</code>)',
    'manual.loc': 'Carpeta de localización (<code>game/localization/spanish</code> o <code>english</code>)',
    'manual.values': 'Archivo de costos de habilidades (<code>game/common/script_values/02_ruler_designer_values.txt</code>)',
    'manual.defines': 'Archivo de defines (<code>game/common/defines/00_defines.txt</code>)',
    'manual.import': 'Importar',
    'transfer.title': 'Pasar datos entre dispositivos',
    'transfer.text': 'Exportá en tu computadora e importá en tu celular.',
    'transfer.export': 'Exportar archivo',
    'transfer.clear': 'Borrar datos guardados',
    'summary.title': 'Datos cargados',
    'summary.text': '{count} rasgos ({language}), importados el {date}.',
    'summary.category': 'Categoría',
    'summary.traits': 'Rasgos',
    'status.reading': 'Leyendo archivos...',
    'status.done': 'Listo: {count} rasgos.',
    'status.saveFailed': 'Se importó, pero este navegador no pudo guardar los datos. Exportalos para conservar una copia.',
    'status.folderSelected': 'Carpeta elegida. Elegí un idioma e importá.',
    'status.fileImported': 'Datos importados desde el archivo.',
    'status.removed': 'Datos guardados borrados.',
    'cat.congenital': 'congénito',
    'cat.education': 'educación',
    'cat.lifestyle': 'estilo de vida',
    'cat.personality': 'personalidad',
    'cat.childhood': 'niñez',
    'cat.fame': 'fama',
    'cat.health': 'salud',
    'cat.commander': 'comandante',
    'cat.winter_commander': 'comandante invernal',
    'cat.court_type': 'tipo de corte',
    'err.noLocalization': 'No se encontró la carpeta "localization". Elegí la carpeta llamada "game".',
    'err.missingTraitsDir': 'No se encontró la carpeta "common/traits". Elegí la carpeta del juego que contiene "common" y "localization".',
    'err.missingValuesFile': 'No se encontró el archivo "common/script_values/{file}".',
    'err.missingDefinesFile': 'No se encontró el archivo "common/defines/{file}".',
    'err.missingLocDir': 'No se encontró la carpeta "localization/{language}".',
    'err.noTraitFiles': 'No hay archivos de rasgos (.txt) en la carpeta elegida.',
    'err.selectValues': 'Elegí el archivo "{file}" (game/common/script_values).',
    'err.selectDefines': 'Elegí el archivo "{file}" (game/common/defines).',
    'err.noTraits': 'Los archivos elegidos no contienen rasgos. ¿Es la carpeta "common/traits"?',
    'err.notDataset': 'Este archivo no es un conjunto de datos exportado por esta herramienta.',
    'err.blockNotFound': 'No se encontró "{name}" en el archivo del juego.',
    'err.noTiers': 'No se encontraron tramos de costo en el archivo de valores.',
  },
};

export function detectLang(saved, browserLang) {
  if (LANGS.includes(saved)) return saved;
  return String(browserLang ?? '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function translate(lang, key, params = {}) {
  const text = messages[lang]?.[key] ?? messages.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

// Message for an error: translated when it carries a code, otherwise its own text.
export function describeError(lang, error) {
  return error.code ? translate(lang, `err.${error.code}`, error.params) : error.message;
}

// Browser-side state. Storage can be blocked, so every access is guarded.
export function loadSavedLang(storage = globalThis.localStorage) {
  try { return storage.getItem(STORAGE_KEY); } catch { return null; }
}

export function saveLang(lang, storage = globalThis.localStorage) {
  try { storage.setItem(STORAGE_KEY, lang); } catch { /* the choice just will not persist */ }
}

// Fills every `data-i18n` (plain text) and `data-i18n-html` (text with inline <code>) element.
// The HTML variant only receives strings from `messages`, never user or file content.
export function applyTranslations(root, lang) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = translate(lang, el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = translate(lang, el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', translate(lang, el.dataset.i18nAria));
  root.documentElement?.setAttribute('lang', lang);
}
