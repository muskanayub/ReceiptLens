const TOKEN_KEY = 'receiptlens_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

function handleExpired(res, token) {
  // An expired session while signed in sends the person back to the sign-in screen
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('receiptlens:logout'));
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { ...options, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleExpired(res, token);
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// For images and file downloads, which need the auth header and so cannot be plain <img src> or links
async function requestBlob(path) {
  const token = getToken();
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    handleExpired(res, token);
    throw new Error('Could not load the file');
  }
  return res.blob();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  blob: requestBlob,
};
