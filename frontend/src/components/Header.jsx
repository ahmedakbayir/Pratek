import { useState } from 'react';
import { Search, Bell, Plus, HelpCircle, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const { user } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/tickets?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/tickets');
    }
  };

  return (
    <header className="h-12 bg-white border-b border-surface-200 flex items-center justify-between px-5 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {subtitle && (
          <span className="text-xs text-surface-400">{subtitle}</span>
        )}
        <h1 className="text-sm font-semibold text-surface-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            type="text"
            placeholder="Ticket ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-surface-200 rounded-md w-48 focus:outline-none focus:ring-1 focus:ring-primary-500/30 focus:border-primary-400 transition-colors"
          />
        </form>

        {/* New Ticket */}
        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Ekle
        </button>

        {/* Support */}
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-surface-500 hover:text-surface-700 hover:bg-surface-50 rounded-md transition-colors cursor-pointer">
          <HelpCircle className="w-3.5 h-3.5" />
          Destek
        </button>

        {/* Notifications */}
        <button className="relative p-1.5 text-surface-500 hover:text-surface-700 hover:bg-surface-50 rounded-md transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-primary-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-surface-200 overflow-hidden flex items-center justify-center text-surface-600 text-xs font-medium cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </header>
  );
}
