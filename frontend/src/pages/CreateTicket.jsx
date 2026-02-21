import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import { ticketsApi, usersApi, firmsApi } from '../services/api';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [firms, setFirms] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    ticketPriorityId: 3,
    ticketStatusId: 1,
    firmId: '',
    assignedUserId: '',
  });

  useEffect(() => {
    usersApi.getAll().then(setUsers).catch(() => {});
    firmsApi.getAll().then(setFirms).catch(() => {});
  }, []);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        ticketPriorityId: Number(form.ticketPriorityId),
        ticketStatusId: Number(form.ticketStatusId),
        firmId: form.firmId ? Number(form.firmId) : null,
        assignedUserId: form.assignedUserId ? Number(form.assignedUserId) : null,
      };
      await ticketsApi.create(payload);
      navigate('/tickets');
    } catch (err) {
      console.error('Ticket create error:', err);
      alert('Ticket oluşturulurken hata oluştu:\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="Yeni Ticket" />

      <div className="p-6 max-w-2xl">
        <button
          onClick={() => navigate('/tickets')}
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
                placeholder="Ticket başlığı..."
                className="input-field"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Açıklama
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={update('description')}
                placeholder="Detaylı açıklama..."
                className="input-field resize-none"
              />
            </div>

            {/* Priority & Firm */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Öncelik
                </label>
                <select value={form.ticketPriorityId} onChange={update('ticketPriorityId')} className="input-field">
                  <option value={1}>Kritik</option>
                  <option value={2}>Yüksek</option>
                  <option value={3}>Normal</option>
                  <option value={4}>Düşük</option>
                </select>
              </div>
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
                    placeholder="Firma ID (opsiyonel)"
                    className="input-field"
                  />
                )}
              </div>
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
                  placeholder="Kullanıcı ID (opsiyonel)"
                  className="input-field"
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-3 bg-surface-50/50">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="btn-secondary"
            >
              İptal
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Kaydediliyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
