// Same-origin by default (the backend serves this SPA). Override with
// VITE_API_URL at build time for a split deploy (e.g. SPA on Cloudflare Pages,
// API on a separate origin) — e.g. VITE_API_URL=https://api.example.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Pluggable auth so the same client works for both providers:
//  • legacy JWT  — reads the token from localStorage (default below)
//  • Clerk       — ClerkAuthBridge registers Clerk's getToken() at runtime
let tokenGetter = async () => localStorage.getItem('crm_token');
let unauthorizedHandler = () => {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
  window.location.href = '/login';
};

export function setTokenGetter(fn) { tokenGetter = fn; }
export function setUnauthorizedHandler(fn) { unauthorizedHandler = fn; }

async function request(endpoint, options = {}) {
  const token = await tokenGetter();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    unauthorizedHandler();
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
