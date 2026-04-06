/**
 * Dev-only: leitet /api an primäres Backend; bei Verbindungsfehler automatisch an Fallback.
 * Verhindert „Login fehlgeschlagen“, wenn nur das lokale Backend aus ist.
 */
import type { Plugin } from 'vite';
import type { IncomingMessage } from 'node:http';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL as NodeURL } from 'node:url';

const BODY_LIMIT = 10 * 1024 * 1024;

function hasBearerAuth(headers: http.IncomingHttpHeaders): boolean {
  const a = headers.authorization;
  if (!a || typeof a !== 'string') return false;
  return /^Bearer\s+/i.test(a.trim());
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > BODY_LIMIT) {
        reject(new Error('Body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function forwardRequest(
  baseUrl: string,
  method: string | undefined,
  pathWithQuery: string,
  headers: http.IncomingHttpHeaders,
  body: Buffer
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const target = new NodeURL(baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl);
    const isHttps = target.protocol === 'https:';
    const lib = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 80;
    const port = target.port ? Number(target.port) : defaultPort;

    const outHeaders: http.OutgoingHttpHeaders = { ...headers };
    outHeaders.host = target.host;
    if (body.length > 0) {
      outHeaders['content-length'] = String(body.length);
    } else {
      delete outHeaders['content-length'];
    }
    delete outHeaders.connection;

    const opts: http.RequestOptions = {
      protocol: target.protocol,
      hostname: target.hostname,
      port,
      path: pathWithQuery,
      method: method || 'GET',
      headers: outHeaders,
    };

    const preq = lib.request(opts, (pres) => {
      const bufs: Buffer[] = [];
      pres.on('data', (c: Buffer) => bufs.push(c));
      pres.on('end', () => {
        resolve({
          statusCode: pres.statusCode || 500,
          headers: pres.headers,
          body: Buffer.concat(bufs),
        });
      });
    });
    preq.setTimeout(25_000, () => {
      preq.destroy();
      reject(new Error('Proxy timeout'));
    });
    preq.on('error', reject);
    if (body.length) preq.write(body);
    preq.end();
  });
}

export function apiProxyWithFallbackPlugin(opts: { primary: string; fallback: string }): Plugin {
  return {
    name: 'api-proxy-with-fallback',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api')) {
          next();
          return;
        }

        try {
          const body = await readBody(req);
          let response;
          try {
            response = await forwardRequest(opts.primary, req.method, url, req.headers, body);
          } catch (e) {
            const msg = (e as Error).message;
            if (opts.primary === opts.fallback) {
              throw e;
            }
            console.warn(
              `[vite] API proxy: primary failed (${msg}), trying fallback ${opts.fallback}` +
                (hasBearerAuth(req.headers) ? ' (JWT kann vom Test-Server stammen)' : '')
            );
            response = await forwardRequest(opts.fallback, req.method, url, req.headers, body);
          }

          /**
           * JWT wurde z. B. gegen den Fallback (Test) ausgestellt, primäres Backend (lokal) läuft
           * und antwortet mit 401 — gleichen Request einmal am Fallback wiederholen.
           */
          if (
            response.statusCode === 401 &&
            opts.primary !== opts.fallback &&
            hasBearerAuth(req.headers)
          ) {
            console.warn(
              '[vite] API proxy: primary returned 401 with Bearer — retrying fallback (Session evtl. vom Test-Server)'
            );
            response = await forwardRequest(opts.fallback, req.method, url, req.headers, body);
          }

          res.statusCode = response.statusCode;
          for (const [k, v] of Object.entries(response.headers)) {
            if (v === undefined || k === 'transfer-encoding') continue;
            if (k === 'content-length') continue;
            if (Array.isArray(v)) res.setHeader(k, v);
            else res.setHeader(k, v);
          }
          res.setHeader('content-length', String(response.body.length));
          res.end(response.body);
        } catch (err) {
          console.error('[vite] API proxy: primary and fallback failed:', err);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              detail:
                'API nicht erreichbar. Bitte Backend starten (z. B. docker compose up) oder Netzwerk prüfen.',
            })
          );
        }
      });
    },
  };
}
