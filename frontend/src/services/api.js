const API_BASE = '/api';

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
  create: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),
  assign: (id, userId) => request(`/tickets/${id}/assign/${userId}`, { method: 'POST' }),
  changeStatus: (id, statusId) => request(`/tickets/${id}/status/${statusId}`, { method: 'POST' }),
  addTag: (id, tagId, userId) => request(`/tickets/${id}/tag/${tagId}?userId=${userId}`, { method: 'POST' }),
  removeTag: (id, tagId, userId) => request(`/tickets/${id}/tag/${tagId}?userId=${userId}`, { method: 'DELETE' }),
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
};

export const tagsApi = {
  getAll: () => request('/tags'),
  get: (id) => request(`/tags/${id}`),
  create: (data) => request('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
};

export const rolesApi = {
  getAll: () => request('/roles'),
};

export const statusesApi = {
  getAll: () => request('/ticket-statuses'),
};

export const prioritiesApi = {
  getAll: () => request('/ticket-priorities'),
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
