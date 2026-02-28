import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Edit3, Trash2, X, Package, User,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { productsApi, usersApi } from '../services/api';
import AvatarUpload from '../components/AvatarUpload';

const emptyForm = { name: '', managerId: '', orderNo: '', avatarUrl: '' };

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortStack, setSortStack] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([productsApi.getAll().catch(() => []), usersApi.getAll().catch(() => [])])
      .then(([p, u]) => { setProducts(p || []); setUsers(u || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSort = (key) => {
    setSortStack((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx !== -1 && idx === prev.length - 1) {
        const next = [...prev];
        next[idx] = { key, dir: prev[idx].dir === 'asc' ? 'desc' : 'asc' };
        return next;
      }
      return [...prev.filter((s) => s.key !== key), { key, dir: 'asc' }];
    });
  };

  const sortedProducts = useMemo(() => {
    if (sortStack.length === 0) return products;
    return [...products].sort((a, b) => {
      for (let i = sortStack.length - 1; i >= 0; i--) {
        const { key, dir } = sortStack[i];
        let aVal, bVal;
        switch (key) {
          case 'id': aVal = a.id; bVal = b.id; break;
          case 'orderNo': aVal = a.orderNo ?? Infinity; bVal = b.orderNo ?? Infinity; break;
          case 'name': aVal = (a.name || '').toLowerCase(); bVal = (b.name || '').toLowerCase(); break;
          case 'manager': aVal = (a.manager?.name || '').toLowerCase(); bVal = (b.manager?.name || '').toLowerCase(); break;
          default: continue;
        }
        let cmp;
        if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
        else cmp = String(aVal).localeCompare(String(bVal), 'tr');
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [products, sortStack]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (product) => {
    setEditing(product);
    setForm({ name: product.name, managerId: product.managerId || '', orderNo: product.orderNo ?? '', avatarUrl: product.avatarUrl || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        managerId: form.managerId ? Number(form.managerId) : null,
        orderNo: form.orderNo !== '' ? Number(form.orderNo) : null,
        avatarUrl: form.avatarUrl,
      };
      if (editing) await productsApi.update(editing.id, payload);
      else await productsApi.create(payload);
      setShowModal(false); load();
    } catch (err) { alert('Hata: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try { await productsApi.delete(id); load(); } catch (err) { alert('Silme hatası: ' + err.message); }
  };

  return (
    <div>
      <Header title="Ürünler" subtitle={`${products.length} ürün`} />
      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900">Ürün Listesi</h2>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Yeni Ürün
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[0.4fr_0.4fr_1.5fr_1.5fr_auto] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <SortableHeader sortKey="id" sortStack={sortStack} onSort={handleSort}>ID</SortableHeader>
            <SortableHeader sortKey="orderNo" sortStack={sortStack} onSort={handleSort}>Sıra</SortableHeader>
            <SortableHeader sortKey="name" sortStack={sortStack} onSort={handleSort}>Ürün Adı</SortableHeader>
            <SortableHeader sortKey="manager" sortStack={sortStack} onSort={handleSort}>Sorumlu</SortableHeader>
            <span />
          </div>

          {loading ? <LoadingRows /> : sortedProducts.length === 0 ? (
            <EmptyState icon={Package} title="Ürün bulunamadı" description="Henüz bir ürün eklenmemiş."
              action={<button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"><Plus className="w-4 h-4" />Yeni Ürün Ekle</button>}
            />
          ) : (
            <div className="divide-y divide-surface-100">
              {sortedProducts.map((product) => (
                <div key={product.id} className="grid grid-cols-[0.4fr_0.4fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors">
                  <span className="text-xs font-mono text-surface-400">#{product.id}</span>
                  <span className="text-xs font-mono text-surface-400">{product.orderNo ?? '-'}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 overflow-hidden flex items-center justify-center shrink-0 border border-surface-200">
                      {product.avatarUrl ? (
                        <img src={product.avatarUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4.5 h-4.5 text-primary-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-surface-900 truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {product.manager ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 shrink-0">{product.manager.name?.charAt(0) || '?'}</div>
                        <span className="text-sm text-surface-700 truncate">{product.manager.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-surface-400 flex items-center gap-1"><User className="w-3.5 h-3.5" />Atanmadı</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(product)} className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 text-surface-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface-0 rounded-xl border border-surface-200 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="text-base font-semibold text-surface-900">{editing ? 'Ürün Düzenle' : 'Yeni Ürün'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">

              <AvatarUpload label="Ürün Logosu" value={form.avatarUrl} onChange={(url) => setForm(f => ({ ...f, avatarUrl: url }))} />

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Ürün Adı <span className="text-danger">*</span></label>
                <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ürün adını girin..." className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Sorumlu Kullanıcı</label>
                <select value={form.managerId} onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))} className="input-field">
                  <option value="">Seçiniz...</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Sıra No</label>
                <input type="number" value={form.orderNo} onChange={(e) => setForm((f) => ({ ...f, orderNo: e.target.value }))} placeholder="Sıralama numarası" className="input-field" />
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

function SortableHeader({ children, sortKey, sortStack, onSort }) {
  const current = sortStack.find((s) => s.key === sortKey);
  const isPrimary = sortStack.length > 0 && sortStack[sortStack.length - 1].key === sortKey;
  return (
    <span
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-0.5 cursor-pointer hover:text-surface-700 select-none transition-colors"
    >
      {children}
      {current ? (
        current.dir === 'asc'
          ? <ChevronUp className={`w-3 h-3 ${isPrimary ? 'text-primary-600' : 'text-surface-400'}`} />
          : <ChevronDown className={`w-3 h-3 ${isPrimary ? 'text-primary-600' : 'text-surface-400'}`} />
      ) : null}
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-surface-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[0.4fr_0.4fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3.5 animate-pulse">
          <div className="h-4 bg-surface-200 rounded w-6" />
          <div className="h-4 bg-surface-100 rounded w-6" />
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-surface-200" /><div className="h-4 bg-surface-200 rounded w-40" /></div>
          <div className="h-4 bg-surface-100 rounded w-28" />
          <div />
        </div>
      ))}
    </div>
  );
}
