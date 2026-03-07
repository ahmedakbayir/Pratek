import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  Package,
  Grid3x3,
  Tags,
  Settings,
  Shield,
  AlertTriangle,
  CircleDot,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navSections = [
  {
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Ana Sayfa', access: 'nonRestricted' },
      { to: '/tickets', icon: Ticket, label: "Ticket'lar", access: 'all' },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { to: '/users', icon: Users, label: 'Kullanıcılar', access: 'viewable' },
      { to: '/firms', icon: Building2, label: 'Firmalar', access: 'viewable' },
      { to: '/products', icon: Package, label: 'Ürünler', access: 'viewable' },
      { to: '/product-firm-matrix', icon: Grid3x3, label: 'Ürün-Firma Matrisi', access: 'viewable' },
    ],
  },
  {
    title: 'Yapılandırma',
    items: [
      { to: '/labels', icon: Tags, label: 'Etiketler', access: 'viewable' },
      { to: '/ticket-priorities', icon: AlertTriangle, label: 'Öncelikler', access: 'viewable' },
      { to: '/ticket-statuses', icon: CircleDot, label: 'Durumlar', access: 'viewable' },
      { to: '/privileges', icon: ShieldCheck, label: 'Yetkiler', access: 'viewable' },
    ],
  },
];

export default function Sidebar() {
  const { user, isAdmin, isRestrictedUser, canViewAdminPages, logout } = useAuth();
  const navigate = useNavigate();

  const filterItems = (items) =>
    items.filter((item) => {
      if (item.access === 'all') return true;
      if (item.access === 'nonRestricted') return !isRestrictedUser;
      if (item.access === 'viewable') return canViewAdminPages;
      return true;
    });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface-0 border-r border-surface-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-surface-200">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-base font-bold text-surface-900 tracking-tight">Pratek</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            type="text"
            placeholder="Hızlı arama..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500/30 focus:border-primary-400 transition-colors placeholder:text-surface-400"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-surface-400 bg-surface-100 border border-surface-200 rounded px-1 py-0.5 font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-3 space-y-4 overflow-y-auto">
        {navSections.map((section, sIdx) => {
          const items = filterItems(section.items);
          if (items.length === 0) return null;
          return (
            <div key={sIdx}>
              {section.title && (
                <p className="px-2 pb-1.5 text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 border-l-[3px] border-primary-500 -ml-[3px] pl-[calc(0.625rem+3px)]'
                          : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-2 border-t border-surface-200 pt-2 space-y-0.5">
        {!isRestrictedUser && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `group flex items-center justify-between px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4" />
              <span>Ayarlar</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="px-3 pb-3 pt-2 border-t border-surface-200">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-primary-700 shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0) || '?'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-surface-900 truncate">{user.name}</p>
              <p className="text-[11px] text-surface-400 truncate">{user.mail}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
