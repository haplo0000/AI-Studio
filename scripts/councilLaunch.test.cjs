const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { COUNCIL_LAUNCHER_BAT, COUNCIL_HIDDEN_VBS } = require('../electron/councilLaunch.cjs');

assert.ok(fs.existsSync(COUNCIL_LAUNCHER_BAT), 'Start-Council-Dev-Server.bat must exist');
assert.ok(fs.existsSync(COUNCIL_HIDDEN_VBS), 'Launch-Council-Hidden.vbs must exist');
const vbs = fs.readFileSync(COUNCIL_HIDDEN_VBS, 'utf8');
assert.match(vbs, /WshShell\.Run.*0,\s*False/);
assert.match(vbs, /npm\.cmd run dev/);
const bat = fs.readFileSync(COUNCIL_LAUNCHER_BAT, 'utf8');
assert.match(bat, /COUNCIL_OS_DIR/);
assert.match(bat, /COUNCIL_VITE_LOG/);
assert.match(bat, /npm\.cmd run dev/);

console.log('councilLaunch.test.cjs: ok');
