import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Plus,
  Globe,
  Cpu,
  AlertTriangle,
  Shield,
  Zap,
  MoreVertical,
  RefreshCw,
  Building2,
  Package,
  ShieldCheck,
} from 'lucide-react';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import { ticketsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

export default function Dashboard() {
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const { isAdmin, authorizedFirmIds, user } = useAuth();

  useEffect(() => {
    ticketsApi
      .getAll()
      .then(setAllTickets)
      .catch(() => setAllTickets([]))
      .finally(() => setLoading(false));
  }, []);

  const tickets = isAdmin
    ? allTickets
    : allTickets.filter(t => t.firmId && authorizedFirmIds.includes(t.firmId));

  const openCount = tickets.filter((t) => !t.status?.isClosed).length;
  const closedCount = tickets.filter((t) => t.status?.isClosed).length;
  const assignedCount = tickets.filter((t) => t.assignedUserId).length;
  const recentTickets = [...tickets].slice(0, 5);

  const timeRanges = ['15dk', '1s', '24s', '3g', '7g'];

  return (
    <div>
      <Header title="Ana Sayfa" />

      <div className="p-6">
        {/* Account Header */}
        <div className="mb-6">
          <p className="text-xs text-surface-400 mb-1">Ana Sayfa</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-surface-900">{user?.name || 'Hesabım'}</h1>
            <button className="p-1 text-surface-400 hover:text-surface-600 rounded transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Analytics */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-900">Genel Analitik</h2>
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-surface-400 hover:text-surface-600 rounded transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <div className="flex bg-surface-100 rounded-md p-0.5 ml-2">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      timeRange === range
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatsCard
              icon={Ticket}
              label="Toplam Ticket"
              value={tickets.length}
              subtitle="Tüm ticket'ların özeti"
              highlighted
            />
            <StatsCard icon={AlertCircle} label="Açık Ticket" value={openCount} change="—" />
            <StatsCard icon={Clock} label="Bekleyen" value={openCount - assignedCount >= 0 ? openCount - assignedCount : 0} change="—" />
            <StatsCard icon={CheckCircle2} label="Çözümlenen" value={closedCount} change="—" />
            <StatsCard icon={Users} label="Atanmış" value={assignedCount} change="—" />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Tickets Card */}
          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-900">Ticket'lar</h3>
              <Link to="/tickets/new" className="p-1 text-surface-400 hover:text-surface-600 transition-colors">
                <Plus className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-4 bg-primary-50 rounded-2xl flex items-center justify-center">
                <Ticket className="w-10 h-10 text-primary-500" />
              </div>
              <h4 className="text-sm font-semibold text-surface-900 mb-1">Ticket'ları yönetin</h4>
              <p className="text-xs text-surface-500 mb-4 max-w-[220px]">
                Destek taleplerini oluşturun, takip edin ve çözümleyin
              </p>
              <Link
                to="/tickets"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors"
              >
                Ticket'lara Git
              </Link>
            </div>
          </div>

          {/* Firms Card */}
          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-900">Firmalar & Ürünler</h3>
              <Link to="/firms" className="p-1 text-surface-400 hover:text-surface-600 transition-colors">
                <Plus className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-4 bg-orange-50 rounded-2xl flex items-center justify-center relative">
                <Building2 className="w-8 h-8 text-primary-500" />
                <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary-600" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-surface-900 mb-1">Firma ve ürün yönetimi</h4>
              <p className="text-xs text-surface-500 mb-4 max-w-[220px]">
                Firmaları ve ürünleri ekleyin, düzenleyin ve ilişkilendirin
              </p>
              <Link
                to="/firms"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors"
              >
                Yönetimi Başlat
              </Link>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
              <h3 className="text-sm font-semibold text-surface-900">Yetki & Güvenlik</h3>
              <Link to="/privileges" className="p-1 text-surface-400 hover:text-surface-600 transition-colors">
                <Plus className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center relative">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h4 className="text-sm font-semibold text-surface-900 mb-1">Kullanıcı yetkilendirme</h4>
              <p className="text-xs text-surface-500 mb-4 max-w-[220px]">
                Kullanıcı ve cihaz erişimlerini yönetin ve güvenliği sağlayın
              </p>
              <Link
                to="/privileges"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors"
              >
                Başlayın
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Tickets + Next Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Tickets */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-surface-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
              <h2 className="text-sm font-semibold text-surface-900">Son Ticket'lar</h2>
              <Link
                to="/tickets"
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Tümünü gör
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-surface-100">
              {loading ? (
                <LoadingRows />
              ) : recentTickets.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-surface-400">Henüz ticket oluşturulmamış.</p>
                  <Link
                    to="/tickets/new"
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    İlk Ticket'ı Oluştur
                  </Link>
                </div>
              ) : (
                recentTickets.map((ticket) => {
                  const prioColor = ticket.priority?.colorHex;
                  const statusColor = ticket.status?.colorHex;
                  const statusRgb = statusColor ? hexToRgb(statusColor) : null;
                  return (
                    <Link
                      key={ticket.id}
                      to={`/tickets/${ticket.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-surface-900 truncate">
                            {ticket.title}
                          </span>
                          {prioColor ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ring-1 ring-inset"
                              style={{
                                backgroundColor: `${prioColor}15`,
                                color: prioColor,
                                '--tw-ring-color': `${prioColor}30`,
                              }}
                            >
                              {ticket.priority?.name || '-'}
                            </span>
                          ) : (
                            <Badge variant="default">
                              {ticket.priority?.name || '-'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-surface-500 mt-0.5 truncate">
                          {ticket.content ? ticket.content.replace(/<[^>]*>/g, '').substring(0, 100) : 'Açıklama yok'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusRgb ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                            style={{
                              backgroundColor: `rgba(${statusRgb.r}, ${statusRgb.g}, ${statusRgb.b}, 0.1)`,
                              color: statusColor,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                            {ticket.status?.name || '-'}
                          </span>
                        ) : (
                          <Badge
                            variant={ticket.status?.isClosed ? 'closed' : 'open'}
                            dot
                          >
                            {ticket.status?.name || '-'}
                          </Badge>
                        )}
                        <span className="font-mono text-[10px] text-surface-400">#{ticket.id}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-lg border border-surface-200">
            <div className="px-4 py-3 border-b border-surface-200">
              <h2 className="text-sm font-semibold text-surface-900">Sonraki Adımlar</h2>
            </div>
            <div className="divide-y divide-surface-100">
              <Link to="/tickets/new" className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors group">
                <span className="text-xs text-surface-700">Yeni bir ticket oluşturun</span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </Link>
              <Link to="/users" className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors group">
                <span className="text-xs text-surface-700">Ekip üyelerini davet edin</span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </Link>
              <Link to="/firms" className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors group">
                <span className="text-xs text-surface-700">Firma bilgilerini düzenleyin</span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </Link>
              <Link to="/settings" className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors group">
                <span className="text-xs text-surface-700">Sistem ayarlarını yapılandırın</span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-200 rounded w-48" />
        <div className="h-2.5 bg-surface-100 rounded w-72" />
      </div>
      <div className="h-4 bg-surface-100 rounded-full w-14" />
    </div>
  ));
}
