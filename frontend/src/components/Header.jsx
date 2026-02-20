import { useState } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Header({ title, subtitle }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/tickets?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/tickets');
    }
  };

  return (
    <header className="h-16 bg-surface-0 border-b border-surface-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-surface-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-surface-600">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Ticket ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm bg-surface-100 border border-surface-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
          />
        </form>

        {/* New Ticket */}
        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Ticket
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
          A
        </div>
      </div>
    </header>
  );
}
