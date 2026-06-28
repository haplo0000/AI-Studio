const http = require('http');
const https = require('https');

function probeUrl(urlString, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlString);
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        url,
        { method: 'GET', timeout: timeoutMs },
        (res) => {
          res.resume();
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 500,
            status: res.statusCode || 0,
            error: res.statusCode >= 200 && res.statusCode < 500 ? undefined : `HTTP ${res.statusCode}`,
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

module.exports = { probeUrl };
