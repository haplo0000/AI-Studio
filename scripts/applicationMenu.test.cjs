const assert = require('node:assert/strict');
const {
  installApplicationMenu,
  menuTemplateIncludesEditRole,
} = require('../electron/applicationMenu.cjs');

let capturedTemplate = null;
const mockMenu = {
  buildFromTemplate(template) {
    capturedTemplate = template;
    return {};
  },
  setApplicationMenu() {},
};

installApplicationMenu(mockMenu);
assert.ok(capturedTemplate, 'menu template should be built');
assert.ok(
  menuTemplateIncludesEditRole(capturedTemplate),
  'application menu must include editMenu role for Ctrl+V paste',
);

console.log('applicationMenu.test.cjs passed');
