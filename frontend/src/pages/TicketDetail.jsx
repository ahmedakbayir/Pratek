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
  const [error, setError] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    ticketsApi
      .get(id)
      .then(setTicket)
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    ticketsApi
      .getComments(id)
      .then(setComments)
      .catch(() => setComments([]));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Bu ticket\'i silmek istediginize emin misiniz?')) return;
    try {
      await ticketsApi.delete(id);
      navigate('/tickets');
    } catch (err) {
      console.error('Ticket delete error:', err);
      alert('Silme sirasinda hata olustu:\n' + err.message);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const comment = await ticketsApi.addComment(id, { content: newComment, userId: 1 });
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Comment error:', err);
      alert('Yorum gonderilemedi:\n' + err.message);
    } finally {
      setSendingComment(false);
    }
  };

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

  if (error || !ticket) {
    return (
      <div>
        <Header title="Ticket Detay" />
        <div className="p-6 text-center">
          <p className="text-sm text-surface-500">Ticket bulunamadi.</p>
          <button
            onClick={() => navigate('/tickets')}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Ticket listesine don
          </button>
        </div>
      </div>
    );
  }

  const prio = priorityConfig[ticket.ticketPriorityId] || priorityConfig[3];

  return (
    <div>
      <Header title={`#${ticket.id} ${ticket.title}`} />

      <div className="p-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Ticket'lara don
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
                      <span className="text-sm font-mono text-surface-400">#{ticket.id}</span>
                      <Badge variant={ticket.status?.isClosed ? 'closed' : 'open'} dot>
                        {ticket.status?.name || 'Acik'}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-semibold text-surface-900">{ticket.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
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
                  {ticket.description || 'Aciklama eklenmemis.'}
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
                              {comment.user?.name || 'Kullanici'}
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
                  <p className="text-sm text-surface-400">Henuz yorum yok</p>
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
                      <span className="text-xs text-surface-400">Ctrl+Enter ile gonder</span>
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim() || sendingComment}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingComment ? 'Gonderiliyor...' : 'Gonder'}
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
                label="Atanan Kisi"
                value={
                  ticket.assignedUser ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-medium text-primary-700">
                        {ticket.assignedUser.name?.charAt(0)}
                      </div>
                      {ticket.assignedUser.name}
                    </div>
                  ) : (
                    <span className="text-surface-400">Atanmadi</span>
                  )
                }
              />
              <SidebarItem
                icon={AlertCircle}
                label="Oncelik"
                value={<Badge variant={prio.variant}>{prio.label}</Badge>}
              />
              <SidebarItem
                icon={Building2}
                label="Firma"
                value={ticket.firm?.name || <span className="text-surface-400">Belirtilmedi</span>}
              />
              <SidebarItem
                icon={Clock}
                label="Olusturulma"
                value={formatDateTime(ticket.createdAt)}
              />
              {ticket.updatedAt && (
                <SidebarItem
                  icon={Clock}
                  label="Guncelleme"
                  value={formatDateTime(ticket.updatedAt)}
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
                {ticket.ticketTags && ticket.ticketTags.length > 0 ? (
                  ticket.ticketTags.map((tt) => (
                    <Badge key={tt.id} variant="primary">{tt.tag?.name || 'Tag'}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-surface-400">Etiket yok</span>
                )}
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
