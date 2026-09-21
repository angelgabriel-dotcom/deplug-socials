async function request(path, { token, ...options } = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Something went wrong. Please try again.');
  return body;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, username, email, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, username, email, password }) }),
  me: (token) => request('/api/auth/me', { token }),
  updateProfile: (token, name, username) => request('/api/auth/profile', { method: 'PATCH', token, body: JSON.stringify({ name, username }) }),
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),
};
