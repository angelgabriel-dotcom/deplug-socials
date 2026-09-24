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
  // Auth
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, username, email, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, username, email, password }) }),
  me: (token) => request('/api/auth/me', { token }),
  updateProfile: (token, name, username) => request('/api/auth/profile', { method: 'PATCH', token, body: JSON.stringify({ name, username }) }),
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Listings
  getListings: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') searchParams.append(key, val);
    });
    const query = searchParams.toString();
    return request(`/api/listings${query ? `?${query}` : ''}`);
  },
  getListing: (id) => request(`/api/listings/${id}`),

  // Payments
  initializePaystack: (orderData, token) => request('/api/payments/paystack/initialize', {
    method: 'POST',
    token,
    body: JSON.stringify(orderData),
  }),
  verifyPaystack: (reference, token) => request(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`, { method: 'POST', token }),
  getMyOrders: (token) => request('/api/orders/me', { token }),
  getOrderByReference: (reference, token) => request(`/api/orders/reference/${reference}`, { token }),

  // Admin
  getAdminOrders: (token) => request('/api/admin/orders', { token }),
  getAdminListings: (token) => request('/api/admin/listings', { token }),
  createAdminListing: (token, listing) => request('/api/admin/listings', { method: 'POST', token, body: JSON.stringify(listing) }),
  updateAdminListing: (token, id, listing) => request(`/api/admin/listings/${id}`, { method: 'PATCH', token, body: JSON.stringify(listing) }),
  updateOrderStatus: (token, id, deliveryStatus) => request(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ deliveryStatus }),
  }),
};
