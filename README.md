# Tab to Screen

Move your current Chrome tab to an available monitor without dragging windows. Version 1.3.1 adds an **EN / PT-BR** control and remembers the selected interface language.

## Install locally

1. Extract the extension into a permanent folder on the computer whose monitors you want to use. With remote access, this is the remote computer.
2. Open `chrome://extensions` in that computer's Chrome browser and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Pin **Tab to Screen** using Chrome's extensions menu.

Keep the folder in the same place. No other program, account or runtime is required.

## Update an existing local installation

Replace the extension files **inside the exact folder already loaded in Chrome**, then choose **Reload** in `chrome://extensions`. Keep the existing extension installed. This preserves saved monitor names and the maximize preference. A Chrome Web Store installation has a different extension ID from this unpacked installation, so preferences are separate and must be entered again.

**Atualização em português:** substitua os arquivos dentro da mesma pasta já carregada no Chrome e clique em **Recarregar** em `chrome://extensions`. Não remova a extensão nem carregue outra pasta se quiser manter seus nomes salvos. O nome passa a ser **Tab to Screen**. Uma instalação futura pela Chrome Web Store terá outro identificador e suas preferências serão separadas.

## Use

Open the tab you want to move, open **Tab to Screen**, then select **Send** beside a monitor.

- The map shows the monitor arrangement and highlights the screen containing the current window.
- When a window has several tabs, the selected tab moves into its own window. When it is the only tab, the existing window moves.
- **Maximize at destination** is enabled by default. Turn it off for a smaller centered window.
- The existing tab is moved without navigating to its address again. Chrome may reload a discarded tab as part of its normal behavior.
- **Names** lets you give each monitor a familiar name. Leave a field blank to use the name Chrome reports.
- Use **EN / PT-BR** in the header to change the interface language. The choice is saved in the current Chrome profile.
- Refresh after changing your display configuration. When only one screen appears, check which monitors your remote session exposes to Chrome.
- If the popup closes during a move, the background worker continues the operation. An **!** badge reports an error or warning; reopen the popup to read it.

## Monitor names and numbering

This public release contains no device-specific monitor names or layout presets. It uses the names supplied by Chrome until you set your own. Chrome may report generic names even when the operating system knows the physical model. Saved names are associated with display IDs in the local Chrome profile. A change of port, driver or remote session can change those IDs and require renaming.

Screen numbers belong to the extension: the primary display appears first, followed by the others in position order. These numbers can differ from the operating system's **Identify** numbers. Dimensions are logical display dimensions reported by Chrome and may differ from physical resolution when scaling is enabled.

The extension lists active, separate displays that Chrome exposes to the current session. Disabled displays, mirrored screens or virtual displays may not appear as separate destinations. It does not change display settings. Chrome's **Allow in Incognito** option must be enabled to use it in an incognito window.

## Privacy and permissions

The extension works locally. It includes no analytics, advertising, external services or network requests, and does not transmit or sell user data. It does not inject scripts into web pages or read page content.

- `system.display` obtains display names, IDs, layout and available area to list and position destinations.
- `storage` saves custom monitor names and the maximize preference locally. The last operation's result is held in session storage to show a warning if the popup closes.

The Chrome tabs and windows APIs are used to identify the active tab and move it. No `tabs`, browsing-history or site-access permission is requested. Custom names remain in this Chrome profile and are not synchronized between devices by the extension.

## Removal

Open `chrome://extensions`, find **Tab to Screen**, and choose **Remove**. Removing the extension also removes its saved preferences.

## Developer references

- [Chrome display API](https://developer.chrome.com/docs/extensions/reference/api/system/display)
- [Chrome windows API](https://developer.chrome.com/docs/extensions/reference/api/windows)
- [Chrome i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [Load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
