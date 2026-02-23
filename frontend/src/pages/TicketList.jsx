import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  SortAsc,
  SortDesc,
  Clock,
  User,
  Building2,
  Package,
  MoreHorizontal,
  Ticket as TicketIcon,
  Plus,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { ticketsApi, firmsApi, productsApi, tagsApi, statusesApi } from '../services/api';

function getPriorityVariant(name) {
  if (!name) return { label: 'Normal', variant: 'info' };
  const n = name.toLowerCase();
  if (n.includes('kritik') || n.includes('critical')) return { label: name, variant: 'danger' };
  if (n.includes('yüksek') || n.includes('high')) return { label: name, variant: 'warning' };
  if (n.includes('düşük') || n.includes('low')) return { label: name, variant: 'default' };
  return { label: name, variant: 'info' };
}

const STATIC_PRIORITIES = [
  { id: 1, name: 'Kritik' },
  { id: 2, name: 'Yüksek' },
  { id: 3, name: 'Normal' },
  { id: 4, name: 'Düşük' },
];

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

function getStatusStyle(status) {
  if (!status) return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
  const name = (status.name || '').toLowerCase();
  if (status.isClosed || name === 'closed' || name.includes('kapal'))
    return { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
  if (name === 'in_progress' || name.includes('devam') || name.includes('progress'))
    return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
  if (name.includes('resolve') || name.includes('çözül') || name.includes('tamamlan'))
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (name.includes('bekle') || name.includes('wait'))
    return { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' };
  return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
}

function toggleFilter(setter, id) {
  setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
}

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [firms, setFirms] = useState([]);
  const [products, setProducts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [firmFilter, setFirmFilter] = useState([]);
  const [productFilter, setProductFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState([]);

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ticketsApi.getAll().catch(() => []),
      firmsApi.getAll().catch(() => []),
      productsApi.getAll().catch(() => []),
      tagsApi.getAll().catch(() => []),
      statusesApi.getAll().catch(() => []),
    ])
      .then(([t, f, p, tg, s]) => {
        setTickets(t || []);
        setFirms(f || []);
        setProducts(p || []);
        setTags(tg || []);
        setStatuses(s || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const clearAllFilters = () => {
    setFirmFilter([]);
    setProductFilter([]);
    setStatusFilter([]);
    setTagFilter([]);
    setPriorityFilter([]);
  };

  const anyFilterActive =
    firmFilter.length || productFilter.length || statusFilter.length ||
    tagFilter.length || priorityFilter.length;

  const processed = useMemo(() => {
    let result = [...tickets];

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

    if (activeTab === 'open') result = result.filter((t) => !t.status?.isClosed);
    if (activeTab === 'closed') result = result.filter((t) => t.status?.isClosed);

    if (firmFilter.length) result = result.filter((t) => firmFilter.includes(t.firmId));
    if (productFilter.length) result = result.filter((t) => productFilter.includes(t.productId));
    if (statusFilter.length) result = result.filter((t) => statusFilter.includes(t.ticketStatusId));
    if (tagFilter.length) result = result.filter((t) => t.ticketTags?.some((tt) => tagFilter.includes(tt.tagId)));
    if (priorityFilter.length) result = result.filter((t) => priorityFilter.includes(t.ticketPriorityId));

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'date-desc': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'priority-asc': return (a.ticketPriorityId || 3) - (b.ticketPriorityId || 3);
        case 'priority-desc': return (b.ticketPriorityId || 3) - (a.ticketPriorityId || 3);
        case 'title-asc': return (a.title || '').localeCompare(b.title || '', 'tr');
        default: return 0;
      }
    });

    return result;
  }, [tickets, activeTab, sortBy, firmFilter, productFilter, statusFilter, tagFilter, priorityFilter, searchQuery]);

  return (
    <div>
      <Header title="Ticket'lar" subtitle={`${processed.length} / ${tickets.length} ticket`} />

      <div className="p-6">
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2 text-sm text-surface-600">
            <span>&quot;{searchQuery}&quot; için {processed.length} sonuç bulundu</span>
            <Link to="/tickets" className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium">
              <X className="w-3.5 h-3.5" />
              Temizle
            </Link>
          </div>
        )}

        <div className="bg-surface-0 rounded-xl border border-surface-200">
          {/* Toolbar: Tabs + Filters + Sort */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-200 flex-wrap">
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

            {/* Divider */}
            <div className="w-px h-6 bg-surface-200 mx-1" />

            {/* Filters */}
            <FilterDropdown
              label="Firma"
              options={firms.map((f) => ({ id: f.id, name: f.name }))}
              selected={firmFilter}
              onToggle={(id) => toggleFilter(setFirmFilter, id)}
              onClear={() => setFirmFilter([])}
            />
            <FilterDropdown
              label="Ürün"
              options={products.map((p) => ({ id: p.id, name: p.name }))}
              selected={productFilter}
              onToggle={(id) => toggleFilter(setProductFilter, id)}
              onClear={() => setProductFilter([])}
            />
            <FilterDropdown
              label="Durum"
              options={statuses.map((s) => ({ id: s.id, name: s.name }))}
              selected={statusFilter}
              onToggle={(id) => toggleFilter(setStatusFilter, id)}
              onClear={() => setStatusFilter([])}
            />
            <FilterDropdown
              label="Etiket"
              options={tags.map((t) => ({ id: t.id, name: t.name, colorHex: t.colorHex }))}
              selected={tagFilter}
              onToggle={(id) => toggleFilter(setTagFilter, id)}
              onClear={() => setTagFilter([])}
            />
            <FilterDropdown
              label="Öncelik"
              options={STATIC_PRIORITIES}
              selected={priorityFilter}
              onToggle={(id) => toggleFilter(setPriorityFilter, id)}
              onClear={() => setPriorityFilter([])}
            />
            {anyFilterActive ? (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Temizle
              </button>
            ) : null}

            {/* Sort - push to right */}
            <div className="ml-auto relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
              >
                {sortBy.includes('desc') ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
                Sırala
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface-0 border border-surface-200 rounded-lg shadow-lg z-20 py-1">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                        sortBy === opt.key ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-700 hover:bg-surface-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-200 bg-surface-50/50">
            <span>Ticket</span>
            <span>Durum</span>
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
              description={
                searchQuery
                  ? `"${searchQuery}" aramasıyla eşleşen ticket yok.`
                  : anyFilterActive
                    ? 'Seçili filtrelere uyan ticket bulunamadı.'
                    : 'Henüz bir ticket oluşturulmamış.'
              }
              action={
                anyFilterActive ? (
                  <button onClick={clearAllFilters} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                    Filtreleri temizle
                  </button>
                ) : (
                  <Link to="/tickets/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    Yeni Ticket Oluştur
                  </Link>
                )
              }
            />
          ) : (
            <div className="divide-y divide-surface-200">
              {processed.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onFilterFirm={(fid) => toggleFilter(setFirmFilter, fid)}
                  onFilterProduct={(pid) => toggleFilter(setProductFilter, pid)}
                  onFilterStatus={(sid) => toggleFilter(setStatusFilter, sid)}
                  onFilterTag={(tid) => toggleFilter(setTagFilter, tid)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Multi-select filter dropdown ─────────────────────────────────────────────
function FilterDropdown({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer select-none ${
          count > 0
            ? 'text-primary-700 border-primary-300 bg-primary-50'
            : 'text-surface-600 border-surface-200 bg-surface-0 hover:bg-surface-50'
        }`}
      >
        {label}
        {count > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-medium">
            {count}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-surface-0 border border-surface-200 rounded-lg shadow-lg z-30 py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-surface-400">Seçenek yok</div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {options.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => onToggle(opt.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary-600 border-primary-600' : 'border-surface-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{opt.name}</span>
                    {opt.colorHex && (
                      <div
                        className="w-2.5 h-2.5 rounded-full ml-auto shrink-0"
                        style={{ backgroundColor: opt.colorHex }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {count > 0 && (
            <div className="border-t border-surface-100 mt-1 pt-1">
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-surface-50 cursor-pointer"
              >
                Temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Ticket row ───────────────────────────────────────────────────────────────
function TicketRow({ ticket, onFilterFirm, onFilterProduct, onFilterStatus, onFilterTag }) {
  const prio = getPriorityVariant(ticket.priority?.name);
  const ss = getStatusStyle(ticket.status);

  const clickFilter = (e, handler) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="grid grid-cols-[2.5fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-3.5 items-start hover:bg-surface-50 transition-colors"
    >
      <div className="min-w-0">
        {/* Row 1: Title + Priority */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-surface-900 truncate">
            {ticket.title}
          </span>
          <Badge variant={prio.variant}>{prio.label}</Badge>
        </div>
        {/* Row 2: ID · Firma · Ürün */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-surface-400">
          <span className="font-mono">#{ticket.id}</span>
          {ticket.firm && (
            <>
              <span>·</span>
              <span
                className="flex items-center gap-1 text-surface-500 hover:text-primary-600 cursor-pointer transition-colors"
                onClick={(e) => clickFilter(e, () => onFilterFirm(ticket.firmId))}
              >
                <Building2 className="w-3 h-3" />
                {ticket.firm.name}
              </span>
            </>
          )}
          {ticket.product && (
            <>
              <span>·</span>
              <span
                className="flex items-center gap-1 text-surface-500 hover:text-primary-600 cursor-pointer transition-colors"
                onClick={(e) => clickFilter(e, () => onFilterProduct(ticket.productId))}
              >
                <Package className="w-3 h-3" />
                {ticket.product.name}
              </span>
            </>
          )}
        </div>
        {/* Row 3: Tags */}
        {ticket.ticketTags && ticket.ticketTags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {ticket.ticketTags.map((tt) => (
              <span
                key={tt.tagId}
                onClick={(e) => clickFilter(e, () => onFilterTag(tt.tagId))}
                className="inline-flex items-center px-1.5 py-0 text-[10px] font-medium rounded-full text-white leading-[18px] hover:opacity-80 cursor-pointer transition-opacity"
                style={{ backgroundColor: tt.tag?.colorHex || '#6B7280' }}
              >
                {tt.tag?.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <span
          onClick={(e) => clickFilter(e, () => onFilterStatus(ticket.ticketStatusId))}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity ${ss.bg} ${ss.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
          {ticket.status?.name || 'Yeni'}
        </span>
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
    <div className="divide-y divide-surface-200">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[2.5fr_1fr_1.5fr_1fr_auto] gap-3 px-5 py-3.5 animate-pulse">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-surface-200 rounded w-48" />
              <div className="h-4 bg-surface-100 rounded-full w-12" />
            </div>
            <div className="h-3 bg-surface-100 rounded w-32" />
          </div>
          <div className="h-5 bg-surface-100 rounded-full w-16" />
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
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
