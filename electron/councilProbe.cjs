const http = require('http');
const https = require('https');

/**
 * Probe Council OS — must return HTTP 200 (Vite dev server ready page).
 */
function probeCouncilReady(urlString, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlString);
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        url,
        { method: 'GET', timeout: timeoutMs },
        (res) => {
          res.resume();
          const status = res.statusCode || 0;
          resolve({
            ok: status === 200,
            status,
            error: status === 200 ? undefined : `HTTP ${status}`,
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, error: 'timeout' });
      });
      req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message }));
      req.end();
    } catch (err) {
      resolve({ ok: false, status: 0, error: err.message });
    }
  });
}

module.exports = { probeCouncilReady };
