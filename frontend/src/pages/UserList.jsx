import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Users as UsersIcon,
  Mail,
  Phone,
  Shield,
  ChevronDown,
  Building2,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { usersApi, privilegesApi, firmsApi } from '../services/api';

const roleVariants = ['default', 'danger', 'info', 'default', 'warning', 'success', 'primary'];

const emptyForm = { name: '', mail: '', password: '', gsm: '', privilegeId: '', firmId: '' };

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [firmFilter, setFirmFilter] = useState('');
  const [privilegeFilter, setPrivilegeFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      usersApi.getAll().catch(() => []),
      privilegesApi.getAll().catch(() => []),
      firmsApi.getAll().catch(() => []),
    ])
      .then(([u, r, f]) => { setUsers(u || []); setRoles(r || []); setFirms(f || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (firmFilter && String(u.firmId) !== firmFilter) return false;
      if (privilegeFilter && String(u.privilegeId) !== privilegeFilter) return false;
      return true;
    });
  }, [users, firmFilter, privilegeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({ name: user.name, mail: user.mail, password: '', gsm: user.gsm || '', privilegeId: user.privilegeId || '', firmId: user.firmId || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        privilegeId: form.privilegeId ? Number(form.privilegeId) : null,
        firmId: form.firmId ? Number(form.firmId) : null,
      };
      if (editing) {
        await usersApi.update(editing.id, payload);
      } else {
        await usersApi.create(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      console.error('User save error:', err);
      alert('Kayıt sırasında hata oluştu:\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await usersApi.delete(id);
      load();
    } catch (err) {
      console.error('User delete error:', err);
      alert('Silme sırasında hata oluştu:\n' + err.message);
    }
  };

  const activeFilterCount = (firmFilter ? 1 : 0) + (privilegeFilter ? 1 : 0);

  return (
    <div>
      <Header title="Kullanıcılar" subtitle={`${filteredUsers.length} kullanıcı`} />

      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-surface-900">Kullanıcı Listesi</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFirmFilter(''); setPrivilegeFilter(''); }}
                  className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  Filtreleri temizle ({activeFilterCount})
                </button>
              )}
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Kullanıcı
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-surface-100 bg-surface-50/30">
            <span className="text-xs font-medium text-surface-500">Filtreler:</span>
            <div className="relative">
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="appearance-none text-xs bg-surface-0 border border-surface-200 rounded-lg pl-3 pr-7 py-1.5 text-surface-700 cursor-pointer hover:border-surface-300 transition-colors"
              >
                <option value="">Tüm Firmalar</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={privilegeFilter}
                onChange={(e) => setPrivilegeFilter(e.target.value)}
                className="appearance-none text-xs bg-surface-0 border border-surface-200 rounded-lg pl-3 pr-7 py-1.5 text-surface-700 cursor-pointer hover:border-surface-300 transition-colors"
              >
                <option value="">Tüm Yetkiler</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1.5fr_2fr_1.2fr_1fr_1fr_auto] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <span>Ad</span>
            <span>E-posta</span>
            <span>Telefon</span>
            <span>Firma</span>
            <span>Yetki</span>
            <span />
          </div>

          {/* Rows */}
          {loading ? (
            <LoadingRows />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="Kullanıcı bulunamadı"
              description={activeFilterCount > 0 ? 'Filtrelere uygun kullanıcı bulunamadı.' : 'Henüz bir kullanıcı eklenmemiş.'}
              action={
                activeFilterCount > 0 ? (
                  <button
                    onClick={() => { setFirmFilter(''); setPrivilegeFilter(''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
                  >
                    Filtreleri Temizle
                  </button>
                ) : (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni Kullanıcı Ekle
                  </button>
                )
              }
            />
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredUsers.map((user) => {
                const roleName = roles.find((r) => r.id === user.privilegeId)?.name || '-';
                const firmName = user.firm?.name || firms.find((f) => f.id === user.firmId)?.name || '-';
                const variant = roleVariants[user.privilegeId] || 'default';
                return (
                  <div key={user.id} className="grid grid-cols-[1.5fr_2fr_1.2fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700 shrink-0">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-surface-900 truncate">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-surface-600 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-surface-400" />
                      {user.mail}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-surface-600">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-surface-400" />
                      {user.gsm || '-'}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-surface-600 truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-surface-400" />
                      {firmName}
                    </div>
                    <div>
                      <Badge variant={variant}>{roleName}</Badge>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-surface-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          title={editing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Ad Soyad" required>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="E-posta" required>
              <input
                type="email"
                required
                value={form.mail}
                onChange={(e) => setForm((f) => ({ ...f, mail: e.target.value }))}
                className="input-field"
              />
            </Field>
            {!editing && (
              <Field label="Şifre" required>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input-field"
                />
              </Field>
            )}
            <Field label="Telefon">
              <input
                type="text"
                value={form.gsm}
                onChange={(e) => setForm((f) => ({ ...f, gsm: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="Firma">
              <select
                value={form.firmId}
                onChange={(e) => setForm((f) => ({ ...f, firmId: e.target.value }))}
                className="input-field"
              >
                <option value="">Seçiniz...</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Yetki">
              <select
                value={form.privilegeId}
                onChange={(e) => setForm((f) => ({ ...f, privilegeId: e.target.value }))}
                className="input-field"
              >
                <option value="">Seçiniz...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                İptal
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl border border-surface-200 shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h3 className="text-base font-semibold text-surface-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-700 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-surface-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1.5fr_2fr_1.2fr_1fr_1fr_auto] gap-3 px-5 py-3.5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-200" />
            <div className="h-4 bg-surface-200 rounded w-32" />
          </div>
          <div className="h-4 bg-surface-100 rounded w-40" />
          <div className="h-4 bg-surface-100 rounded w-24" />
          <div className="h-4 bg-surface-100 rounded w-20" />
          <div className="h-5 bg-surface-100 rounded-full w-16" />
          <div />
        </div>
      ))}
    </div>
  );
}
