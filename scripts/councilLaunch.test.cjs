const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { COUNCIL_LAUNCHER_BAT } = require('../electron/councilLaunch.cjs');

assert.ok(fs.existsSync(COUNCIL_LAUNCHER_BAT), 'Start-Council-Dev-Server.bat must exist');
const bat = fs.readFileSync(COUNCIL_LAUNCHER_BAT, 'utf8');
assert.match(bat, /COUNCIL_OS_DIR/);
assert.match(bat, /COUNCIL_VITE_LOG/);
assert.match(bat, /npm\.cmd run dev/);

console.log('councilLaunch.test.cjs: ok');
