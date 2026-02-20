import { useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Tags as TagsIcon,
} from 'lucide-react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { tagsApi } from '../services/api';

const defaultColors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#6B7280'];

export default function TagList() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', colorHex: '#3B82F6' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    tagsApi
      .getAll()
      .then(setTags)
      .catch(() => setTags([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', colorHex: '#3B82F6' });
    setShowModal(true);
  };

  const openEdit = (tag) => {
    setEditing(tag);
    setForm({ name: tag.name, description: tag.description || '', colorHex: tag.colorHex || '#3B82F6' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await tagsApi.update(editing.id, form);
      } else {
        await tagsApi.create(form);
      }
      setShowModal(false);
      load();
    } catch {
      alert('Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu etiketi silmek istediğinize emin misiniz?')) return;
    try {
      await tagsApi.delete(id);
      load();
    } catch {
      alert('Silme sırasında hata oluştu.');
    }
  };

  return (
    <div>
      <Header title="Etiketler" subtitle={`${tags.length} etiket`} />

      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900">Etiket Listesi</h2>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Etiket
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <LoadingGrid />
          ) : tags.length === 0 ? (
            <EmptyState
              icon={TagsIcon}
              title="Etiket bulunamadı"
              description="Henüz bir etiket eklenmemiş."
              action={
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Etiket Ekle
                </button>
              }
            />
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-start gap-3 p-4 rounded-xl border border-surface-200 hover:border-surface-300 transition-colors bg-surface-0"
                >
                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: tag.colorHex || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-surface-900">{tag.name}</h3>
                    {tag.description && (
                      <p className="text-xs text-surface-500 mt-0.5 truncate">{tag.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(tag)}
                      className="p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-1 text-surface-400 hover:text-danger hover:bg-danger/5 rounded transition-colors cursor-pointer"
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
                {editing ? 'Etiket Düzenle' : 'Yeni Etiket'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Etiket Adı <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Etiket adı..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Açıklama
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Kısa açıklama..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Renk
                </label>
                <div className="flex items-center gap-2">
                  {defaultColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, colorHex: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        form.colorHex === c ? 'border-surface-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.colorHex}
                    onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                    className="w-7 h-7 rounded border-0 cursor-pointer"
                  />
                </div>
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

function LoadingGrid() {
  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-surface-200 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-surface-200" />
            <div className="h-4 bg-surface-200 rounded w-24" />
          </div>
          <div className="h-3 bg-surface-100 rounded w-40 mt-2 ml-6" />
        </div>
      ))}
    </div>
  );
}
