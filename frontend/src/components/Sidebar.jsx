import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'Ticket\'lar' },
  { to: '/users', icon: Users, label: 'Kullanıcılar' },
  { to: '/firms', icon: Building2, label: 'Firmalar' },
  { to: '/products', icon: Package, label: 'Ürünler' },
  { to: '/product-firm-matrix', icon: Grid3x3, label: 'Ürün-Firma Matrisi' },
  { to: '/tags', icon: Tags, label: 'Etiketler' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Ayarlar' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface-900 text-white flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <Shield className="w-7 h-7 text-primary-400" />
        <span className="text-lg font-semibold tracking-tight">Protekh</span>
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
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-1">
        {bottomItems.map(({ to, icon: Icon, label }) => (
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
      </div>
    </aside>
  );
}
