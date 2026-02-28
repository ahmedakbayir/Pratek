const API_BASE = '/api';

export const authApi = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

export const userFirmsApi = {
  get: (userId) => request(`/users/${userId}/firms`),
  update: (userId, firmIds) => request(`/users/${userId}/firms`, { method: 'PUT', body: JSON.stringify({ firmIds }) }),
};

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  } catch (networkErr) {
    throw new Error('Backend bağlantı hatası: ' + networkErr.message);
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.text();
      if (body) {
        try {
          const json = JSON.parse(body);
          message = json.detail || json.error || json.title || JSON.stringify(json);
        } catch {
          // Not JSON — might be HTML; grab first meaningful line
          message = body.replace(/<[^>]*>/g, ' ').substring(0, 300).trim() || message;
        }
      } else {
        message += ' (boş response — backend http://localhost:3001 portunda çalışıyor mu?)';
      }
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  return res.json();
}

export const ticketsApi = {
  getAll: () => request('/tickets'),
  get: (id) => request(`/tickets/${id}`),
  search: (q) => request(`/tickets/search?q=${encodeURIComponent(q || '')}`),
  create: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),
  assign: (id, userId) => request(`/tickets/${id}/assign/${userId}`, { method: 'POST' }),
  changeStatus: (id, statusId) => request(`/tickets/${id}/status/${statusId}`, { method: 'POST' }),
  addLabel: (id, labelId, userId) => request(`/tickets/${id}/label/${labelId}?userId=${userId}`, { method: 'POST' }),
  removeLabel: (id, labelId, userId) => request(`/tickets/${id}/label/${labelId}?userId=${userId}`, { method: 'DELETE' }),
  getComments: (id) => request(`/tickets/${id}/comments`),
  addComment: (id, data) => request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  getActivity: (id) => request(`/tickets/${id}/activity`),
};

export const usersApi = {
  getAll: () => request('/users'),
  get: (id) => request(`/users/${id}`),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export const firmsApi = {
  getAll: () => request('/firms'),
  get: (id) => request(`/firms/${id}`),
  create: (data) => request('/firms', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/firms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/firms/${id}`, { method: 'DELETE' }),
  getProducts: (firmId) => request(`/firms/${firmId}/products`),
};

export const labelsApi = {
  getAll: () => request('/labels'),
  get: (id) => request(`/labels/${id}`),
  create: (data) => request('/labels', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/labels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/labels/${id}`, { method: 'DELETE' }),
};

export const privilegesApi = {
  getAll: () => request('/lookups/privileges'),
  create: (data) => request('/lookups/privileges', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/lookups/privileges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/lookups/privileges/${id}`, { method: 'DELETE' }),
};

export const statusesApi = {
  getAll: () => request('/lookups/ticket-statuses'),
  create: (data) => request('/lookups/ticket-statuses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/lookups/ticket-statuses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/lookups/ticket-statuses/${id}`, { method: 'DELETE' }),
};

export const prioritiesApi = {
  getAll: () => request('/lookups/ticket-priorities'),
  create: (data) => request('/lookups/ticket-priorities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/lookups/ticket-priorities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/lookups/ticket-priorities/${id}`, { method: 'DELETE' }),
};

export const productsApi = {
  getAll: () => request('/products'),
  get: (id) => request(`/products/${id}`),
  create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  addFirm: (id, firmId) => request(`/products/${id}/firms/${firmId}`, { method: 'POST' }),
  removeFirm: (id, firmId) => request(`/products/${id}/firms/${firmId}`, { method: 'DELETE' }),
};
