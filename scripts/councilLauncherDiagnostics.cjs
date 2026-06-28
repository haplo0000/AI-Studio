/**
 * Replicates AI Studio Council launcher spawn paths for diagnostics.
 * Usage: node scripts/councilLauncherDiagnostics.cjs [direct|start-min]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const mode = process.argv[2] || 'both';
const councilDir = process.env.COUNCIL_OS_DIR || 'C:\\Dev\\Council-OS';
const diagLog = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'),
  'CouncilOS',
  'launcher-diagnostics.log',
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probe(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        res.resume();
        resolve({ ok: true, status: res.statusCode });
      })
      .on('error', (err) => resolve({ ok: false, error: err.message }));
  });
}

function summarizeEnv(env) {
  const pathValue = env.PATH || env.Path || '';
  const pathParts = pathValue.split(';').filter(Boolean);
  return {
    PATH_entries: pathParts.length,
    PATH_has_nodejs: pathParts.some((p) => /nodejs/i.test(p)),
    npm_config_prefix: env.npm_config_prefix || null,
    NODE: env.NODE || null,
    AI_STUDIO_LAUNCH_MODE: env.AI_STUDIO_LAUNCH_MODE || null,
    LOCALAPPDATA: env.LOCALAPPDATA || null,
  };
}

function runSpawn(label, argsFactory) {
  return new Promise((resolve) => {
    const viteLog = path.join(path.dirname(diagLog), `vite-diag-${label}.log`);
    fs.mkdirSync(path.dirname(viteLog), { recursive: true });
    fs.writeFileSync(viteLog, `--- ${label} ${new Date().toISOString()} ---\n`);

    const devCmd = `cd /d "${councilDir}" && npm run dev >> "${viteLog}" 2>&1`;
    const spawnArgs = argsFactory(devCmd);
    const spawnOptions = {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: process.env,
    };

    const report = {
      label,
      executable: 'cmd.exe',
      spawnArguments: spawnArgs,
      workingDirectory: process.cwd(),
      devCommand: devCmd,
      councilDirectory: councilDir,
      environment: summarizeEnv(process.env),
      pid: null,
      stdout: '',
      stderr: '',
      exitCode: null,
      exitSignal: null,
      exitedImmediately: null,
      exitedWithinMs: null,
      viteLogTail: null,
      probe127: null,
      probeLocalhost: null,
    };

    const child = spawn('cmd.exe', spawnArgs, spawnOptions);
    report.pid = child.pid;

    const startedAt = Date.now();
    let exited = false;

    child.stdout?.on('data', (chunk) => {
      report.stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      report.stderr += chunk.toString();
    });

    child.on('exit', (code, signal) => {
      exited = true;
      report.exitCode = code;
      report.exitSignal = signal;
      report.exitedWithinMs = Date.now() - startedAt;
      report.exitedImmediately = report.exitedWithinMs < 2000;
    });

    child.unref();

    setTimeout(async () => {
      if (fs.existsSync(viteLog)) {
        const lines = fs.readFileSync(viteLog, 'utf8').split(/\r?\n/);
        report.viteLogTail = lines.slice(-12).join('\n');
      }
      report.probe127 = await probe('http://127.0.0.1:5173');
      report.probeLocalhost = await probe('http://localhost:5173');
      report.stillRunningAfterWait = !exited;
      resolve(report);
    }, 10000);
  });
}

async function main() {
  fs.mkdirSync(path.dirname(diagLog), { recursive: true });
  const results = [];

  if (mode === 'direct' || mode === 'both') {
    results.push(
      await runSpawn('production-direct', (devCmd) => ['/c', devCmd]),
    );
    await sleep(1500);
  }

  if (mode === 'start-min' || mode === 'both') {
    results.push(
      await runSpawn('developer-start-min', (devCmd) => [
        '/c',
        'start',
        '/MIN',
        'Council OS Dev Server',
        'cmd',
        '/c',
        devCmd,
      ]),
    );
  }

  const output = JSON.stringify({ ts: new Date().toISOString(), results }, null, 2);
  fs.appendFileSync(diagLog, output + '\n');
  console.log(output);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
