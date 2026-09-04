import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { routes } from './handlers';
import { ApiError, notFound } from './errors';

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    const v = decodeURIComponent(pathParts[i]);
    if (p.startsWith(':')) params[p.slice(1)] = v;
    else if (p !== v) return null;
  }
  return params;
}

function findRoute(method: string, path: string) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, path);
    if (params) return { route, params };
  }
  return null;
}

/** Simulated network latency so loading states in the UI are visible, like a real API. */
const LATENCY_MS = 120;

export const mockAdapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const url = (config.url ?? '').split('?')[0];
        const method = (config.method ?? 'get').toUpperCase();
        const query: Record<string, string | undefined> = {};
        if (config.params) {
          for (const [k, v] of Object.entries(config.params as Record<string, unknown>)) {
            if (v !== undefined && v !== null) query[k] = String(v);
          }
        }
        let body: any = config.data;
        if (typeof body === 'string') {
          try { body = JSON.parse(body); } catch { /* leave as-is */ }
        }
        body = body ?? {};

        const found = findRoute(method, url);
        if (!found) {
          reject(makeAxiosError(notFound(), config));
          return;
        }
        const data = found.route.handler({ params: found.params, query, body });
        resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        });
      } catch (err) {
        if (err instanceof ApiError) {
          reject(makeAxiosError(err, config));
        } else {
          console.error('Mock API handler threw an unexpected error:', err);
          reject(makeAxiosError(new ApiError(500, { message: 'Internal mock API error' }), config));
        }
      }
    }, LATENCY_MS);
  });
};

function makeAxiosError(err: ApiError, config: InternalAxiosRequestConfig) {
  const axiosError: any = new Error(err.message);
  axiosError.isAxiosError = true;
  axiosError.config = config;
  axiosError.response = { data: err.body, status: err.status, statusText: '', headers: {}, config };
  return axiosError;
}
