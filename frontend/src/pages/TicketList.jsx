import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  User,
  Building2,
  MoreHorizontal,
  Ticket as TicketIcon,
  Plus,
  X,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { ticketsApi } from '../services/api';

const priorityConfig = {
  1: { label: 'Kritik', variant: 'danger' },
  2: { label: 'Yüksek', variant: 'warning' },
  3: { label: 'Normal', variant: 'info' },
  4: { label: 'Düşük', variant: 'default' },
};

const statusTabs = [
  { key: 'all', label: 'Tümü' },
  { key: 'open', label: 'Açık' },
  { key: 'closed', label: 'Kapalı' },
];

const sortOptions = [
  { key: 'date-desc', label: 'En yeni' },
  { key: 'date-asc', label: 'En eski' },
  { key: 'priority-asc', label: 'Öncelik (Yüksek)' },
  { key: 'priority-desc', label: 'Öncelik (Düşük)' },
  { key: 'title-asc', label: 'Başlık (A-Z)' },
];

const priorityOptions = [
  { key: 0, label: 'Tüm Öncelikler' },
  { key: 1, label: 'Kritik' },
  { key: 2, label: 'Yüksek' },
  { key: 3, label: 'Normal' },
  { key: 4, label: 'Düşük' },
];

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState(0);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    ticketsApi
      .getAll()
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  const processed = useMemo(() => {
    let result = [...tickets];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.firm?.name?.toLowerCase().includes(q) ||
          t.assignedUser?.name?.toLowerCase().includes(q) ||
          String(t.id).includes(q)
      );
    }

    // Status tab filter
    if (activeTab === 'open') result = result.filter((t) => !t.status?.isClosed);
    if (activeTab === 'closed') result = result.filter((t) => t.status?.isClosed);

    // Priority filter
    if (priorityFilter > 0) result = result.filter((t) => t.ticketPriorityId === priorityFilter);

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'date-desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'priority-asc':
          return (a.ticketPriorityId || 3) - (b.ticketPriorityId || 3);
        case 'priority-desc':
          return (b.ticketPriorityId || 3) - (a.ticketPriorityId || 3);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '', 'tr');
        default:
          return 0;
      }
    });

    return result;
  }, [tickets, activeTab, sortBy, priorityFilter, searchQuery]);

  const activeFilterCount = (priorityFilter > 0 ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div>
      <Header title="Ticket'lar" subtitle={`${tickets.length} ticket`} />

      <div className="p-6">
        {/* Search indicator */}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2 text-sm text-surface-600">
            <span>&quot;{searchQuery}&quot; için {processed.length} sonuç bulundu</span>
            <Link
              to="/tickets"
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Temizle
            </Link>
          </div>
        )}

        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
            {/* Tabs */}
            <div className="flex gap-1 bg-surface-100 p-0.5 rounded-lg">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-surface-0 text-surface-900 shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-surface-400">
                    {tab.key === 'all'
                      ? tickets.length
                      : tab.key === 'open'
                        ? tickets.filter((t) => !t.status?.isClosed).length
                        : tickets.filter((t) => t.status?.isClosed).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <div className="relative">
                <button
                  onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
                    priorityFilter > 0
                      ? 'text-primary-700 border-primary-300 bg-primary-50'
                      : 'text-surface-600 border-surface-200 hover:bg-surface-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtrele
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface-0 border border-surface-200 rounded-lg shadow-lg z-10 py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase">Öncelik</div>
                    {priorityOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setPriorityFilter(opt.key); setShowFilterMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                          priorityFilter === opt.key
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-surface-700 hover:bg-surface-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {priorityFilter > 0 && (
                      <>
                        <div className="border-t border-surface-100 my-1" />
                        <button
                          onClick={() => { setPriorityFilter(0); setShowFilterMenu(false); }}
                          className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-surface-50 cursor-pointer"
                        >
                          Filtreyi temizle
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
                >
                  {sortBy.includes('desc') ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
                  Sırala
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-surface-0 border border-surface-200 rounded-lg shadow-lg z-10 py-1">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                          sortBy === opt.key
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-surface-700 hover:bg-surface-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
            <span>Ticket</span>
            <span>Durum</span>
            <span>Öncelik</span>
            <span>Atanan</span>
            <span>Tarih</span>
            <span />
          </div>

          {/* Rows */}
          {loading ? (
            <LoadingRows />
          ) : processed.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title="Ticket bulunamadı"
              description={searchQuery
                ? `"${searchQuery}" aramasıyla eşleşen ticket yok.`
                : 'Henüz bir ticket oluşturulmamış veya filtre sonuçlarında eşleşme yok.'
              }
              action={
                <Link
                  to="/tickets/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Ticket Oluştur
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-surface-100">
              {processed.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket }) {
  const prio = priorityConfig[ticket.ticketPriorityId] || priorityConfig[3];

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-surface-400">#{ticket.id}</span>
          <span className="text-sm font-medium text-surface-900 truncate">
            {ticket.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {ticket.firm && (
            <span className="flex items-center gap-1 text-xs text-surface-500">
              <Building2 className="w-3 h-3" />
              {ticket.firm.name}
            </span>
          )}
          {ticket.ticketTags && ticket.ticketTags.length > 0 && (
            <span className="flex items-center gap-1 flex-wrap">
              {ticket.ticketTags.map((tt) => (
                <span
                  key={tt.tagId}
                  className="inline-flex items-center px-1.5 py-0 text-[10px] font-medium rounded-full text-white leading-4"
                  style={{ backgroundColor: tt.tag?.colorHex || '#6B7280' }}
                >
                  {tt.tag?.name}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <div>
        <Badge variant={ticket.status?.isClosed ? 'closed' : 'open'} dot>
          {ticket.status?.name || 'Açık'}
        </Badge>
      </div>

      <div>
        <Badge variant={prio.variant}>{prio.label}</Badge>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        {ticket.assignedUser ? (
          <>
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 shrink-0">
              {ticket.assignedUser.name?.charAt(0) || '?'}
            </div>
            <span className="text-sm text-surface-700 truncate">
              {ticket.assignedUser.name}
            </span>
          </>
        ) : (
          <span className="text-xs text-surface-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            Atanmadı
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-surface-500">
        <Clock className="w-3.5 h-3.5" />
        {formatDate(ticket.createdAt)}
      </div>

      <div className="flex justify-end">
        <button
          onClick={(e) => e.preventDefault()}
          className="p-1 text-surface-400 hover:text-surface-600 rounded cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-surface-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-3.5 animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-4 bg-surface-200 rounded w-56" />
            <div className="h-3 bg-surface-100 rounded w-24" />
          </div>
          <div className="h-5 bg-surface-100 rounded-full w-16" />
          <div className="h-5 bg-surface-100 rounded-full w-14" />
          <div className="h-5 bg-surface-100 rounded w-24" />
          <div className="h-4 bg-surface-100 rounded w-16" />
          <div />
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
