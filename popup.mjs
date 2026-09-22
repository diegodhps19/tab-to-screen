import {usableDisplays, displayForWindow} from './movement.mjs';
import {t, localizedError, errorMessage, localizeDocument, setLanguage, getLanguage, normalizeLanguage} from './i18n.mjs';

const $ = id => document.getElementById(id);
let activeTab;
let busy = false;
let displayNames = {};
let availableDisplays = [];
let editingNames = false;

function reportedName(display, index) {
  return display.name?.trim() || t('screenNumber', index + 1);
}

function displayLabel(display, index) {
  const custom = displayNames[display.id];
  return (typeof custom === 'string' && custom.trim()) || reportedName(display, index);
}

function closeNameEditor() {
  editingNames = false;
  $('main-heading').textContent = t('heading');
  $('intro').textContent = t('intro');
  $('name-editor').hidden = true;
  $('monitors').hidden = false;
  $('maximize-option').hidden = false;
  $('edit-names').disabled = false;
  document.querySelectorAll('.language-option').forEach(button => { button.disabled = false; });
}

function openNameEditor() {
  if (busy || !availableDisplays.length) return;
  editingNames = true;
  $('main-heading').textContent = t('namesHeading');
  $('intro').textContent = t('namesIntro');
  status('');
  $('name-fields').replaceChildren();
  availableDisplays.forEach((display, index) => {
    const label = document.createElement('label'); label.className = 'name-field';
    const caption = document.createElement('span'); caption.textContent = t('screenNumber', index + 1);
    const input = document.createElement('input'); input.type = 'text'; input.className = 'name-input';
    input.dataset.displayId = display.id; input.maxLength = 60; input.autocomplete = 'off';
    input.value = typeof displayNames[display.id] === 'string' ? displayNames[display.id] : '';
    input.placeholder = reportedName(display, index);
    input.title = t('nameInputTitle', [index + 1, reportedName(display, index)]);
    label.append(caption, input); $('name-fields').append(label);
  });
  $('name-editor').hidden = false;
  $('monitors').hidden = true;
  $('maximize-option').hidden = true;
  $('edit-names').disabled = true;
  document.querySelectorAll('.language-option').forEach(button => { button.disabled = true; });
  $('name-fields').querySelector('input')?.focus();
}

async function saveNames(event) {
  event.preventDefault();
  if (busy) return;
  const updated = {...displayNames};
  $('name-fields').querySelectorAll('input').forEach(input => {
    const value = input.value.trim();
    // Empty values explicitly select Chrome's reported name.
    updated[input.dataset.displayId] = value;
  });
  setBusy(true);
  try {
    await chrome.storage.local.set({displayNames: updated});
    displayNames = updated;
    closeNameEditor();
    setBusy(false);
    await refresh();
    $('edit-names').focus();
  } catch { status(t('saveNamesError'), true); }
  finally { setBusy(false); }
}

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  $('status').hidden = !message;
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll('button, input').forEach(control => { control.disabled = value; });
  $('edit-names').disabled = value || editingNames;
  document.querySelectorAll('.language-option').forEach(button => { button.disabled = value || editingNames; });
}

function updateLanguageControl() {
  const language = getLanguage();
  $('language-switch').setAttribute('aria-label', t('languageLabel'));
  document.querySelectorAll('.language-option').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
}

async function chooseLanguage(language) {
  if (busy || editingNames || normalizeLanguage(language) === getLanguage()) return;
  setBusy(true);
  try {
    await chrome.storage.local.set({uiLanguage: normalizeLanguage(language)});
    await setLanguage(language);
    localizeDocument();
    updateLanguageControl();
  } catch {
    status(t('savePreferenceError'), true);
    return;
  } finally { setBusy(false); }
  await refresh();
  document.querySelector(`.language-option[data-language="${getLanguage()}"]`)?.focus();
}

function drawMap(displays, current) {
  $('map').replaceChildren();
  if (!displays.length) return;
  const left = Math.min(...displays.map(d => d.bounds.left));
  const top = Math.min(...displays.map(d => d.bounds.top));
  const width = Math.max(...displays.map(d => d.bounds.left + d.bounds.width)) - left;
  const height = Math.max(...displays.map(d => d.bounds.top + d.bounds.height)) - top;
  const canvasWidth = $('map').clientWidth;
  const canvasHeight = $('map').clientHeight;
  const scale = Math.min((canvasWidth - 28) / width, (canvasHeight - 14) / height);
  displays.forEach((display, index) => {
    const screen = document.createElement('div');
    screen.className = 'screen' + (display.id === current?.id ? ' current' : '');
    screen.textContent = index + 1;
    screen.title = t('mapTitle', [index + 1, displayLabel(display, index)]);
    const b = display.bounds;
    Object.assign(screen.style, {left: `${(canvasWidth - width * scale) / 2 + (b.left - left) * scale}px`,
      top: `${(canvasHeight - height * scale) / 2 + (b.top - top) * scale}px`,
      width: `${Math.max(4, b.width * scale - 3)}px`, height: `${Math.max(4, b.height * scale - 3)}px`});
    $('map').append(screen);
  });
}

async function send(display) {
  if (busy || !activeTab) return;
  setBusy(true);
  status(t('sending'));
  try {
    const result = await chrome.runtime.sendMessage({type: 'move-tab', tabId: activeTab.id,
      displayId: display.id, maximize: $('maximize').checked, language: getLanguage()});
    if (!result?.ok) {
      status(result?.error || t('moveUnconfirmed'), true);
      return;
    }
    if (result.warning) status(result.warning, true);
    else window.close();
  } catch { status(t('moveError'), true); }
  finally { setBusy(false); }
}

async function refresh() {
  if (busy) return;
  if (editingNames) {
    status(t('finishEditing'));
    return;
  }
  setBusy(true);
  status('');
  try {
    const [allDisplays, tabs, source] = await Promise.all([
      chrome.system.display.getInfo(), chrome.tabs.query({active: true, currentWindow: true}), chrome.windows.getCurrent()
    ]);
    activeTab = tabs[0];
    if (!Number.isInteger(activeTab?.id)) throw localizedError('noActiveTab');
    const displays = usableDisplays(allDisplays);
    availableDisplays = displays;
    const current = displayForWindow(source, displays);
    $('count').textContent = t(displays.length === 1 ? 'displayCountOne' : 'displayCountMany', displays.length);
    $('monitors').replaceChildren();
    $('single-monitor').hidden = displays.length !== 1;
    drawMap(displays, current);
    displays.forEach((display, index) => {
      const button = document.createElement('button');
      button.className = 'monitor' + (display.id === current?.id ? ' is-current' : '');
      const name = displayLabel(display, index);
      button.setAttribute('aria-label', t('moveToDisplay', [name, index + 1])
        + (display.isPrimary ? t('primarySuffix') : '')
        + (display.id === current?.id ? t('currentSuffix') : ''));
      const number = document.createElement('span'); number.className = 'number'; number.textContent = index + 1;
      const copy = document.createElement('span'); copy.className = 'monitor-copy';
      const nameLine = document.createElement('span'); nameLine.className = 'monitor-name-line';
      const title = document.createElement('span'); title.className = 'monitor-title';
      title.textContent = name;
      title.title = name;
      nameLine.append(title);
      if (display.id === current?.id) {
        const badge = document.createElement('span'); badge.className = 'current-label'; badge.textContent = t('current');
        nameLine.append(badge);
      }
      const detail = document.createElement('span'); detail.className = 'monitor-detail';
      detail.textContent = `${t('screenNumber', index + 1)}${display.isPrimary ? ' · ' + t('primary') : ''} · ${display.bounds.width} × ${display.bounds.height}`;
      detail.title = detail.textContent;
      const arrow = document.createElement('span'); arrow.className = 'send'; arrow.textContent = t('send'); arrow.setAttribute('aria-hidden', 'true');
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [key, value] of Object.entries({width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'})) icon.setAttribute(key, value);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M7 17 17 7M7 7h10v10');
      icon.append(path); arrow.append(icon);
      copy.append(nameLine, detail); button.append(number, copy, arrow);
      button.addEventListener('click', () => send(display));
      $('monitors').append(button);
    });
    if (!displays.length) status(t('noDisplays'), true);
  } catch (error) {
    activeTab = null;
    availableDisplays = [];
    $('monitors').replaceChildren();
    $('map').replaceChildren();
    $('count').textContent = t('displaysUnavailable');
    status(errorMessage(error, 'displayReadError'), true);
  } finally { setBusy(false); }
}

$('refresh').addEventListener('click', refresh);
$('language-switch').addEventListener('click', event => {
  const button = event.target.closest('.language-option');
  if (button) chooseLanguage(button.dataset.language);
});
$('edit-names').addEventListener('click', openNameEditor);
$('cancel-names').addEventListener('click', async () => { closeNameEditor(); await refresh(); $('edit-names').focus(); });
$('names-form').addEventListener('submit', saveNames);
$('maximize').addEventListener('change', async () => {
  try { await chrome.storage.local.set({maximize: $('maximize').checked}); }
  catch { status(t('savePreferenceError'), true); }
});
chrome.system.display.onDisplayChanged.addListener(refresh);

async function init() {
  let previous;
  try {
    const [prefs, session] = await Promise.all([chrome.storage.local.get({maximize: true, displayNames: {}, uiLanguage: null}), chrome.storage.session.get('lastResult')]);
    await setLanguage(prefs.uiLanguage || normalizeLanguage());
    localizeDocument();
    updateLanguageControl();
    $('maximize').checked = prefs.maximize;
    displayNames = prefs.displayNames || {};
    previous = session.lastResult;
    await chrome.storage.session.remove('lastResult');
    await chrome.action.setBadgeText({text: ''});
  } catch {
    await setLanguage(normalizeLanguage());
    localizeDocument();
    updateLanguageControl();
  }
  await refresh();
  if (previous && Date.now() - previous.time < 300000 && (previous.error || previous.warning)) {
    status(previous.error || previous.warning, true);
  }
}
init();
