const fs = require('fs');
const path = require('path');

/** Default Council OS dev server URL — keep in sync with config/settings.yaml.example */
const DEFAULT_COUNCIL_URL = 'http://127.0.0.1:5173';

function getCouncilServiceUrl(settings) {
  const raw = settings?.services?.council_os || DEFAULT_COUNCIL_URL;
  return raw.replace(/\/$/, '');
}

function normalizeServiceUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname;
    const port =
      parsed.port || (parsed.protocol === 'https:' ? '443' : parsed.protocol === 'http:' ? '80' : '');
    return `${parsed.protocol}//${host}${port ? `:${port}` : ''}`;
  } catch {
    return url.replace(/\/$/, '');
  }
}

function isCouncilServiceUrl(settings, url) {
  if (!url) return false;
  return normalizeServiceUrl(url) === normalizeServiceUrl(getCouncilServiceUrl(settings));
}

function getCouncilViteLogPath() {
  return path.join(process.env.LOCALAPPDATA || '', 'CouncilOS', 'vite.log');
}

function readCouncilViteLogTail(lineCount = 20) {
  const logPath = getCouncilViteLogPath();
  if (!fs.existsSync(logPath)) return null;
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split(/\r?\n/);
    if (lines.length === 0) return null;
    return lines.slice(-lineCount).join('\n');
  } catch {
    return null;
  }
}

function formatCouncilStartupFailure(health, settings) {
  const url = getCouncilServiceUrl(settings);
  const parts = [
    health?.message || 'Council OS did not respond with HTTP 200.',
    `Expected URL: ${url}`,
  ];
  const logTail = readCouncilViteLogTail();
  if (logTail) {
    parts.push('', 'Recent Vite log:', logTail);
  } else {
    parts.push('', `No Vite log found at ${getCouncilViteLogPath()}.`);
  }
  return parts.join('\n');
}

module.exports = {
  DEFAULT_COUNCIL_URL,
  getCouncilServiceUrl,
  normalizeServiceUrl,
  isCouncilServiceUrl,
  getCouncilViteLogPath,
  readCouncilViteLogTail,
  formatCouncilStartupFailure,
};
