const { COUNCIL_PORT, formatPortStatus, killProcessOnPort } = require('./councilPort.cjs');
const {
  getCouncilProbeUrl,
  readCouncilViteLogTail,
  getCouncilViteLogPath,
} = require('./councilConfig.cjs');

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCouncilHttp200(probeCouncilReady, url, timeoutMs = POLL_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let last = { ok: false, status: 0, error: 'timeout' };
  while (Date.now() < deadline) {
    last = await probeCouncilReady(url);
    if (last.ok) return last;
    await sleep(POLL_INTERVAL_MS);
  }
  return last;
}

function formatCouncilFailureDetail({
  message,
  councilDir,
  launchRecord,
  probeResult,
  port = COUNCIL_PORT,
}) {
  const parts = [message || 'Council OS did not respond with HTTP 200.'];
  parts.push('', `Probe URL: ${getCouncilProbeUrl()}`);
  parts.push('', 'Launch command:', `  npm.cmd run dev`);
  parts.push(`Working directory: ${councilDir || '(unknown)'}`);
  if (launchRecord) {
    parts.push('', 'Spawn wrapper:', `  ${launchRecord.wrapperCommand || '(none)'}`);
    if (launchRecord.launcherBat) {
      parts.push(`Launcher script: ${launchRecord.launcherBat}`);
    }
    if (launchRecord.viteLog) {
      parts.push(`Vite log: ${launchRecord.viteLog}`);
    }
    if (launchRecord.wrapperPid) {
      parts.push(`Wrapper PID: ${launchRecord.wrapperPid}`);
    }
  }
  parts.push('', formatPortStatus(port));
  if (probeResult) {
    parts.push('', `Last probe: ${probeResult.error || `HTTP ${probeResult.status}`}`);
  }
  const logTail = readCouncilViteLogTail(25);
  if (logTail) {
    parts.push('', 'Vite log tail:', logTail);
  } else {
    parts.push('', `No Vite log at ${getCouncilViteLogPath()}`);
  }
  return parts.join('\n');
}

/**
 * Bulletproof Council open flow:
 * 1. Probe http://127.0.0.1:5173
 * 2. Start npm.cmd run dev if needed (or after restart kill)
 * 3. Wait for HTTP 200
 * 4. Open browser only on success
 */
async function openCouncilFlow({
  restart = false,
  settings,
  resolvePathKey,
  probeCouncilReady,
  launchCouncilDevServer,
  openCouncilInBrowser,
  appendLog,
}) {
  const probeUrl = getCouncilProbeUrl(settings);
  const councilDir = resolvePathKey(settings, 'paths.council_os') || 'C:\\Dev\\Council-OS';
  let launchRecord = null;

  appendLog('info', 'council', restart ? 'Council restart requested' : 'Council open requested', {
    probeUrl,
    councilDir,
    port: COUNCIL_PORT,
    portStatus: formatPortStatus(COUNCIL_PORT),
  });

  if (restart) {
    const killResult = killProcessOnPort(COUNCIL_PORT);
    appendLog('info', 'council', 'Killed processes on Council port', {
      port: COUNCIL_PORT,
      ...killResult,
    });
    await sleep(2500);
  }

  let probe = await probeCouncilReady(probeUrl);
  appendLog('info', 'council', 'Initial Council probe', {
    probeUrl,
    ok: probe.ok,
    status: probe.status,
    error: probe.error,
    portStatus: formatPortStatus(COUNCIL_PORT),
  });

  if (probe.ok && !restart) {
    appendLog('info', 'council', 'Council already running — opening browser', { probeUrl });
    try {
      await openCouncilInBrowser();
      return { ok: true, message: `Opened Council OS at ${probeUrl}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open Council OS';
      appendLog('error', 'council', message, { probeUrl });
      return {
        ok: false,
        message: 'Council OS is not reachable',
        detail: formatCouncilFailureDetail({
          message,
          councilDir,
          launchRecord,
          probeResult: probe,
        }),
      };
    }
  }

  if (!probe.ok) {
    try {
      launchRecord = launchCouncilDevServer({
        councilDir,
        viteLog: getCouncilViteLogPath(),
        appendLog,
      });
      appendLog('info', 'council', 'Council dev server spawn issued', launchRecord);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start Council OS';
      appendLog('error', 'council', 'Council spawn failed', { error: message, councilDir });
      return {
        ok: false,
        message: 'Council OS failed to start',
        detail: formatCouncilFailureDetail({
          message,
          councilDir,
          launchRecord,
          probeResult: probe,
        }),
      };
    }

    probe = await waitForCouncilHttp200(probeCouncilReady, probeUrl);
    appendLog('info', 'council', 'Council ready wait finished', {
      probeUrl,
      ok: probe.ok,
      status: probe.status,
      error: probe.error,
      portStatus: formatPortStatus(COUNCIL_PORT),
    });
  }

  if (!probe.ok) {
    const detail = formatCouncilFailureDetail({
      message: 'Council OS did not respond with HTTP 200 in time',
      councilDir,
      launchRecord,
      probeResult: probe,
    });
    appendLog('error', 'council', 'Council OS did not become ready', {
      probeUrl,
      error: probe.error,
      portStatus: formatPortStatus(COUNCIL_PORT),
    });
    return {
      ok: false,
      message: 'Council OS did not respond with HTTP 200 in time',
      detail,
    };
  }

  try {
    await openCouncilInBrowser();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not open Council OS';
    appendLog('error', 'council', message, { probeUrl });
    return {
      ok: false,
      message: 'Council OS started but the browser could not be opened',
      detail: formatCouncilFailureDetail({
        message,
        councilDir,
        launchRecord,
        probeResult: probe,
      }),
    };
  }

  appendLog('info', 'council', 'Council OS opened in browser', { probeUrl });
  return { ok: true, message: `Opened Council OS at ${probeUrl}` };
}

module.exports = {
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  waitForCouncilHttp200,
  formatCouncilFailureDetail,
  openCouncilFlow,
};
