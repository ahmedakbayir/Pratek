const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
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
