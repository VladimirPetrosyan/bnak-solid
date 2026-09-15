export function resolveApiBase(env) {
  const raw = (env.VITE_API_URL || '').trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (env.DEV) return 'http://localhost:8080';
  return '';
}

export const API_BASE = resolveApiBase(import.meta.env);

let token = null;
export function setAuthToken(t) {
  token = t;
}
export function getAuthToken() {
  return token;
}

let apiLang = null;
export function setApiLang(l) {
  apiLang = l;
}

export function fileURL(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path) || path.startsWith('blob:')) return path;
  return API_BASE + path;
}

async function request(method, path, { json, form, headers: extraHeaders } = {}) {
  const headers = { ...extraHeaders };
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (apiLang) headers['X-Lang'] = apiLang;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: form ? form : json !== undefined ? JSON.stringify(json) : undefined
    });
  } catch {
    throw new ApiError('network', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new ApiError((data && data.error) || `http_${res.status}`, res.status, data && data.retryAfter);
  }
  return data;
}

export class ApiError extends Error {
  constructor(code, status, retryAfter) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfter = typeof retryAfter === 'number' ? retryAfter : undefined;
  }
}

async function requestBlob(path) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(API_BASE + path, { headers });
  } catch {
    throw new ApiError('network', 0);
  }
  if (!res.ok) throw new ApiError('http_' + res.status, res.status);
  return res.blob();
}

export const api = {
  get: (path, headers) => request('GET', path, { headers }),
  post: (path, json) => request('POST', path, { json }),
  put: (path, json) => request('PUT', path, { json }),
  del: (path) => request('DELETE', path),
  upload: (path, form) => request('POST', path, { form }),
  blob: (path) => requestBlob(path)
};
