const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COUNCIL_LAUNCHER_BAT = path.join(__dirname, '..', 'scripts', 'Start-Council-Dev-Server.bat');

function buildLaunchRecord({ councilDir, viteLog, shellCommand, serverPid }) {
  return {
    command: 'npm.cmd run dev',
    workingDirectory: councilDir,
    wrapperCommand: shellCommand,
    launcherBat: COUNCIL_LAUNCHER_BAT,
    viteLog,
    wrapperPid: serverPid,
    serverPid,
  };
}

/**
 * Start Council OS Vite dev server as a detached process.
 * Uses shell npm.cmd run dev (Windows detached spawn requires shell:true to keep Vite alive).
 */
function launchCouncilDevServer({ councilDir, viteLog, appendLog, repoRoot = path.join(__dirname, '..') }) {
  if (process.platform !== 'win32') {
    throw new Error('Council OS dev server launch is supported on Windows only.');
  }

  const launcherBat = path.join(repoRoot, 'scripts', 'Start-Council-Dev-Server.bat');
  if (!fs.existsSync(launcherBat)) {
    throw new Error(`Council launcher not found: ${launcherBat}`);
  }
  if (!fs.existsSync(path.join(councilDir, 'package.json'))) {
    throw new Error(`Council OS not found at ${councilDir}`);
  }

  fs.mkdirSync(path.dirname(viteLog), { recursive: true });
  fs.appendFileSync(viteLog, `\n--- Council OS dev server start ${new Date().toISOString()} ---\n`);

  const env = { ...process.env };
  if (fs.existsSync('C:\\Program Files\\nodejs\\npm.cmd')) {
    env.PATH = `C:\\Program Files\\nodejs;${env.PATH || ''}`;
  }

  const shellCommand = `npm.cmd run dev >> "${viteLog.replace(/"/g, '""')}" 2>&1`;

  const child = spawn(shellCommand, {
    env,
    cwd: councilDir,
    shell: true,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  const launchRecord = buildLaunchRecord({
    councilDir,
    viteLog,
    shellCommand,
    serverPid: child.pid,
  });

  child.on('error', (err) => {
    appendLog('error', 'launch', 'Council spawn error', {
      ...launchRecord,
      error: err.message,
    });
  });

  child.unref();

  appendLog('info', 'launch', 'Council OS dev server spawn requested', {
    ...launchRecord,
    note: 'Detached shell npm.cmd run dev; stdout/stderr appended to vite log.',
  });

  return launchRecord;
}

module.exports = {
  COUNCIL_LAUNCHER_BAT,
  buildLaunchRecord,
  launchCouncilDevServer,
};
