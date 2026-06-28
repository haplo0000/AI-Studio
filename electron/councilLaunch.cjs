const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COUNCIL_LAUNCHER_BAT = path.join(__dirname, '..', 'scripts', 'Start-Council-Dev-Server.bat');

function summarizeEnv(env) {
  const pathValue = env.PATH || env.Path || '';
  const pathParts = pathValue.split(';').filter(Boolean);
  return {
    PATH_entries: pathParts.length,
    PATH_has_nodejs: pathParts.some((entry) => /nodejs/i.test(entry)),
    AI_STUDIO_LAUNCH_MODE: env.AI_STUDIO_LAUNCH_MODE || null,
    LOCALAPPDATA: env.LOCALAPPDATA || null,
  };
}

/**
 * Start Council OS Vite dev server as a detached Windows process tree.
 * Uses start /MIN + a batch wrapper to avoid cmd quoting failures.
 */
function launchCouncilDevServer({ councilDir, viteLog, appendLog, repoRoot = path.join(__dirname, '..') }) {
  if (process.platform !== 'win32') {
    throw new Error('Council OS dev server launch is supported on Windows only.');
  }

  const launcherBat = path.join(repoRoot, 'scripts', 'Start-Council-Dev-Server.bat');
  if (!fs.existsSync(launcherBat)) {
    throw new Error(`Council launcher not found: ${launcherBat}`);
  }

  const env = {
    ...process.env,
    COUNCIL_OS_DIR: councilDir,
    COUNCIL_VITE_LOG: viteLog,
  };

  const spawnArgs = [
    '/c',
    'start',
    '/MIN',
    'Council OS Dev Server',
    'cmd.exe',
    '/c',
    launcherBat,
  ];

  const spawnOptions = {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  };

  const child = spawn('cmd.exe', spawnArgs, spawnOptions);
  let stderr = '';
  let stdout = '';
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  const diagnostics = {
    executable: process.platform === 'win32' ? 'cmd.exe' : null,
    spawnArguments: spawnArgs,
    launcherBat,
    councilDirectory: councilDir,
    viteLog,
    workingDirectory: process.cwd(),
    environment: summarizeEnv(env),
    pid: child.pid,
    stdout: '',
    stderr: '',
    exitCode: null,
    exitSignal: null,
    wrapperExitedMs: null,
    wrapperExitedImmediately: null,
  };

  const startedAt = Date.now();
  child.on('exit', (code, signal) => {
    diagnostics.exitCode = code;
    diagnostics.exitSignal = signal;
    diagnostics.wrapperExitedMs = Date.now() - startedAt;
    diagnostics.wrapperExitedImmediately = diagnostics.wrapperExitedMs < 2000;
    diagnostics.stdout = stdout.trim() || null;
    diagnostics.stderr = stderr.trim() || null;

    appendLog('info', 'launch', 'Council launcher wrapper exited', diagnostics);

    if (code !== 0) {
      appendLog('error', 'launch', 'Council launcher wrapper failed', diagnostics);
    }
  });

  child.unref();

  appendLog('info', 'launch', 'Council OS dev server spawn requested', {
    ...diagnostics,
    note: 'Wrapper cmd exits after start /MIN; Vite continues in detached child process.',
  });

  return diagnostics;
}

module.exports = {
  COUNCIL_LAUNCHER_BAT,
  launchCouncilDevServer,
};
