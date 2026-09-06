import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || process.argv[2] || 4173);
const root = new URL('../dist/', import.meta.url).pathname;
const appRoutes = new Set(['/', '/demo', '/session', '/complete', '/history', '/rules', '/data', '/plus', '/privacy', '/terms']);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.webmanifest', 'application/manifest+json'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.webp', 'image/webp'], ['.xml', 'application/xml; charset=utf-8'], ['.txt', 'text/plain; charset=utf-8']
]);
const csp = "default-src 'self'; base-uri 'self'; connect-src 'self' https://api.sociobot.in; font-src 'self'; frame-ancestors 'none'; img-src 'self'; manifest-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'";

function sendFile(response, path, status = 200) {
  response.writeHead(status, {
    'Content-Type': types.get(extname(path)) || 'application/octet-stream',
    'Content-Security-Policy': csp,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Vary': 'Origin',
    'Cache-Control': /\/assets\/index-.*\.(?:js|css)$/.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=30, must-revalidate'
  });
  createReadStream(path).pipe(response);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', `http://${request.headers.host}`).pathname).replace(/\/$/, '') || '/';
  if (appRoutes.has(pathname)) {
    sendFile(response, join(root, 'index.html'));
    return;
  }
  const relative = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^\//, '');
  const file = join(root, relative);
  if (relative && file.startsWith(root) && existsSync(file)) {
    sendFile(response, file);
    return;
  }
  sendFile(response, join(root, '404.html'), 404);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving dist at http://127.0.0.1:${port}\n`);
});
