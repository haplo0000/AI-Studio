const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function isDeveloperLaunchMode() {
  return process.env.AI_STUDIO_LAUNCH_MODE === 'developer';
}

function spawnDetached(command, args, options = {}) {
  const visible = options.forceVisible ?? isDeveloperLaunchMode();
  return spawn(command, args, {
    detached: true,
    stdio: visible ? 'inherit' : 'ignore',
    windowsHide: !visible,
    shell: options.shell ?? false,
    ...options,
  });
}

function resolveWscriptExe() {
  const candidate = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe');
  return fs.existsSync(candidate) ? candidate : 'wscript.exe';
}

module.exports = {
  isDeveloperLaunchMode,
  spawnDetached,
  resolveWscriptExe,
};
