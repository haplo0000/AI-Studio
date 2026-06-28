const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COUNCIL_LAUNCHER_BAT = path.join(__dirname, '..', 'scripts', 'Start-Council-Dev-Server.bat');
const COUNCIL_HIDDEN_VBS = path.join(__dirname, '..', 'scripts', 'Launch-Council-Hidden.vbs');

function resolveWscriptExe() {
  const candidate = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe');
  return fs.existsSync(candidate) ? candidate : 'wscript.exe';
}

function buildLaunchRecord({ councilDir, viteLog, shellCommand, serverPid, hideConsole }) {
  return {
    command: 'npm.cmd run dev',
    workingDirectory: councilDir,
    wrapperCommand: shellCommand,
    launcherBat: COUNCIL_LAUNCHER_BAT,
    viteLog,
    wrapperPid: serverPid,
    serverPid,
    hideConsole,
  };
}

/**
 * Start Council OS Vite dev server as a detached process.
 * Production (hideConsole): wscript hidden wrapper — no visible cmd window.
 * Developer mode: shell npm.cmd run dev with visible console.
 */
function launchCouncilDevServer({
  councilDir,
  viteLog,
  appendLog,
  repoRoot = path.join(__dirname, '..'),
  hideConsole = false,
}) {
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

  const env = { ...process.env, COUNCIL_OS_DIR: councilDir, COUNCIL_VITE_LOG: viteLog };
  if (fs.existsSync('C:\\Program Files\\nodejs\\npm.cmd')) {
    env.PATH = `C:\\Program Files\\nodejs;${env.PATH || ''}`;
  }

  let child;
  let shellCommand;

  if (hideConsole) {
    const hiddenVbs = path.join(repoRoot, 'scripts', 'Launch-Council-Hidden.vbs');
    if (!fs.existsSync(hiddenVbs)) {
      throw new Error(`Council hidden launcher not found: ${hiddenVbs}`);
    }
    const wscriptExe = resolveWscriptExe();
    shellCommand = `${wscriptExe} //Nologo "${hiddenVbs}"`;
    child = spawn(wscriptExe, ['//Nologo', hiddenVbs], {
      env,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    shellCommand = `npm.cmd run dev >> "${viteLog.replace(/"/g, '""')}" 2>&1`;
    child = spawn(shellCommand, {
      env,
      cwd: councilDir,
      shell: true,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
  }

  const launchRecord = buildLaunchRecord({
    councilDir,
    viteLog,
    shellCommand,
    serverPid: child.pid,
    hideConsole,
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
    note: hideConsole
      ? 'Hidden wscript wrapper; stdout/stderr appended to vite log.'
      : 'Detached shell npm.cmd run dev; visible developer console.',
  });

  return launchRecord;
}

module.exports = {
  COUNCIL_LAUNCHER_BAT,
  COUNCIL_HIDDEN_VBS,
  buildLaunchRecord,
  launchCouncilDevServer,
};
