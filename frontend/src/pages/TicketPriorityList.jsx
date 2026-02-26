import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, X, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { prioritiesApi } from '../services/api';

export default function TicketPriorityList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', orderNo: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    prioritiesApi.getAll().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', orderNo: '' }); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, orderNo: item.orderNo ?? '' }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, orderNo: form.orderNo ? Number(form.orderNo) : null };
      if (editing) { await prioritiesApi.update(editing.id, payload); }
      else { await prioritiesApi.create(payload); }
      setShowModal(false);
      load();
    } catch (err) { alert('Hata: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu öncelik seviyesini silmek istediğinize emin misiniz?')) return;
    try { await prioritiesApi.delete(id); load(); }
    catch (err) { alert('Silme hatası: ' + err.message); }
  };

  return (
    <div>
      <Header title="Öncelik Seviyeleri" subtitle={`${items.length} kayıt`} />
      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900">Öncelik Listesi</h2>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Yeni Öncelik
            </button>
          </div>

          {loading ? (
            <LoadingRows />
          ) : items.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Öncelik bulunamadı" description="Henüz bir öncelik seviyesi eklenmemiş."
              action={<button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"><Plus className="w-4 h-4" />Yeni Öncelik Ekle</button>}
            />
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-100 text-left text-surface-500">
                <th className="px-5 py-2.5 font-medium">ID</th>
                <th className="px-5 py-2.5 font-medium">Ad</th>
                <th className="px-5 py-2.5 font-medium">Sıra No</th>
                <th className="px-5 py-2.5 font-medium w-20"></th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-surface-50 hover:bg-surface-50/50">
                    <td className="px-5 py-3 text-surface-400">{item.id}</td>
                    <td className="px-5 py-3 font-medium text-surface-900">{item.name}</td>
                    <td className="px-5 py-3 text-surface-600">{item.orderNo ?? '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)} className="p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded transition-colors cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-surface-400 hover:text-danger hover:bg-danger/5 rounded transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-0 rounded-xl border border-surface-200 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="text-base font-semibold text-surface-900">{editing ? 'Öncelik Düzenle' : 'Yeni Öncelik'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Ad <span className="text-danger">*</span></label>
                <input type="text" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Öncelik adı..." className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Sıra No</label>
                <input type="number" value={form.orderNo} onChange={(e) => setForm(f => ({ ...f, orderNo: e.target.value }))} placeholder="Sıralama numarası" className="input-field" />
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
    <div className="p-5 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
      ))}
    </div>
  );
}
