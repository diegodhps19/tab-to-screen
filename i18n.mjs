// English fallback keeps the movement helpers usable in Node tests.
const fallback = {
  "extensionName": "Tab to Screen",
  "extensionDescription": "Move the current Chrome tab to any available monitor in one click. Give your screens custom names and skip dragging windows.",
  "actionTitle": "Tab to Screen — move your tab to another monitor",
  "heading": "Which screen?",
  "intro": "Choose a monitor for your current tab.",
  "editNames": "Names",
  "editNamesTitle": "Choose names for your monitors",
  "refresh": "Refresh monitors",
  "languageLabel": "Interface language",
  "yourScreens": "Your screens",
  "findingDisplays": "Finding monitors…",
  "editorHeading": "Name each screen",
  "editorHint": "Numbers match the map. Leave a name blank to use the name reported by Chrome.",
  "cancel": "Cancel",
  "saveNames": "Save names",
  "availableDisplays": "Available monitors",
  "maximize": "Maximize at destination",
  "singleMonitor": "Chrome can see only one screen in this session. Check the monitors in your remote session, then refresh.",
  "footer": "Monitors on this computer",
  "screenNumber": "Screen $1",
  "namesHeading": "Monitor names",
  "namesIntro": "A familiar name for every screen.",
  "nameInputTitle": "Name for screen $1; reported by Chrome: $2",
  "saveNamesError": "Could not save the names. Please try again.",
  "mapTitle": "Screen $1: $2",
  "sending": "Moving tab…",
  "moveUnconfirmed": "Chrome did not confirm the move.",
  "finishEditing": "The layout may have changed. Save or cancel the names to refresh the list.",
  "noActiveTab": "Open the extension in the window containing the tab you want to move.",
  "displayCountOne": "1 monitor available",
  "displayCountMany": "$1 monitors available",
  "moveToDisplay": "Move tab to $1, screen $2",
  "primarySuffix": ", primary",
  "currentSuffix": ", current",
  "current": "Current",
  "primary": "Primary",
  "send": "Send",
  "noDisplays": "No monitors are available in this session. Check your screens and refresh.",
  "displaysUnavailable": "Screens unavailable",
  "displayReadError": "Could not retrieve the monitors. Please try again.",
  "savePreferenceError": "Could not save this preference.",
  "moveInProgress": "Wait for the current move to finish.",
  "moveError": "Could not move the tab. Check that the tab and monitor are still available, then try again.",
  "invalidWorkArea": "The monitor does not have a valid available area.",
  "invalidSelection": "Select a valid tab and monitor.",
  "displayGone": "This monitor is no longer available. Refresh the list and choose another screen.",
  "windowUnconfirmed": "Chrome did not confirm the destination window. Check where your tab is before trying again.",
  "pinWarning": "The tab was moved, but could not stay pinned.",
  "maximizeWarning": "The tab was moved, but the window could not be maximized.",
  "destinationWarning": "Your system did not keep the window on the selected monitor. Check the screens available in your session.",
  "verificationWarning": "The tab was moved, but the destination monitor could not be confirmed."
};

let selectedLanguage = null;
let selectedCatalog = null;

function browserLanguage() {
  try { return globalThis.chrome?.i18n?.getUILanguage() || 'en'; }
  catch { return 'en'; }
}

export function normalizeLanguage(language = browserLanguage()) {
  return String(language).toLowerCase().startsWith('pt') ? 'pt_BR' : 'en';
}

export async function setLanguage(language) {
  selectedLanguage = normalizeLanguage(language);
  selectedCatalog = selectedLanguage === 'en' ? fallback : null;
  if (selectedLanguage === 'pt_BR') {
    try {
      const url = globalThis.chrome?.runtime?.getURL('_locales/pt_BR/messages.json');
      if (url) {
        const messages = await fetch(url).then(response => {
          if (!response.ok) throw new Error(`Locale HTTP ${response.status}`);
          return response.json();
        });
        selectedCatalog = Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, value.message]));
      }
    } catch { /* Native Chrome localization remains available as a fallback. */ }
  }
  return selectedLanguage;
}

export function getLanguage() {
  return selectedLanguage || normalizeLanguage();
}

export function t(key, substitutions = []) {
  const values = (Array.isArray(substitutions) ? substitutions : [substitutions]).map(String);
  const selected = selectedCatalog?.[key];
  if (selected) return selected.replace(/\$(\d+)/g, (_, index) => values[Number(index) - 1] ?? '');
  try {
    const localized = globalThis.chrome?.i18n?.getMessage(key, values);
    if (localized) return localized;
  } catch { /* English remains available if the i18n API is unavailable. */ }
  return (fallback[key] || key).replace(/\$(\d+)/g, (_, index) => values[Number(index) - 1] ?? '');
}

export function localizedError(key, substitutions) {
  const error = new Error(t(key, substitutions));
  error.isLocalized = true;
  return error;
}

export function errorMessage(error, fallbackKey) {
  return error?.isLocalized && error.message ? error.message : t(fallbackKey);
}

export function localizeDocument(root = document) {
  root.documentElement.lang = getLanguage() === 'pt_BR' ? 'pt-BR' : 'en';
  root.title = t('extensionName');
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const [selector, attribute, dataKey] of [
    ['[data-i18n-title]', 'title', 'i18nTitle'],
    ['[data-i18n-aria-label]', 'aria-label', 'i18nAriaLabel']
  ]) {
    for (const element of root.querySelectorAll(selector)) {
      element.setAttribute(attribute, t(element.dataset[dataKey]));
    }
  }
}
