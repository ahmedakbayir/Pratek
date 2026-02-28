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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// access: 'all' = everyone, 'nonRestricted' = admin + TKL Ürün Yönetim, 'viewable' = admin + TKL Ürün Yönetim (view-only)
const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', access: 'nonRestricted' },
  { to: '/tickets', icon: Ticket, label: 'Ticket\'lar', access: 'all' },
  { to: '/users', icon: Users, label: 'Kullanıcılar', access: 'viewable' },
  { to: '/firms', icon: Building2, label: 'Firmalar', access: 'viewable' },
  { to: '/products', icon: Package, label: 'Ürünler', access: 'viewable' },
  { to: '/labels', icon: Tags, label: 'Etiketler', access: 'viewable' },
  { to: '/ticket-priorities', icon: AlertTriangle, label: 'Öncelikler', access: 'viewable' },
  { to: '/ticket-statuses', icon: CircleDot, label: 'Durumlar', access: 'viewable' },
  { to: '/privileges', icon: ShieldCheck, label: 'Yetkiler', access: 'viewable' },
  { to: '/product-firm-matrix', icon: Grid3x3, label: 'Ürün-Firma Matrisi', access: 'viewable' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Ayarlar' },
];

export default function Sidebar() {
  const { user, isAdmin, isRestrictedUser, canViewAdminPages, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = allNavItems.filter(item => {
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
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface-900 text-white flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <Shield className="w-7 h-7 text-primary-400" />
        <span className="text-lg font-semibold tracking-tight">Pratek</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-400 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-2 border-t border-white/10 pt-3 space-y-1">
        {!isRestrictedUser && bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-400 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-surface-400 hover:bg-white/8 hover:text-white transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Çıkış Yap
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="px-3 pb-4 pt-2 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-500/30 overflow-hidden flex items-center justify-center text-sm font-medium text-primary-200 shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0) || '?'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-surface-500 truncate">{user.mail}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
