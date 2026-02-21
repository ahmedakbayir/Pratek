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
  const [form, setForm] = useState({ name: '' });
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
    setForm({ name: '' });
    setShowModal(true);
  };

  const openEdit = (firm) => {
    setEditing(firm);
    setForm({ name: firm.name });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await firmsApi.update(editing.id, form);
      } else {
        await firmsApi.create(form);
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
          <div className="grid grid-cols-[auto_1fr_80px] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <span className="w-10">ID</span>
            <span>Firma Adı</span>
            <span />
          </div>

          {/* Rows */}
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
                <div key={firm.id} className="grid grid-cols-[auto_1fr_80px] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors">
                  <span className="text-xs font-mono text-surface-400 w-10">#{firm.id}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-surface-900 truncate">{firm.name}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
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
            <form onSubmit={handleSave} className="px-6 py-5">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Firma Adı <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder="Firma adını girin..."
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-5">
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
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_80px] gap-3 px-5 py-3.5 animate-pulse">
          <div className="h-4 bg-surface-200 rounded w-8" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-200" />
            <div className="h-4 bg-surface-200 rounded w-40" />
          </div>
          <div />
        </div>
      ))}
    </div>
  );
}
