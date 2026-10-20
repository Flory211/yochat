import http from 'node:http';
import https from 'node:https';
import { pathToFileURL } from 'node:url';

const DEFAULT_UPSTREAM = 'https://yochat.leogushinets.workers.dev';
const HOP_HEADERS = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];

function endToEndHeaders(headers) {
  const clean = { ...headers };
  const connectionHeaders = String(headers.connection || '').toLowerCase().split(',').map(name => name.trim());
  for (const name of [...HOP_HEADERS, ...connectionHeaders]) delete clean[name];
  return clean;
}

export function createGateway({ upstream = DEFAULT_UPSTREAM } = {}) {
  const origin = new URL(upstream);
  const localHttp = origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  if ((!localHttp && origin.protocol !== 'https:') || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('UPSTREAM_URL must be an HTTPS origin (HTTP allowed only for local testing)');
  }
  const transport = origin.protocol === 'https:' ? https : http;
  return http.createServer((req, res) => {
    if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
    // Always use the configured origin; never accept a client-supplied proxy destination.
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) { res.writeHead(400); res.end('Bad request'); return; }
    const headers = endToEndHeaders(req.headers);
    headers.host = origin.host;
    delete headers['forwarded'];
    for (const name of Object.keys(headers)) if (name.startsWith('x-forwarded-') || name.startsWith('cf-')) delete headers[name];
    const proxy = transport.request(origin, { method: req.method, path: req.url, headers }, incoming => {
      const responseHeaders = endToEndHeaders(incoming.headers);
      if (req.url === '/api' || req.url.startsWith('/api/')) responseHeaders['cache-control'] = 'no-store';
      // Keep same-origin redirects on the public gateway address.
      if (typeof responseHeaders.location === 'string' && responseHeaders.location.startsWith(origin.origin + '/')) {
        responseHeaders.location = responseHeaders.location.slice(origin.origin.length);
      }
      res.writeHead(incoming.statusCode || 502, responseHeaders);
      incoming.on('error', () => res.destroy());
      incoming.pipe(res);
    });
    proxy.setTimeout(30000, () => proxy.destroy(new Error('Upstream timeout')));
    proxy.on('error', () => {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      const api = req.url === '/api' || req.url.startsWith('/api/');
      res.writeHead(502, { 'Content-Type': api ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(api ? JSON.stringify({ error: 'Сервер чата временно недоступен. Попробуйте позже.' }) : '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ЁЧат</title><h1>ЁЧат</h1><p>Сервер чата временно недоступен. Обновите страницу немного позже.</p></html>');
    });
    req.on('aborted', () => proxy.destroy());
    req.on('error', () => proxy.destroy());
    res.on('close', () => { if (!res.writableEnded) proxy.destroy(); });
    req.pipe(proxy);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createGateway({ upstream: process.env.UPSTREAM_URL || DEFAULT_UPSTREAM });
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0', () => console.log('ЁЧат: gateway listening on port', server.address().port));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(); setTimeout(() => process.exit(0), 5000).unref(); });
}
