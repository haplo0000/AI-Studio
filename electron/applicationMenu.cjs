/**
 * Electron routes standard edit shortcuts (Ctrl+V, Ctrl+C, etc.) through the
 * application menu. Without an Edit menu, paste/copy/cut do not work in inputs.
 */

/** @param {typeof import('electron').Menu} Menu */
function installApplicationMenu(Menu) {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** @param {import('electron').WebContents} webContents */
function attachEditableContextMenu(webContents, Menu) {
  webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable) return;

    const menu = Menu.buildFromTemplate([
      { role: 'undo', enabled: params.editFlags.canUndo },
      { role: 'redo', enabled: params.editFlags.canRedo },
      { type: 'separator' },
      { role: 'cut', enabled: params.editFlags.canCut },
      { role: 'copy', enabled: params.editFlags.canCopy },
      { role: 'paste', enabled: params.editFlags.canPaste },
      { type: 'separator' },
      { role: 'selectAll' },
    ]);

    menu.popup();
  });
}

function menuTemplateIncludesEditRole(template) {
  return template.some((item) => item.role === 'editMenu');
}

module.exports = {
  installApplicationMenu,
  attachEditableContextMenu,
  menuTemplateIncludesEditRole,
};
