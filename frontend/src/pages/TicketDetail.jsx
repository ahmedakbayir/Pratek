import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Building2,
  Tag,
  MessageSquare,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { ticketsApi } from '../services/api';

const priorityConfig = {
  1: { label: 'Kritik', variant: 'danger', icon: AlertCircle },
  2: { label: 'Yüksek', variant: 'warning', icon: AlertCircle },
  3: { label: 'Normal', variant: 'info', icon: CheckCircle2 },
  4: { label: 'Düşük', variant: 'default', icon: CheckCircle2 },
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    ticketsApi
      .get(id)
      .then(setTicket)
      .catch(() => setTicket(demoTicket))
      .finally(() => setLoading(false));

    ticketsApi
      .getComments(id)
      .then(setComments)
      .catch(() => setComments(demoComments));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Bu ticket\'ı silmek istediğinize emin misiniz?')) return;
    try {
      await ticketsApi.delete(id);
      navigate('/tickets');
    } catch {
      alert('Silme sırasında hata oluştu.');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const comment = await ticketsApi.addComment(id, { content: newComment, userId: 1 });
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch {
      setComments((prev) => [
        {
          id: Date.now(),
          content: newComment,
          createdAt: new Date().toISOString(),
          user: { name: 'Ben' },
        },
        ...prev,
      ]);
      setNewComment('');
    } finally {
      setSendingComment(false);
    }
  };

  const data = ticket || demoTicket;
  const prio = priorityConfig[data.ticketPriorityId] || priorityConfig[3];

  if (loading) {
    return (
      <div>
        <Header title="Ticket Detay" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface-200 rounded w-96" />
            <div className="h-4 bg-surface-100 rounded w-64" />
            <div className="h-32 bg-surface-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={`#${data.id} ${data.title}`} />

      <div className="p-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Ticket'lara dön
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <div className="bg-surface-0 rounded-xl border border-surface-200">
              <div className="px-6 py-5 border-b border-surface-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-surface-400">#{data.id}</span>
                      <Badge variant={data.status?.isClosed ? 'closed' : 'open'} dot>
                        {data.status?.name || 'Açık'}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-semibold text-surface-900">{data.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/tickets/${data.id}/edit`)}
                      className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 text-surface-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
                  {data.description || 'Açıklama eklenmemiş.'}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-surface-0 rounded-xl border border-surface-200">
              <div className="px-6 py-4 border-b border-surface-200">
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-surface-400" />
                  Yorumlar
                  {comments.length > 0 && (
                    <span className="text-xs text-surface-400 font-normal">({comments.length})</span>
                  )}
                </h3>
              </div>

              {comments.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {comments.map((comment) => (
                    <div key={comment.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 mt-0.5 shrink-0">
                          {comment.user?.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-900">
                              {comment.user?.name || 'Kullanıcı'}
                            </span>
                            <span className="text-xs text-surface-400">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1.5 p-3 bg-surface-50 rounded-lg text-sm text-surface-700 border border-surface-100">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-surface-400">Henüz yorum yok</p>
                </div>
              )}

              {/* Comment Input */}
              <div className="px-6 py-4 border-t border-surface-200">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-medium text-white shrink-0">
                    A
                  </div>
                  <div className="flex-1">
                    <textarea
                      placeholder="Yorum ekle..."
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSendComment();
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-surface-400">Ctrl+Enter ile gönder</span>
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim() || sendingComment}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingComment ? 'Gönderiliyor...' : 'Gönder'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-surface-0 rounded-xl border border-surface-200 divide-y divide-surface-100">
              <SidebarItem
                icon={User}
                label="Atanan Kişi"
                value={
                  data.assignedUser ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-medium text-primary-700">
                        {data.assignedUser.name?.charAt(0)}
                      </div>
                      {data.assignedUser.name}
                    </div>
                  ) : (
                    <span className="text-surface-400">Atanmadı</span>
                  )
                }
              />
              <SidebarItem
                icon={AlertCircle}
                label="Öncelik"
                value={<Badge variant={prio.variant}>{prio.label}</Badge>}
              />
              <SidebarItem
                icon={Building2}
                label="Firma"
                value={data.firm?.name || <span className="text-surface-400">Belirtilmedi</span>}
              />
              <SidebarItem
                icon={Clock}
                label="Oluşturulma"
                value={formatDateTime(data.createdAt)}
              />
              {data.updatedAt && (
                <SidebarItem
                  icon={Clock}
                  label="Güncelleme"
                  value={formatDateTime(data.updatedAt)}
                />
              )}
            </div>

            {/* Tags */}
            <div className="bg-surface-0 rounded-xl border border-surface-200 p-4">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Etiketler
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(data.ticketTags && data.ticketTags.length > 0
                  ? data.ticketTags.map((tt) => tt.tag?.name || `Tag`)
                  : demoTags
                ).map((tag, i) => (
                  <Badge key={i} variant="primary">{tag}</Badge>
                ))}
                <button className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-surface-400 border border-dashed border-surface-300 rounded-full hover:text-surface-600 hover:border-surface-400 transition-colors cursor-pointer">
                  + Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-surface-500">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span className="text-sm text-surface-900 font-medium">{value}</span>
    </div>
  );
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const demoTicket = {
  id: 1,
  title: 'Login sayfasında hata',
  description:
    'Kullanıcılar giriş yapamıyor. Tarayıcı konsolunda 500 Internal Server Error hatası görünüyor.\n\nAdımlar:\n1. Login sayfasına git\n2. Geçerli email ve şifre gir\n3. "Giriş Yap" butonuna tıkla\n4. 500 hatası alınıyor\n\nBeklenen davranış: Kullanıcı başarıyla giriş yapmalı ve dashboard\'a yönlendirilmeli.',
  ticketPriorityId: 1,
  ticketStatusId: 1,
  assignedUserId: 2,
  createdAt: '2026-02-20T10:00:00',
  updatedAt: '2026-02-20T14:30:00',
  status: { id: 1, name: 'Açık', isClosed: false },
  priority: { id: 1, name: 'Kritik', level: 1 },
  assignedUser: { id: 2, name: 'Ahmet Yılmaz' },
  firm: { id: 1, name: 'Tech Corp' },
};

const demoTags = ['bug', 'auth', 'backend', 'acil'];

const demoComments = [
  {
    id: 1,
    content: 'Auth servisinde token expire süresinde bir sorun olabilir. İnceliyorum.',
    createdAt: '2026-02-20T12:00:00',
    user: { name: 'Elif Kaya' },
  },
  {
    id: 2,
    content: 'Ticket oluşturuldu ve atandı.',
    createdAt: '2026-02-20T10:00:00',
    user: { name: 'Admin' },
  },
];
