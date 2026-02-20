import { useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Users as UsersIcon,
  Mail,
  Phone,
  Shield,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { usersApi } from '../services/api';

const roleConfig = {
  1: { label: 'Admin', variant: 'danger' },
  2: { label: 'Agent', variant: 'info' },
  3: { label: 'Müşteri', variant: 'default' },
};

const emptyForm = { name: '', mail: '', password: '', tel: '', roleId: 2 };

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    usersApi
      .getAll()
      .then(setUsers)
      .catch(() => setUsers(demoUsers))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({ name: user.name, mail: user.mail, password: '', tel: user.tel, roleId: user.roleId });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, roleId: Number(form.roleId) };
      if (editing) {
        await usersApi.update(editing.id, payload);
      } else {
        await usersApi.create(payload);
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
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await usersApi.delete(id);
      load();
    } catch {
      alert('Silme sırasında hata oluştu.');
    }
  };

  const data = users.length > 0 ? users : demoUsers;

  return (
    <div>
      <Header title="Kullanıcılar" subtitle={`${data.length} kullanıcı`} />

      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900">Kullanıcı Listesi</h2>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Kullanıcı
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_200px_140px_120px_80px] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <span>Ad</span>
            <span>E-posta</span>
            <span>Telefon</span>
            <span>Rol</span>
            <span />
          </div>

          {/* Rows */}
          {loading ? (
            <LoadingRows />
          ) : data.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="Kullanıcı bulunamadı"
              description="Henüz bir kullanıcı eklenmemiş."
              action={
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Kullanıcı Ekle
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-surface-100">
              {data.map((user) => {
                const role = roleConfig[user.roleId] || roleConfig[2];
                return (
                  <div key={user.id} className="grid grid-cols-[1fr_200px_140px_120px_80px] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors">
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
                      {user.tel || '-'}
                    </div>
                    <div>
                      <Badge variant={role.variant}>{role.label}</Badge>
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
                value={form.tel}
                onChange={(e) => setForm((f) => ({ ...f, tel: e.target.value }))}
                className="input-field"
              />
            </Field>
            <Field label="Rol">
              <select
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                className="input-field"
              >
                <option value={1}>Admin</option>
                <option value={2}>Agent</option>
                <option value={3}>Müşteri</option>
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
        <div key={i} className="grid grid-cols-[1fr_200px_140px_120px_80px] gap-3 px-5 py-3.5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-200" />
            <div className="h-4 bg-surface-200 rounded w-32" />
          </div>
          <div className="h-4 bg-surface-100 rounded w-40" />
          <div className="h-4 bg-surface-100 rounded w-24" />
          <div className="h-5 bg-surface-100 rounded-full w-16" />
          <div />
        </div>
      ))}
    </div>
  );
}

const demoUsers = [
  { id: 1, name: 'Admin', mail: 'admin@protekh.com', tel: '0532 111 2233', roleId: 1 },
  { id: 2, name: 'Ahmet Yılmaz', mail: 'ahmet@protekh.com', tel: '0533 222 3344', roleId: 2 },
  { id: 3, name: 'Elif Kaya', mail: 'elif@protekh.com', tel: '0534 333 4455', roleId: 2 },
  { id: 4, name: 'Mehmet Demir', mail: 'mehmet@protekh.com', tel: '0535 444 5566', roleId: 3 },
  { id: 5, name: 'Zeynep Çelik', mail: 'zeynep@protekh.com', tel: '0536 555 6677', roleId: 3 },
];
