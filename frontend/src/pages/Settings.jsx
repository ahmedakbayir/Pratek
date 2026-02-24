import { useState } from 'react';
import { Save, Bell, Globe, Palette, Shield } from 'lucide-react';
import Header from '../components/Header';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'Pratek',
    language: 'tr',
    emailNotifications: true,
    ticketNotifications: true,
    assignNotifications: true,
    theme: 'light',
  });

  const update = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings((s) => ({ ...s, [key]: val }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <Header title="Ayarlar" subtitle="Sistem yapılandırması" />

      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          {/* General */}
          <Section icon={Globe} title="Genel">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Site Adı
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={update('siteName')}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Dil
                </label>
                <select value={settings.language} onChange={update('language')} className="input-field">
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Notifications */}
          <Section icon={Bell} title="Bildirimler">
            <div className="space-y-3">
              <Toggle
                label="E-posta bildirimleri"
                description="Yeni ticket ve güncellemeler için e-posta gönder"
                checked={settings.emailNotifications}
                onChange={update('emailNotifications')}
              />
              <Toggle
                label="Ticket bildirimleri"
                description="Ticket oluşturulduğunda bildirim al"
                checked={settings.ticketNotifications}
                onChange={update('ticketNotifications')}
              />
              <Toggle
                label="Atama bildirimleri"
                description="Sana ticket atandığında bildirim al"
                checked={settings.assignNotifications}
                onChange={update('assignNotifications')}
              />
            </div>
          </Section>

          {/* Appearance */}
          <Section icon={Palette} title="Görünüm">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Tema
              </label>
              <select value={settings.theme} onChange={update('theme')} className="input-field">
                <option value="light">Açık</option>
                <option value="dark">Koyu</option>
                <option value="system">Sistem</option>
              </select>
            </div>
          </Section>

          {/* About */}
          <Section icon={Shield} title="Hakkında">
            <div className="space-y-2 text-sm text-surface-600">
              <p><span className="font-medium text-surface-900">Versiyon:</span> 1.0.0</p>
              <p><span className="font-medium text-surface-900">Platform:</span> Pratek Ticket Management</p>
              <p><span className="font-medium text-surface-900">Framework:</span> ASP.NET Core + React</p>
            </div>
          </Section>

          {/* Save */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="text-sm text-success font-medium">Kaydedildi!</span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-surface-0 rounded-xl border border-surface-200">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-surface-200">
        <Icon className="w-4 h-4 text-surface-400" />
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-surface-900">{label}</p>
        <p className="text-xs text-surface-500">{description}</p>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-surface-300 rounded-full peer-checked:bg-primary-600 transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
      </div>
    </label>
  );
}
