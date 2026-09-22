import {t, localizedError} from './i18n.mjs';

function validRect(rect) {
  return rect && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0;
}

export function usableDisplays(displays) {
  return displays.filter(display => display.isEnabled !== false
    && display.activeState !== 'inactive' && !display.mirroringSourceId
    && validRect(display.bounds)).sort((a, b) =>
    Number(b.isPrimary) - Number(a.isPrimary)
    || a.bounds.left - b.bounds.left || a.bounds.top - b.bounds.top
    || String(a.id).localeCompare(String(b.id)));
}

export function targetBounds(display) {
  const area = validRect(display.workArea) ? display.workArea : display.bounds;
  if (!validRect(area)) throw localizedError('invalidWorkArea');
  const width = Math.min(Math.floor(area.width), Math.max(400, Math.min(1400, Math.floor(area.width * 0.9))));
  const height = Math.min(Math.floor(area.height), Math.max(300, Math.min(950, Math.floor(area.height * 0.9))));
  return {left: Math.round(area.left + (area.width - width) / 2),
    top: Math.round(area.top + (area.height - height) / 2), width, height};
}

export function displayForWindow(window, displays) {
  if (!validRect(window)) return null;
  let best = null;
  let largest = 0;
  for (const display of displays) {
    const b = display.bounds;
    const overlap = Math.max(0, Math.min(window.left + window.width, b.left + b.width) - Math.max(window.left, b.left))
      * Math.max(0, Math.min(window.top + window.height, b.top + b.height) - Math.max(window.top, b.top));
    if (overlap > largest) { best = display; largest = overlap; }
  }
  return best;
}

export async function moveTabToDisplay(api, {tabId, displayId, maximize = true}) {
  if (!Number.isInteger(tabId) || typeof displayId !== 'string') throw localizedError('invalidSelection');
  const displays = usableDisplays(await api.system.display.getInfo());
  const target = displays.find(display => display.id === displayId);
  if (!target) throw localizedError('displayGone');
  const tab = await api.tabs.get(tabId);
  const source = await api.windows.get(tab.windowId, {populate: true});
  const bounds = targetBounds(target);
  let moved;
  // Reuse the window when it holds just this tab. For multiple tabs, detach the
  // existing tab instead of loading its URL, keeping its page state intact.
  if (source.tabs?.length === 1) {
    if (source.state !== 'normal') await api.windows.update(source.id, {state: 'normal'});
    moved = await api.windows.update(source.id, {...bounds, focused: true});
  } else {
    moved = await api.windows.create({tabId: tab.id, ...bounds, state: 'normal',
      type: 'normal', focused: true, incognito: Boolean(tab.incognito)});
  }
  if (!Number.isInteger(moved?.id)) throw localizedError('windowUnconfirmed');
  const warnings = [];
  if (tab.pinned) {
    try { await api.tabs.update(tab.id, {pinned: true}); }
    catch { warnings.push(t('pinWarning')); }
  }
  // Maximized/fullscreen cannot be combined with bounds in Chrome's API.
  if (maximize) {
    try { await api.windows.update(moved.id, {state: 'maximized'}); }
    catch { warnings.push(t('maximizeWarning')); }
  }
  const actual = await api.windows.get(moved.id).catch(() => null);
  if (actual) {
    const currentDisplay = displayForWindow(actual, displays);
    if (!currentDisplay || currentDisplay.id !== target.id) {
      warnings.push(t('destinationWarning'));
    }
  } else {
    warnings.push(t('verificationWarning'));
  }
  return {windowId: moved.id, warning: warnings.join(' ') || null};
}
