import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import { ticketsApi, usersApi, firmsApi, statusesApi, prioritiesApi } from '../services/api';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [firms, setFirms] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [firmProducts, setFirmProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
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
    usersApi.getAll().then(setUsers).catch(() => {});
    firmsApi.getAll().then(setFirms).catch(() => {});
    statusesApi.getAll().then(setStatuses).catch(() => {});
    prioritiesApi.getAll().then(setPriorities).catch(() => {});
  }, []);

  // When firm changes, fetch products for that firm
  useEffect(() => {
    if (!form.firmId) {
      setFirmProducts([]);
      return;
    }
    setLoadingProducts(true);
    firmsApi.getProducts(form.firmId)
      .then(setFirmProducts)
      .catch((err) => { console.error('Firma ürünleri yüklenemedi:', err); setFirmProducts([]); })
      .finally(() => setLoadingProducts(false));
  }, [form.firmId]);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFirmChange = (e) => {
    const newFirmId = e.target.value;
    setForm((prev) => ({ ...prev, firmId: newFirmId, productId: '' }));
  };

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
      await ticketsApi.create(payload);
      navigate('/tickets');
    } catch (err) {
      console.error('Ticket create error:', err);
      alert('Ticket oluşturulurken hata oluştu:\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const productDisabled = !form.firmId;

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

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                İçerik
              </label>
              <textarea
                rows={5}
                value={form.content}
                onChange={update('content')}
                placeholder="Detaylı açıklama..."
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
                Firma (Bölge)
              </label>
              {firms.length > 0 ? (
                <select value={form.firmId} onChange={handleFirmChange} className="input-field">
                  <option value="">Seçiniz...</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={form.firmId}
                  onChange={handleFirmChange}
                  placeholder="Firma ID (opsiyonel)"
                  className="input-field"
                />
              )}
            </div>

            {/* Product - depends on firm selection */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Ürün
                {productDisabled && (
                  <span className="ml-2 text-xs font-normal text-surface-400">Önce firma seçiniz</span>
                )}
              </label>
              <select
                value={form.productId}
                onChange={update('productId')}
                disabled={productDisabled}
                className={`input-field ${productDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {loadingProducts ? 'Yükleniyor...' : productDisabled ? 'Önce firma seçin' : 'Seçiniz...'}
                </option>
                {firmProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {form.firmId && !loadingProducts && firmProducts.length === 0 && (
                <p className="mt-1 text-xs text-surface-400">Bu firmaya tanımlı ürün bulunamadı.</p>
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
