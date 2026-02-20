import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
} from 'lucide-react';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import { ticketsApi } from '../services/api';

const priorityVariant = {
  1: 'danger',
  2: 'warning',
  3: 'info',
  4: 'default',
};

const priorityLabel = {
  1: 'Kritik',
  2: 'Yüksek',
  3: 'Normal',
  4: 'Düşük',
};

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsApi
      .getAll()
      .then(setTickets)
      .catch(() => setTickets(demoTickets))
      .finally(() => setLoading(false));
  }, []);

  const data = tickets.length > 0 ? tickets : demoTickets;
  const openCount = data.filter((t) => !t.status?.isClosed).length;
  const closedCount = data.filter((t) => t.status?.isClosed).length;
  const assignedCount = data.filter((t) => t.assignedUserId).length;
  const recentTickets = [...data].slice(0, 5);

  return (
    <div>
      <Header title="Dashboard" subtitle="Genel bakış ve özet bilgiler" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Ticket} label="Toplam Ticket" value={data.length} />
          <StatsCard icon={AlertCircle} label="Açık" value={openCount} trend={`${openCount} aktif`} trendUp={false} />
          <StatsCard icon={CheckCircle2} label="Çözümlenen" value={closedCount} trend={closedCount > 0 ? `+${closedCount}` : '0'} trendUp />
          <StatsCard icon={Users} label="Atanmış" value={assignedCount} />
        </div>

        {/* Recent Tickets */}
        <div className="bg-surface-0 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-surface-900">Son Ticket'lar</h2>
            <Link
              to="/tickets"
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Tümünü gör
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-surface-100">
            {loading ? (
              <LoadingRows />
            ) : (
              recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900 truncate">
                        {ticket.title}
                      </span>
                      <Badge variant={priorityVariant[ticket.ticketPriorityId] || 'default'}>
                        {priorityLabel[ticket.ticketPriorityId] || 'Normal'}
                      </Badge>
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5 truncate">
                      {ticket.description || 'Açıklama yok'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={ticket.status?.isClosed ? 'closed' : 'open'}
                      dot
                    >
                      {ticket.status?.name || 'Açık'}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(ticket.createdAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-200 rounded w-48" />
        <div className="h-3 bg-surface-100 rounded w-72" />
      </div>
      <div className="h-5 bg-surface-100 rounded-full w-16" />
    </div>
  ));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// Demo data for when API is not available
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
];
