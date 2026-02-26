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
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  const openCount = tickets.filter((t) => !t.status?.isClosed).length;
  const closedCount = tickets.filter((t) => t.status?.isClosed).length;
  const assignedCount = tickets.filter((t) => t.assignedUserId).length;
  const recentTickets = [...tickets].slice(0, 5);

  return (
    <div>
      <Header title="Dashboard" subtitle="Genel bakış ve özet bilgiler" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Ticket} label="Toplam Ticket" value={tickets.length} />
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
            ) : recentTickets.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-surface-400">Henüz ticket oluşturulmamış.</p>
                <Link
                  to="/tickets/new"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  İlk Ticket'ı Oluştur
                </Link>
              </div>
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
                      <Badge variant={priorityVariant[ticket.priorityId] || 'default'}>
                        {priorityLabel[ticket.priorityId] || '-'}
                      </Badge>
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5 truncate">
                      {ticket.content || 'Açıklama yok'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={ticket.status?.isClosed ? 'closed' : 'open'}
                      dot
                    >
                      {ticket.status?.name || '-'}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                      <span className="font-mono text-surface-400">#{ticket.id}</span>
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
