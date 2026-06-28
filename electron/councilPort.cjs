const { execSync } = require('child_process');

const COUNCIL_PORT = 5173;

function getListenersOnPort(port = COUNCIL_PORT) {
  if (process.platform !== 'win32') return [];
  try {
    const out = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, { encoding: 'utf8' });
    const results = [];
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const localAddress = parts[1] || '';
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) {
        results.push({ localAddress, pid });
      }
    }
    return results;
  } catch {
    return [];
  }
}

function killProcessOnPort(port = COUNCIL_PORT) {
  const listeners = getListenersOnPort(port);
  const killed = [];
  for (const { pid } of listeners) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      killed.push(pid);
    } catch {
      // ignore kill failures
    }
  }
  return { killed, listenersBefore: listeners };
}

function formatPortStatus(port = COUNCIL_PORT) {
  const listeners = getListenersOnPort(port);
  if (listeners.length === 0) {
    return `Port ${port}: not in use`;
  }
  return listeners
    .map((entry) => `Port ${port}: LISTENING on ${entry.localAddress} (PID ${entry.pid})`)
    .join('\n');
}

module.exports = {
  COUNCIL_PORT,
  getListenersOnPort,
  killProcessOnPort,
  formatPortStatus,
};
