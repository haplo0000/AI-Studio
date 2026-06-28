const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const launchBat = path.join(repoRoot, 'scripts', 'Launch-AI-Studio.bat');
const hiddenBat = path.join(repoRoot, 'scripts', 'Start-AI-Studio-Dev-Hidden.bat');
const vbs = path.join(repoRoot, 'scripts', 'Launch-AI-Studio.vbs');

assert.ok(fs.existsSync(launchBat));
assert.ok(fs.existsSync(hiddenBat));
assert.ok(fs.existsSync(vbs));

const launch = fs.readFileSync(launchBat, 'utf8');
assert.doesNotMatch(launch, /Start-Process -FilePath 'npm\.cmd'/);
assert.match(launch, /Start-AI-Studio-Dev-Hidden\.bat/);
assert.match(launch, /--embedded/);

const vbsText = fs.readFileSync(vbs, 'utf8');
assert.match(vbsText, /--embedded/);

const hidden = fs.readFileSync(hiddenBat, 'utf8');
assert.match(hidden, /npm\.cmd start/);
assert.match(hidden, /dist\\index\.html/);
assert.match(hidden, /AI_STUDIO_LAUNCH_MODE/);
assert.match(hidden, /Program Files\\nodejs/);
assert.doesNotMatch(hidden, /npm\.cmd run dev/);

console.log('aiStudioLauncher.test.cjs: ok');
