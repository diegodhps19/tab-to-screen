import {moveTabToDisplay} from './movement.mjs';
import {t, errorMessage, setLanguage} from './i18n.mjs';

let moving = false;

async function saveResult(result) {
  await chrome.storage.session.set({lastResult: {...result, time: Date.now()}});
  await chrome.action.setBadgeBackgroundColor({color: result.ok ? '#a66b12' : '#b23838'});
  await chrome.action.setBadgeText({text: result.error || result.warning ? '!' : ''});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'move-tab') return false;
  // The service worker finishes the operation even when moving the window
  // causes Chrome to close the toolbar popup.
  (async () => {
    await setLanguage(message.language);
    if (moving) { sendResponse({ok: false, error: t('moveInProgress')}); return; }
    moving = true;
    let result;
    try { result = {ok: true, ...await moveTabToDisplay(chrome, message)}; }
    catch (error) { result = {ok: false, error: errorMessage(error, 'moveError')}; }
    try { await saveResult(result); } catch { /* Sending the result remains useful if storage fails. */ }
    moving = false;
    sendResponse(result);
  })();
  return true;
});
