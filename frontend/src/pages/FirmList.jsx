import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Building2,
  Search,
} from 'lucide-react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { firmsApi } from '../services/api';
import AvatarUpload from '../components/AvatarUpload';

export default function FirmList() {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', orderNo: '', parentId: '', version: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    firmsApi.getAll().then(setFirms).catch(() => setFirms([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getFirmParentName = (firm) => {
    if (!firm.parentId) return '-';
    const parent = firm.parent || firms.find((f) => f.id === firm.parentId);
    return parent?.name || '-';
  };

  const filteredFirms = useMemo(() => {
    if (!search.trim()) return firms;
    const q = search.toLowerCase();
    return firms.filter((f) => {
      const parentName = getFirmParentName(f).toLowerCase();
      return (
        String(f.id).includes(q) ||
        (f.name || '').toLowerCase().includes(q) ||
        parentName.includes(q) ||
        String(f.orderNo ?? '').includes(q) ||
        String(f.version ?? '').includes(q)
      );
    });
  }, [firms, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', orderNo: '', parentId: '', version: '' });
    setShowModal(true);
  };

  const openEdit = (firm) => {
    setEditing(firm);
    setForm({ name: firm.name, orderNo: firm.orderNo ?? '', parentId: firm.parentId || '', version: firm.version ?? '',avatarUrl: firm.avatarUrl || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        avatarUrl: form.avatarUrl, // State'e eklenmeli
        orderNo: form.orderNo !== '' ? Number(form.orderNo) : null,
        parentId: form.parentId ? Number(form.parentId) : null,
        version: form.version !== '' ? Number(form.version) : null,
      };
      if (editing) await firmsApi.update(editing.id, payload);
      else await firmsApi.create(payload);
      setShowModal(false);
      load();
    } catch (err) {
      alert('Hata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
    try { await firmsApi.delete(id); load(); }
    catch (err) { alert('Silme hatası: ' + err.message); }
  };

  const parentOptions = editing ? firms.filter((f) => f.id !== editing.id) : firms;

  return (
    <div>
      <Header title="Firmalar" subtitle={`${filteredFirms.length} firma`} />
      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900 mr-2">Firma Listesi</h2>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Firma Ara..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-surface-200 rounded-lg bg-surface-0 text-surface-700 placeholder:text-surface-400 focus:outline-none focus:border-primary-400 w-48"
                />
              </div>
              <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Yeni Firma
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[0.4fr_0.4fr_2fr_2fr_0.6fr_auto] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <span>ID</span>
            <span>Sıra</span>
            <span>Firma Adı</span>
            <span>Üst Firma</span>
            <span>Versiyon</span>
            <span />
          </div>

          {loading ? <LoadingRows /> : filteredFirms.length === 0 ? (
            <EmptyState icon={Building2} title="Firma bulunamadı" description={search ? 'Arama kriterine uygun firma bulunamadı.' : 'Henüz bir firma eklenmemiş.'}
              action={!search && <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"><Plus className="w-4 h-4" />Yeni Firma Ekle</button>}
            />
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredFirms.map((firm) => (
                <div key={firm.id} className="grid grid-cols-[0.4fr_0.4fr_2fr_2fr_0.6fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors">
                  <div className="text-xs text-surface-400 font-mono">#{firm.id}</div>
                  <div className="text-xs text-surface-400 font-mono">{firm.orderNo ?? '-'}</div>
                  <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 overflow-hidden flex items-center justify-center shrink-0">
                        {firm.avatarUrl ? (
                          <img src={firm.avatarUrl} alt={firm.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-4.5 h-4.5 text-primary-600" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-surface-900 truncate">{firm.name}</span>
                    </div>
                  <div className="text-sm text-surface-600 truncate">{getFirmParentName(firm)}</div>
                  <div className="text-xs text-surface-600 font-mono">{firm.version ?? '-'}</div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(firm)} className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(firm.id)} className="p-1.5 text-surface-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h3 className="text-base font-semibold text-surface-900">{editing ? 'Firma Düzenle' : 'Yeni Firma'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">

              <AvatarUpload label="Firma Logosu" value={form.avatarUrl} onChange={(url) => setForm(f => ({ ...f, avatarUrl: url }))} />
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Firma Adı <span className="text-danger">*</span></label>
                <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Firma adını girin..." className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Üst Firma</label>
                <select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))} className="input-field">
                  <option value="">Yok (Ana firma)</option>
                  {parentOptions.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Sıra No</label>
                  <input type="number" value={form.orderNo} onChange={(e) => setForm((f) => ({ ...f, orderNo: e.target.value }))} placeholder="Sıra" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Versiyon</label>
                  <input type="number" min="0" max="255" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="0-255" className="input-field" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Oluştur'}</button>
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
        <div key={i} className="grid grid-cols-[0.4fr_0.4fr_2fr_2fr_0.6fr_auto] gap-3 px-5 py-3.5 animate-pulse">
          <div className="h-4 bg-surface-100 rounded w-6" />
          <div className="h-4 bg-surface-100 rounded w-6" />
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-surface-200" /><div className="h-4 bg-surface-200 rounded w-24" /></div>
          <div className="h-4 bg-surface-100 rounded w-28" />
          <div className="h-4 bg-surface-100 rounded w-8" />
          <div />
        </div>
      ))}
    </div>
  );
}
