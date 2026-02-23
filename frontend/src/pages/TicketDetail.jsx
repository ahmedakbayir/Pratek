import { useEffect, useState, useRef } from 'react';
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
  X,
  Package,
  Plus,
  Minus,
  UserPlus,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { ticketsApi, tagsApi, usersApi, firmsApi, productsApi, statusesApi, prioritiesApi } from '../services/api';

const priorityConfig = {
  1: { label: 'Kritik', variant: 'danger', icon: AlertCircle },
  2: { label: 'Yüksek', variant: 'warning', icon: AlertCircle },
  3: { label: 'Normal', variant: 'info', icon: CheckCircle2 },
  4: { label: 'Düşük', variant: 'default', icon: CheckCircle2 },
};

const priorityDotColors = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#9CA3AF',
};

function getStatusDotColor(name) {
  if (!name) return '#3B82F6';
  const n = name.toLowerCase();
  if (n === 'new' || n === 'yeni') return '#3B82F6';
  if (n === 'in_progress' || n.includes('devam') || n.includes('progress')) return '#F59E0B';
  if (n.includes('resolve') || n.includes('çözül') || n.includes('tamamlan')) return '#10B981';
  if (n === 'closed' || n.includes('kapal')) return '#6B7280';
  if (n.includes('bekle') || n.includes('wait')) return '#8B5CF6';
  return '#3B82F6';
}

function getStatusSelectStyle(name) {
  if (!name) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' };
  const n = name.toLowerCase();
  if (n === 'closed' || n.includes('kapal')) return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
  if (n === 'in_progress' || n.includes('devam') || n.includes('progress')) return { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' };
  if (n.includes('resolve') || n.includes('çözül') || n.includes('tamamlan')) return { bg: '#ECFDF5', color: '#047857', border: '#6EE7B7' };
  if (n.includes('bekle') || n.includes('wait')) return { bg: '#F5F3FF', color: '#6D28D9', border: '#C4B5FD' };
  return { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' };
}

function getPrioritySelectStyle(priorityId) {
  switch (priorityId) {
    case 1: return { bg: '#FEF2F2', color: '#B91C1C', border: '#FCA5A5' };
    case 2: return { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' };
    case 3: return { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' };
    case 4: return { bg: '#F9FAFB', color: '#6B7280', border: '#D1D5DB' };
    default: return {};
  }
}

const fieldLabels = {
  status: 'Durum',
  priority: 'Öncelik',
  assignedUser: 'Atanan Kişi',
  firm: 'Firma',
  product: 'Ürün',
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activity, setActivity] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allFirms, setAllFirms] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);
  const [allPriorities, setAllPriorities] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const tagPickerRef = useRef(null);

  const loadTicket = () => ticketsApi.get(id).then(setTicket).catch(() => setError(true));
  const loadActivity = () => ticketsApi.getActivity(id).then(setActivity).catch(() => setActivity([]));

  useEffect(() => {
    Promise.all([
      ticketsApi.get(id),
      ticketsApi.getActivity(id).catch(() => []),
      tagsApi.getAll().catch(() => []),
      usersApi.getAll().catch(() => []),
      firmsApi.getAll().catch(() => []),
      productsApi.getAll().catch(() => []),
      statusesApi.getAll().catch(() => []),
      prioritiesApi.getAll().catch(() => []),
    ])
      .then(([t, act, tags, users, firms, products, statuses, priorities]) => {
        setTicket(t);
        setActivity(act || []);
        setAllTags(tags || []);
        setAllUsers(users || []);
        setAllFirms(firms || []);
        setAllProducts(products || []);
        setAllStatuses(statuses || []);
        setAllPriorities(priorities || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target)) {
        setShowTagPicker(false);
      }
    };
    if (showTagPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTagPicker]);

  const handleDelete = async () => {
    if (!confirm('Bu ticket\'i silmek istediginize emin misiniz?')) return;
    try {
      await ticketsApi.delete(id);
      navigate('/tickets');
    } catch (err) {
      alert('Silme hatasi:\n' + err.message);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await ticketsApi.addComment(id, { content: newComment, userId: 1 });
      setNewComment('');
      loadActivity();
    } catch (err) {
      alert('Yorum gonderilemedi:\n' + err.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleAddTag = async (tagId) => {
    try {
      await ticketsApi.addTag(id, tagId, 1);
      await Promise.all([loadTicket(), loadActivity()]);
      setShowTagPicker(false);
    } catch (err) {
      alert('Etiket eklenemedi:\n' + err.message);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await ticketsApi.removeTag(id, tagId, 1);
      await Promise.all([loadTicket(), loadActivity()]);
    } catch (err) {
      alert('Etiket kaldirilamadi:\n' + err.message);
    }
  };

  // Inline update helper
  const updateTicket = async (patch) => {
    try {
      const payload = {
        title: ticket.title,
        description: ticket.description,
        ticketPriorityId: ticket.ticketPriorityId,
        ticketStatusId: ticket.ticketStatusId,
        firmId: ticket.firmId,
        assignedUserId: ticket.assignedUserId,
        productId: ticket.productId,
        ...patch,
      };
      const updated = await ticketsApi.update(id, payload);
      setTicket(updated);
      loadActivity();
    } catch (err) {
      alert('Guncelleme hatasi:\n' + err.message);
    }
  };

  const availableTags = allTags.filter(
    (tag) => !ticket?.ticketTags?.some((tt) => tt.tagId === tag.id)
  );

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
          <button onClick={() => navigate('/tickets')} className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">
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
                      <StatusBadge status={ticket.status} />
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

            {/* Activity Timeline */}
            <div className="bg-surface-0 rounded-xl border border-surface-200">
              <div className="px-6 py-4 border-b border-surface-200">
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-surface-400" />
                  Aktivite
                  {activity.length > 0 && (
                    <span className="text-xs text-surface-400 font-normal">({activity.length})</span>
                  )}
                </h3>
              </div>

              {activity.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {activity.map((item) =>
                    item.type === 'comment' ? (
                      <div key={item.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 mt-0.5 shrink-0">
                            {item.userName?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-surface-900">
                                {item.userName || 'Kullanici'}
                              </span>
                              <span className="text-xs text-surface-400">
                                {formatDateTime(item.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1.5 p-3 bg-surface-50 rounded-lg text-sm text-surface-700 border border-surface-100">
                              {item.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : item.type === 'field_changed' ? (
                      <div key={item.id} className="px-6 py-3">
                        <div className="flex items-center gap-2 text-xs text-surface-500">
                          <Edit3 className="w-3.5 h-3.5 text-primary-500" />
                          <span className="font-medium text-surface-700">{item.userName || 'Sistem'}</span>
                          <span className="font-medium text-surface-600">{fieldLabels[item.field] || item.field}</span>
                          <span>alanini degistirdi:</span>
                          {item.oldValue && (
                            <span className="line-through text-surface-400">{item.oldValue}</span>
                          )}
                          <span className="text-surface-400">→</span>
                          <span className="font-medium text-surface-800">{item.newValue || 'Bos'}</span>
                          <span className="text-surface-400 ml-auto">{formatDateTime(item.createdAt)}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={item.id} className="px-6 py-3">
                        <div className="flex items-center gap-2 text-xs text-surface-500">
                          {item.type === 'tag_added' ? (
                            <Plus className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-danger" />
                          )}
                          <span className="font-medium text-surface-700">{item.userName || 'Sistem'}</span>
                          <span>
                            {item.type === 'tag_added' ? 'etiket ekledi:' : 'etiketi kaldirdi:'}
                          </span>
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-full text-white"
                            style={{ backgroundColor: item.colorHex || '#6B7280' }}
                          >
                            {item.tagName}
                          </span>
                          <span className="text-surface-400 ml-auto">{formatDateTime(item.createdAt)}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-surface-400">Henuz aktivite yok</p>
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
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment();
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
              {/* Status */}
              <SidebarSelect
                icon={CheckCircle2}
                label="Durum"
                value={ticket.ticketStatusId}
                options={allStatuses.map((s) => ({ value: s.id, label: s.name }))}
                onChange={(val) => updateTicket({ ticketStatusId: Number(val) })}
                colorDot={getStatusDotColor(ticket.status?.name)}
                selectStyle={getStatusSelectStyle(ticket.status?.name)}
              />
              {/* Priority */}
              <SidebarSelect
                icon={AlertCircle}
                label="Öncelik"
                value={ticket.ticketPriorityId}
                options={allPriorities.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(val) => updateTicket({ ticketPriorityId: Number(val) })}
                colorDot={priorityDotColors[ticket.ticketPriorityId]}
                selectStyle={getPrioritySelectStyle(ticket.ticketPriorityId)}
              />
              {/* Assigned User */}
              <SidebarSelect
                icon={UserPlus}
                label="Atanan Kişi"
                value={ticket.assignedUserId || ''}
                options={[
                  { value: '', label: 'Atanmadı' },
                  ...allUsers.map((u) => ({ value: u.id, label: u.name })),
                ]}
                onChange={(val) => updateTicket({ assignedUserId: val ? Number(val) : null })}
              />
              {/* Firm */}
              <SidebarSelect
                icon={Building2}
                label="Firma"
                value={ticket.firmId || ''}
                options={[
                  { value: '', label: 'Belirtilmedi' },
                  ...allFirms.map((f) => ({ value: f.id, label: f.name })),
                ]}
                onChange={(val) => updateTicket({ firmId: val ? Number(val) : null })}
              />
              {/* Product */}
              <SidebarSelect
                icon={Package}
                label="Ürün"
                value={ticket.productId || ''}
                options={[
                  { value: '', label: 'Belirtilmedi' },
                  ...allProducts.map((p) => ({ value: p.id, label: p.name })),
                ]}
                onChange={(val) => updateTicket({ productId: val ? Number(val) : null })}
              />
              {/* Creator (read-only) */}
              <SidebarItem
                icon={User}
                label="Olusturan"
                value={
                  ticket.createdByUser ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center text-[10px] font-medium text-surface-600">
                        {ticket.createdByUser.name?.charAt(0)}
                      </div>
                      {ticket.createdByUser.name}
                    </div>
                  ) : (
                    <span className="text-surface-400">Bilinmiyor</span>
                  )
                }
              />
              {/* Created date (read-only) */}
              <SidebarItem
                icon={Clock}
                label="Olusturulma"
                value={formatDateTime(ticket.createdAt)}
              />
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
                    <span
                      key={tt.tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: tt.tag?.colorHex || '#6B7280' }}
                    >
                      {tt.tag?.name || 'Tag'}
                      <button
                        onClick={() => handleRemoveTag(tt.tagId)}
                        className="ml-0.5 hover:opacity-70 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-surface-400">Etiket yok</span>
                )}
                <div className="relative" ref={tagPickerRef}>
                  <button
                    onClick={() => setShowTagPicker(!showTagPicker)}
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-surface-400 border border-dashed border-surface-300 rounded-full hover:text-surface-600 hover:border-surface-400 transition-colors cursor-pointer"
                  >
                    + Ekle
                  </button>
                  {showTagPicker && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-surface-0 rounded-lg border border-surface-200 shadow-lg z-10">
                      {availableTags.length > 0 ? (
                        <div className="py-1 max-h-48 overflow-y-auto">
                          {availableTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleAddTag(tag.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tag.colorHex || '#6B7280' }}
                              />
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-xs text-surface-400">
                          Eklenecek etiket kalmadi
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSelect({ icon: Icon, label, value, options, onChange, colorDot, selectStyle }) {
  const inlineStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    ...(selectStyle ? { backgroundColor: selectStyle.bg, color: selectStyle.color, borderColor: selectStyle.border } : {}),
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-50/60 transition-colors">
      <span className="flex items-center gap-2 text-sm text-surface-500">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        {colorDot && (
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorDot }} />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm font-semibold bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 cursor-pointer max-w-[150px] truncate appearance-none"
          style={inlineStyle}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const name = (status?.name || '').toLowerCase();
  let bg, text, dot;
  if (status?.isClosed || name === 'closed' || name.includes('kapal')) {
    bg = 'bg-slate-100'; text = 'text-slate-600'; dot = 'bg-slate-400';
  } else if (name === 'in_progress' || name.includes('devam') || name.includes('progress')) {
    bg = 'bg-amber-50'; text = 'text-amber-700'; dot = 'bg-amber-500';
  } else if (name.includes('resolve') || name.includes('çözül') || name.includes('tamamlan')) {
    bg = 'bg-emerald-50'; text = 'text-emerald-700'; dot = 'bg-emerald-500';
  } else if (name.includes('bekle') || name.includes('wait')) {
    bg = 'bg-purple-50'; text = 'text-purple-700'; dot = 'bg-purple-500';
  } else {
    bg = 'bg-blue-50'; text = 'text-blue-700'; dot = 'bg-blue-500';
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status?.name || 'Yeni'}
    </span>
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
