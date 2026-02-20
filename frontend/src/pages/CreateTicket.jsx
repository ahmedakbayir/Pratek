import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import { ticketsApi } from '../services/api';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    ticketPriorityId: 3,
    ticketStatusId: 1,
    firmId: '',
    assignedUserId: '',
  });

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
    } catch {
      alert('Ticket oluşturulurken hata oluştu.');
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
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
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
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-surface-0 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Öncelik
                </label>
                <select
                  value={form.ticketPriorityId}
                  onChange={update('ticketPriorityId')}
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                >
                  <option value={1}>Kritik</option>
                  <option value={2}>Yüksek</option>
                  <option value={3}>Normal</option>
                  <option value={4}>Düşük</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Firma ID
                </label>
                <input
                  type="number"
                  value={form.firmId}
                  onChange={update('firmId')}
                  placeholder="Opsiyonel"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {/* Assigned User */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Atanan Kullanıcı ID
              </label>
              <input
                type="number"
                value={form.assignedUserId}
                onChange={update('assignedUserId')}
                placeholder="Opsiyonel"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-3 bg-surface-50/50">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-4 py-2 text-sm font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Kaydediliyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
