import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import { ticketsApi, usersApi, firmsApi, statusesApi, prioritiesApi } from '../services/api';

export default function EditTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [firms, setFirms] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [form, setForm] = useState({
    title: '',
    content: '',
    priorityId: '',
    statusId: '',
    firmId: '',
    assignedUserId: '',
    productId: '',
  });

  useEffect(() => {
    Promise.all([
      ticketsApi.get(id),
      usersApi.getAll().catch(() => []),
      firmsApi.getAll().catch(() => []),
      statusesApi.getAll().catch(() => []),
      prioritiesApi.getAll().catch(() => []),
    ])
      .then(([ticket, u, f, s, p]) => {
        setForm({
          title: ticket.title || '',
          content: ticket.content || '',
          priorityId: ticket.priorityId || '',
          statusId: ticket.statusId || '',
          firmId: ticket.firmId || '',
          assignedUserId: ticket.assignedUserId || '',
          productId: ticket.productId || '',
        });
        setUsers(u);
        setFirms(f);
        setStatuses(s);
        setPriorities(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        priorityId: form.priorityId ? Number(form.priorityId) : null,
        statusId: form.statusId ? Number(form.statusId) : null,
        firmId: form.firmId ? Number(form.firmId) : null,
        assignedUserId: form.assignedUserId ? Number(form.assignedUserId) : null,
        productId: form.productId ? Number(form.productId) : null,
      };
      await ticketsApi.update(id, payload);
      navigate(`/tickets/${id}`);
    } catch (err) {
      console.error('Ticket update error:', err);
      alert('Güncelleme sırasında hata oluştu:\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Ticket Düzenle" />
        <div className="p-6 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-surface-200 rounded" />
            <div className="h-32 bg-surface-100 rounded" />
            <div className="h-10 bg-surface-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Ticket Düzenle" />

      <div className="p-6 max-w-2xl">
        <button
          onClick={() => navigate(`/tickets/${id}`)}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>

        <form onSubmit={handleSubmit} className="bg-surface-0 rounded-xl border border-surface-200 divide-y divide-surface-100">
          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Başlık <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={update('title')}
                className="input-field"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                İçerik
              </label>
              <textarea
                rows={5}
                value={form.content}
                onChange={update('content')}
                className="input-field resize-none"
              />
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Öncelik
                </label>
                <select value={form.priorityId} onChange={update('priorityId')} className="input-field">
                  <option value="">Seçiniz...</option>
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Durum
                </label>
                <select value={form.statusId} onChange={update('statusId')} className="input-field">
                  <option value="">Seçiniz...</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Firm */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Firma
              </label>
              {firms.length > 0 ? (
                <select value={form.firmId} onChange={update('firmId')} className="input-field">
                  <option value="">Seçiniz...</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={form.firmId}
                  onChange={update('firmId')}
                  placeholder="Firma ID"
                  className="input-field"
                />
              )}
            </div>

            {/* Assigned User */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Atanan Kullanıcı
              </label>
              {users.length > 0 ? (
                <select value={form.assignedUserId} onChange={update('assignedUserId')} className="input-field">
                  <option value="">Seçiniz...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={form.assignedUserId}
                  onChange={update('assignedUserId')}
                  placeholder="Kullanıcı ID"
                  className="input-field"
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-3 bg-surface-50/50">
            <button
              type="button"
              onClick={() => navigate(`/tickets/${id}`)}
              className="btn-secondary"
            >
              İptal
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Kaydediliyor...' : 'Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
