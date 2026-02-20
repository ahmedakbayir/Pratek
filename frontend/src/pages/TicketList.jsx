import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter,
  SortAsc,
  Clock,
  User,
  Building2,
  MoreHorizontal,
  Ticket as TicketIcon,
  Plus,
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

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    ticketsApi
      .getAll()
      .then(setTickets)
      .catch(() => setTickets(demoTickets))
      .finally(() => setLoading(false));
  }, []);

  const data = tickets.length > 0 ? tickets : demoTickets;

  const filtered =
    activeTab === 'all'
      ? data
      : activeTab === 'open'
        ? data.filter((t) => !t.status?.isClosed)
        : data.filter((t) => t.status?.isClosed);

  return (
    <div>
      <Header title="Ticket'lar" subtitle={`${data.length} ticket`} />

      <div className="p-6">
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
                      ? data.length
                      : tab.key === 'open'
                        ? data.filter((t) => !t.status?.isClosed).length
                        : data.filter((t) => t.status?.isClosed).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                <Filter className="w-3.5 h-3.5" />
                Filtrele
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                <SortAsc className="w-3.5 h-3.5" />
                Sırala
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_120px_100px_140px_120px_44px] gap-3 px-5 py-2.5 text-xs font-medium text-surface-500 uppercase tracking-wider border-b border-surface-100 bg-surface-50/50">
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
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title="Ticket bulunamadı"
              description="Henüz bir ticket oluşturulmamış veya filtre sonuçlarında eşleşme yok."
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
              {filtered.map((ticket) => (
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
      className="grid grid-cols-[1fr_120px_100px_140px_120px_44px] gap-3 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors"
    >
      {/* Title & Description */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-surface-400">#{ticket.id}</span>
          <span className="text-sm font-medium text-surface-900 truncate">
            {ticket.title}
          </span>
        </div>
        {ticket.firm && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-surface-500">
            <Building2 className="w-3 h-3" />
            {ticket.firm.name}
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <Badge variant={ticket.status?.isClosed ? 'closed' : 'open'} dot>
          {ticket.status?.name || 'Açık'}
        </Badge>
      </div>

      {/* Priority */}
      <div>
        <Badge variant={prio.variant}>{prio.label}</Badge>
      </div>

      {/* Assigned */}
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

      {/* Date */}
      <div className="flex items-center gap-1 text-xs text-surface-500">
        <Clock className="w-3.5 h-3.5" />
        {formatDate(ticket.createdAt)}
      </div>

      {/* Actions */}
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
          className="grid grid-cols-[1fr_120px_100px_140px_120px_44px] gap-3 px-5 py-3.5 animate-pulse"
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

const demoTickets = [
  {
    id: 1,
    title: 'Login sayfasında hata',
    description: 'Kullanıcılar giriş yapamıyor, 500 hatası alınıyor',
    ticketPriorityId: 1,
    ticketStatusId: 1,
    assignedUserId: 2,
    createdAt: '2026-02-20T10:00:00',
    status: { id: 1, name: 'Açık', isClosed: false },
    priority: { id: 1, name: 'Kritik', level: 1 },
    assignedUser: { id: 2, name: 'Ahmet Yılmaz' },
    firm: { id: 1, name: 'Tech Corp' },
  },
  {
    id: 2,
    title: 'Dashboard yüklenme performansı',
    description: 'Dashboard sayfası çok yavaş açılıyor',
    ticketPriorityId: 2,
    ticketStatusId: 1,
    assignedUserId: 3,
    createdAt: '2026-02-19T14:30:00',
    status: { id: 1, name: 'Açık', isClosed: false },
    priority: { id: 2, name: 'Yüksek', level: 2 },
    assignedUser: { id: 3, name: 'Elif Kaya' },
    firm: { id: 2, name: 'Digital Solutions' },
  },
  {
    id: 3,
    title: 'Rapor export özelliği',
    description: 'PDF export çalışmıyor, boş dosya indiriliyor',
    ticketPriorityId: 3,
    ticketStatusId: 2,
    assignedUserId: 2,
    createdAt: '2026-02-18T09:15:00',
    status: { id: 2, name: 'Devam Ediyor', isClosed: false },
    priority: { id: 3, name: 'Normal', level: 3 },
    assignedUser: { id: 2, name: 'Ahmet Yılmaz' },
    firm: { id: 1, name: 'Tech Corp' },
  },
  {
    id: 4,
    title: 'E-posta bildirim ayarları',
    description: 'Bildirim tercihleri kaydedilmiyor',
    ticketPriorityId: 4,
    ticketStatusId: 3,
    assignedUserId: null,
    createdAt: '2026-02-17T16:45:00',
    status: { id: 3, name: 'Çözümlendi', isClosed: true },
    priority: { id: 4, name: 'Düşük', level: 4 },
    assignedUser: null,
    firm: { id: 3, name: 'Startup Inc' },
  },
  {
    id: 5,
    title: 'Mobil uyumluluk sorunları',
    description: 'iOS cihazlarda menü açılmıyor',
    ticketPriorityId: 2,
    ticketStatusId: 1,
    assignedUserId: 4,
    createdAt: '2026-02-16T11:20:00',
    status: { id: 1, name: 'Açık', isClosed: false },
    priority: { id: 2, name: 'Yüksek', level: 2 },
    assignedUser: { id: 4, name: 'Mehmet Demir' },
    firm: { id: 2, name: 'Digital Solutions' },
  },
  {
    id: 6,
    title: 'Fatura entegrasyonu',
    description: 'E-fatura sistemiyle entegrasyon yapılması gerekiyor',
    ticketPriorityId: 3,
    ticketStatusId: 1,
    assignedUserId: null,
    createdAt: '2026-02-15T08:00:00',
    status: { id: 1, name: 'Açık', isClosed: false },
    priority: { id: 3, name: 'Normal', level: 3 },
    assignedUser: null,
    firm: { id: 1, name: 'Tech Corp' },
  },
];
