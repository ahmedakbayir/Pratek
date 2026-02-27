import { useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Building2,
} from 'lucide-react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { firmsApi } from '../services/api';

export default function FirmList() {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', orderNo: '', parentId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    firmsApi
      .getAll()
      .then(setFirms)
      .catch(() => setFirms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', orderNo: '', parentId: '' });
    setShowModal(true);
  };

  const openEdit = (firm) => {
    setEditing(firm);
    setForm({ name: firm.name, orderNo: firm.orderNo ?? '', parentId: firm.parentId || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        orderNo: form.orderNo !== '' ? Number(form.orderNo) : null,
        parentId: form.parentId ? Number(form.parentId) : null,
      };
      if (editing) {
        await firmsApi.update(editing.id, payload);
      } else {
        await firmsApi.create(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      console.error('Firm save error:', err);
      alert('Kayıt sırasında hata oluştu:\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
    try {
      await firmsApi.delete(id);
      load();
    } catch (err) {
      console.error('Firm delete error:', err);
      alert('Silme sırasında hata oluştu:\n' + err.message);
    }
  };

  // Üst firma seçenekleri: düzenleme modundayken kendisini listeden çıkar
  const parentOptions = editing
    ? firms.filter((f) => f.id !== editing.id)
    : firms;

  const getFirmParentName = (firm) => {
    if (!firm.parentId) return '-';
    const parent = firm.parent || firms.find((f) => f.id === firm.parentId);
    return parent?.name || '-';
  };

  return (
    <div>
      <Header title="Firmalar" subtitle={`${firms.length} firma`} />

      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900">Firma Listesi</h2>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Firma
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[0.5fr_2fr_2fr_auto] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <span>Sıra</span>
            <span>Firma Adı</span>
            <span>Üst Firma</span>
            <span />
          </div>

          {/* Content */}
          {loading ? (
            <LoadingRows />
          ) : firms.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Firma bulunamadı"
              description="Henüz bir firma eklenmemiş."
              action={
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Firma Ekle
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-surface-100">
              {firms.map((firm) => (
                <div
                  key={firm.id}
                  className="grid grid-cols-[0.5fr_2fr_2fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors"
                >
                  <div className="text-xs text-surface-400 font-mono">{firm.orderNo ?? '-'}</div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-4.5 h-4.5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">{firm.name}</div>
                      <div className="text-xs text-surface-400 font-mono">#{firm.id}</div>
                    </div>
                  </div>
                  <div className="text-sm text-surface-600 truncate">
                    {getFirmParentName(firm)}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEdit(firm)}
                      className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(firm.id)}
                      className="p-1.5 text-surface-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-0 rounded-xl border border-surface-200 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="text-base font-semibold text-surface-900">
                {editing ? 'Firma Düzenle' : 'Yeni Firma'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Firma Adı <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Firma adını girin..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Üst Firma
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Yok (Ana firma)</option>
                  {parentOptions.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Sıra No
                </label>
                <input
                  type="number"
                  value={form.orderNo}
                  onChange={(e) => setForm((f) => ({ ...f, orderNo: e.target.value }))}
                  placeholder="Sıralama numarası"
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  İptal
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-surface-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[0.5fr_2fr_2fr_auto] gap-3 px-5 py-3.5 animate-pulse">
          <div className="h-4 bg-surface-100 rounded w-8" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-200" />
            <div className="space-y-1.5">
              <div className="h-4 bg-surface-200 rounded w-24" />
              <div className="h-3 bg-surface-100 rounded w-10" />
            </div>
          </div>
          <div className="h-4 bg-surface-100 rounded w-28" />
          <div />
        </div>
      ))}
    </div>
  );
}
