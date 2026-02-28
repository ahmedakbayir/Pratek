import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  Globe,
  Save,
  Ticket as TicketIcon,
} from 'lucide-react';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { ticketsApi, labelsApi, usersApi, firmsApi, productsApi, statusesApi, prioritiesApi } from '../services/api';

function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

function getColorDot(entity) {
  if (entity?.colorHex) return entity.colorHex;
  return '#3B82F6';
}

function getSelectStyle(entity) {
  if (entity?.colorHex) {
    const rgb = hexToRgb(entity.colorHex);
    if (rgb) {
      return { bg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`, color: entity.colorHex, border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` };
    }
  }
  return { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' };
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activity, setActivity] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [allLabels, setAllLabels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allFirms, setAllFirms] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);
  const [allPriorities, setAllPriorities] = useState([]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [firmProducts, setFirmProducts] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCaretPos, setMentionCaretPos] = useState(null);
  const labelPickerRef = useRef(null);
  const commentInputRef = useRef(null);
  const mentionPopupRef = useRef(null);

  // Local sidebar state for deferred save
  const [sidebarForm, setSidebarForm] = useState(null);
  const [savingSidebar, setSavingSidebar] = useState(false);

  const loadTicket = () => ticketsApi.get(id).then(setTicket).catch(() => setError(true));
  const loadActivity = () => ticketsApi.getActivity(id).then(setActivity).catch(() => setActivity([]));

  useEffect(() => {
    Promise.all([
      ticketsApi.get(id),
      ticketsApi.getActivity(id).catch(() => []),
      labelsApi.getAll().catch(() => []),
      usersApi.getAll().catch(() => []),
      firmsApi.getAll().catch(() => []),
      productsApi.getAll().catch(() => []),
      statusesApi.getAll().catch(() => []),
      prioritiesApi.getAll().catch(() => []),
      ticketsApi.search('').catch(() => []),
    ])
      .then(([t, act, labels, users, firms, products, statuses, priorities, tickets]) => {
        setTicket(t);
        setActivity(act || []);
        setAllLabels(labels || []);
        setAllUsers(users || []);
        setAllFirms(firms || []);
        setAllProducts(products || []);
        setAllStatuses(statuses || []);
        setAllPriorities(priorities || []);
        setAllTickets(tickets || []);
        // Initialize sidebar form from ticket data
        setSidebarForm({
          statusId: t.statusId || '',
          priorityId: t.priorityId || '',
          assignedUserId: t.assignedUserId || '',
          firmId: t.firmId || '',
          productId: t.productId || '',
          scope: t.scope || '',
        });
        // Load firm-specific products
        if (t.firmId) {
          firmsApi.getProducts(t.firmId).then(setFirmProducts).catch(() => setFirmProducts([]));
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (labelPickerRef.current && !labelPickerRef.current.contains(e.target)) {
        setShowLabelPicker(false);
      }
    };
    if (showLabelPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLabelPicker]);

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

  const handleAddLabel = async (labelId) => {
    try {
      await ticketsApi.addLabel(id, labelId, 1);
      await Promise.all([loadTicket(), loadActivity()]);
      setShowLabelPicker(false);
    } catch (err) {
      alert('Etiket eklenemedi:\n' + err.message);
    }
  };

  const handleRemoveLabel = async (labelId) => {
    try {
      await ticketsApi.removeLabel(id, labelId, 1);
      await Promise.all([loadTicket(), loadActivity()]);
    } catch (err) {
      alert('Etiket kaldirilamadi:\n' + err.message);
    }
  };

  // --- Comment # mention autocomplete ---
  const getHashtagSuggestions = useCallback((query) => {
    const q = query.toLowerCase().trim();
    const results = [];
    allTickets.forEach((t) => {
      if (String(t.id) === String(id)) return; // skip current ticket
      const idMatch = String(t.id).includes(q);
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      if (!q || idMatch || titleMatch) {
        results.push({ id: t.id, label: t.title, type: 'ticket' });
      }
    });
    allUsers.forEach((u) => {
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      if (!q || nameMatch) {
        results.push({ id: u.id, label: u.name, type: 'user', avatarUrl: u.avatarUrl });
      }
    });
    return results.slice(0, 8);
  }, [allTickets, allUsers, id]);

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const hashMatch = textBefore.match(/#(\w*)$/);

    if (hashMatch) {
      const query = hashMatch[1];
      setMentionQuery(query);
      const suggestions = getHashtagSuggestions(query);
      setMentionSuggestions(suggestions);
      setShowMentionPopup(suggestions.length > 0);
      setMentionIndex(0);
      setMentionCaretPos(cursorPos);
    } else {
      setShowMentionPopup(false);
    }
  };

  const insertMention = (item) => {
    const textarea = commentInputRef.current;
    if (!textarea) return;

    const textBefore = newComment.slice(0, mentionCaretPos);
    const hashStart = textBefore.lastIndexOf('#');
    const textAfter = newComment.slice(mentionCaretPos);

    let insertText;
    if (item.type === 'ticket') {
      insertText = `#${item.id} `;
    } else {
      insertText = `#${item.label} `;
    }

    const newText = newComment.slice(0, hashStart) + insertText + textAfter;
    setNewComment(newText);
    setShowMentionPopup(false);

    setTimeout(() => {
      const newPos = hashStart + insertText.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleCommentKeyDown = (e) => {
    if (showMentionPopup) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + mentionSuggestions.length - 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionPopup(false);
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment();
  };

  // Handle click on mention links in ticket content
  const handleContentClick = (e) => {
    const link = e.target.closest('a[data-mention-type="ticket"]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) navigate(href);
    }
  };

  // Check if sidebar has unsaved changes
  const hasSidebarChanges = useMemo(() => {
    if (!ticket || !sidebarForm) return false;
    return (
      String(sidebarForm.statusId || '') !== String(ticket.statusId || '') ||
      String(sidebarForm.priorityId || '') !== String(ticket.priorityId || '') ||
      String(sidebarForm.assignedUserId || '') !== String(ticket.assignedUserId || '') ||
      String(sidebarForm.firmId || '') !== String(ticket.firmId || '') ||
      String(sidebarForm.productId || '') !== String(ticket.productId || '') ||
      String(sidebarForm.scope || '') !== String(ticket.scope || '')
    );
  }, [ticket, sidebarForm]);

  // 1. Sadece yerel state'i güncelleyen fonksiyon (API çağrısı yapmaz)
  const updateSidebarField = (field, value) => {
    setSidebarForm((prev) => {
      const next = { ...prev, [field]: value };

      // Eğer firma değiştiyse ürünü temizle ve yeni firmanın ürünlerini yükle
      if (field === 'firmId' && value !== prev.firmId) {
        next.productId = ''; // Ürün seçimini sıfırla
        if (value) {
          firmsApi.getProducts(value).then(setFirmProducts).catch(() => setFirmProducts([]));
        } else {
          setFirmProducts([]); // Firma seçimi kaldırıldıysa ürün listesini de boşalt
        }
      }

      return next;
    });
  };

  // 2. Ticket'ı doğrudan API üzerinden güncelleyen fonksiyon
  const updateTicket = async (patch) => {
    try {
      const payload = {
        title: ticket.title,
        content: ticket.content,
        priorityId: ticket.priorityId,
        statusId: ticket.statusId,
        firmId: ticket.firmId,
        assignedUserId: ticket.assignedUserId,
        productId: ticket.productId,
        scope: ticket.scope,
        ...patch,
      };

      // Eğer güncellenen alan firmId ise ürün mantığını ayarla
      if ('firmId' in patch && patch.firmId !== ticket.firmId) {
        payload.productId = null;
        if (patch.firmId) {
          firmsApi.getProducts(patch.firmId).then(setFirmProducts).catch(() => setFirmProducts([]));
        } else {
          setFirmProducts([]);
        }
      }

      // API çağrısı ve state güncellemeleri
      const updated = await ticketsApi.update(id, payload);
      setTicket(updated);
      loadActivity();
    } catch (err) {
      alert('Güncelleme hatası:\n' + err.message);
    }
  };

  // Save sidebar changes to API
  const handleSaveSidebar = async () => {
    if (!hasSidebarChanges) return;
    setSavingSidebar(true);
    try {
      const payload = {
        title: ticket.title,
        content: ticket.content,
        statusId: sidebarForm.statusId ? Number(sidebarForm.statusId) : null,
        priorityId: sidebarForm.priorityId ? Number(sidebarForm.priorityId) : null,
        assignedUserId: sidebarForm.assignedUserId ? Number(sidebarForm.assignedUserId) : null,
        firmId: sidebarForm.firmId ? Number(sidebarForm.firmId) : null,
        productId: sidebarForm.productId ? Number(sidebarForm.productId) : null,
        scope: sidebarForm.scope || null,
      };
      const updated = await ticketsApi.update(id, payload);
      setTicket(updated);
      // Re-sync sidebar form from updated ticket
      setSidebarForm({
        statusId: updated.statusId || '',
        priorityId: updated.priorityId || '',
        assignedUserId: updated.assignedUserId || '',
        firmId: updated.firmId || '',
        productId: updated.productId || '',
        scope: updated.scope || '',
      });
      loadActivity();
    } catch (err) {
      alert('Güncelleme hatası:\n' + err.message);
    } finally {
      setSavingSidebar(false);
    }
  };

  // Discard sidebar changes
  const handleDiscardSidebar = () => {
    if (!ticket) return;
    setSidebarForm({
      statusId: ticket.statusId || '',
      priorityId: ticket.priorityId || '',
      assignedUserId: ticket.assignedUserId || '',
      firmId: ticket.firmId || '',
      productId: ticket.productId || '',
      scope: ticket.scope || '',
    });
    // Reload firm products for original firm
    if (ticket.firmId) {
      firmsApi.getProducts(ticket.firmId).then(setFirmProducts).catch(() => setFirmProducts([]));
    } else {
      setFirmProducts([]);
    }
  };

  const availableLabels = allLabels.filter(
    (label) => !ticket?.ticketLabels?.some((tl) => tl.labelId === label.id)
  );

  // Sidebar color lookups based on local form state
  const sidebarStatus = allStatuses.find((s) => String(s.id) === String(sidebarForm?.statusId));
  const sidebarPriority = allPriorities.find((p) => String(p.id) === String(sidebarForm?.priorityId));

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
                {ticket.content ? (
                  <div
                    className="tiptap-editor text-sm text-surface-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: ticket.content }}
                    onClick={handleContentClick}
                  />
                ) : (
                  <p className="text-sm text-surface-400">Aciklama eklenmemis.</p>
                )}
              </div>
            </div>

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
                  {activity.map((item) => (
                    <div key={item.id} className="px-6 py-3">
                      <div className="flex items-center gap-2 text-xs text-surface-500">
                        <Edit3 className="w-3.5 h-3.5 text-primary-500" />
                        <span className="font-medium text-surface-700">{item.user?.name || 'Sistem'}</span>
                        <span>{renderWithHashtags(item.description, navigate)}</span>
                        {item.oldValue && (
                          <span className="line-through text-surface-400">{item.oldValue}</span>
                        )}
                        {item.newValue && (
                          <>
                            <span className="text-surface-400">→</span>
                            <span className="font-medium text-surface-800">{item.newValue}</span>
                          </>
                        )}
                        <span className="text-surface-400 ml-auto">{formatDateTime(item.actionDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-surface-400">Henuz aktivite yok</p>
                </div>
              )}

              <div className="px-6 py-4 border-t border-surface-200">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-medium text-white shrink-0">
                    A
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      ref={commentInputRef}
                      placeholder="Yorum ekle... (# ile referans verin)"
                      rows={2}
                      value={newComment}
                      onChange={handleCommentChange}
                      onKeyDown={handleCommentKeyDown}
                      onBlur={() => setTimeout(() => setShowMentionPopup(false), 200)}
                      className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    />
                    {showMentionPopup && mentionSuggestions.length > 0 && (
                      <div ref={mentionPopupRef} className="mention-dropdown" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px' }}>
                        {mentionSuggestions.map((item, idx) => (
                          <button
                            key={`${item.type}-${item.id}`}
                            className={`mention-dropdown-item ${idx === mentionIndex ? 'is-selected' : ''}`}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
                          >
                            {item.type === 'ticket' ? (
                              <>
                                <TicketIcon className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                                <span className="font-mono text-primary-600">#{item.id}</span>
                                <span className="truncate text-surface-700">{item.label}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center text-[10px] font-medium text-surface-600 shrink-0 overflow-hidden border border-surface-200">
                                  {item.avatarUrl ? (
                                    <img src={item.avatarUrl} alt={item.label} className="w-full h-full object-cover" />
                                  ) : (
                                    item.label?.charAt(0)
                                  )}
                                </div>
                                <span className="truncate text-surface-700">{item.label}</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-surface-400">Ctrl+Enter ile gonder | # ile referans</span>
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

              <SidebarSelect
                icon={CheckCircle2}
                label="Durum"
                value={sidebarForm?.statusId || ''}
                options={[
                  { value: '', label: 'Seçiniz...' },
                  ...allStatuses.map((s) => ({ value: s.id, label: s.name })),
                ]}
                onChange={(val) => updateSidebarField('statusId', val)}
                colorDot={getColorDot(sidebarStatus)}
                selectStyle={getSelectStyle(sidebarStatus)}
              />

              <SidebarSelect
                icon={AlertCircle}
                label="Öncelik"
                value={sidebarForm?.priorityId || ''}
                options={[
                  { value: '', label: 'Seçiniz...' },
                  ...allPriorities.map((p) => ({ value: p.id, label: p.name })),
                ]}
                onChange={(val) => updateSidebarField('priorityId', val)}
                colorDot={getColorDot(sidebarPriority)}
                selectStyle={getSelectStyle(sidebarPriority)}
              />

              <SidebarSelect
                icon={UserPlus}
                label="Atanan Kişi"
                value={sidebarForm?.assignedUserId || ''}
                options={[
                  { value: '', label: 'Atanmadı' },
                  ...allUsers.map((u) => ({ value: u.id, label: u.name })),
                ]}
                onChange={(val) => updateSidebarField('assignedUserId', val)}
                avatarUrl={allUsers.find(u => u.id === Number(sidebarForm?.assignedUserId || ticket?.assignedUserId))?.avatarUrl}
              />

              <SidebarSelect
                icon={Building2}
                label="Firma"
                value={sidebarForm?.firmId || ''}
                options={[
                  { value: '', label: 'Belirtilmedi' },
                  ...allFirms.map((f) => ({ value: f.id, label: f.name })),
                ]}
                onChange={(val) => updateSidebarField('firmId', val)}
                avatarUrl={allFirms.find(f => f.id === Number(sidebarForm?.firmId || ticket?.firmId))?.avatarUrl}
              />

              <SidebarSelect
                icon={Package}
                label="Ürün"
                value={sidebarForm?.productId || ''}
                options={[
                  { value: '', label: sidebarForm?.firmId ? 'Belirtilmedi' : 'Firma seçin' },
                  ...(sidebarForm?.firmId ? firmProducts : []).map((p) => ({ value: p.id, label: p.name })),
                ]}
                onChange={(val) => updateSidebarField('productId', val)}
                avatarUrl={firmProducts.find(p => p.id === Number(sidebarForm?.productId || ticket?.productId))?.avatarUrl}
              />

              <SidebarSelect
                icon={Globe}
                label="Kapsam"
                value={sidebarForm?.scope || ''}
                options={[
                  { value: '', label: 'Belirtilmedi' },
                  { value: 'Yerel', label: 'Yerel' },
                  { value: 'Genel', label: 'Genel' },
                ]}
                onChange={(val) => updateSidebarField('scope', val)}
              />

              <SidebarItem
                icon={User}
                label="Olusturan"
                value={
                  ticket.createdUser ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-surface-200 overflow-hidden flex items-center justify-center text-[10px] font-medium text-surface-600 border border-surface-200">
                        {ticket.createdUser.avatarUrl ? (
                          <img src={ticket.createdUser.avatarUrl} alt={ticket.createdUser.name} className="w-full h-full object-cover" />
                        ) : (
                          ticket.createdUser.name?.charAt(0)
                        )}
                      </div>
                      {ticket.createdUser.name}
                    </div>
                  ) : (
                    <span className="text-surface-400">Bilinmiyor</span>
                  )
                }
              />
            </div>

            {/* Save / Discard buttons for sidebar */}
            {hasSidebarChanges && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSidebar}
                  disabled={savingSidebar}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingSidebar ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  onClick={handleDiscardSidebar}
                  disabled={savingSidebar}
                  className="px-3 py-2 text-sm font-medium text-surface-600 bg-surface-0 border border-surface-200 rounded-lg hover:bg-surface-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
              </div>
            )}

            {/* Labels */}
            <div className="bg-surface-0 rounded-xl border border-surface-200 p-4">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Etiketler
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {ticket.ticketLabels && ticket.ticketLabels.length > 0 ? (
                  ticket.ticketLabels.map((tl) => (
                    <span
                      key={tl.labelId || tl.label?.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-surface-100 text-surface-700"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tl.label?.colorHex || '#6B7280' }}
                      />
                      {tl.label?.name}
                      <button
                        onClick={() => handleRemoveLabel(tl.labelId || tl.label?.id)}
                        className="p-0.5 hover:text-danger transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-surface-400">Etiket yok</span>
                )}
                <div className="relative" ref={labelPickerRef}>
                  <button
                    onClick={() => setShowLabelPicker(!showLabelPicker)}
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-surface-400 border border-dashed border-surface-300 rounded-full hover:text-surface-600 hover:border-surface-400 transition-colors cursor-pointer"
                  >
                    + Ekle
                  </button>
                  {showLabelPicker && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-surface-0 rounded-lg border border-surface-200 shadow-lg z-10">
                      {availableLabels.length > 0 ? (
                        <div className="py-1 max-h-48 overflow-y-auto">
                          {availableLabels.map((label) => (
                            <button
                              key={label.id}
                              onClick={() => handleAddLabel(label.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: label.colorHex || '#6B7280' }}
                              />
                              {label.name}
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

function SidebarSelect({ icon: Icon, label, value, options, onChange, colorDot, selectStyle, avatarUrl }) {
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
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0 border border-surface-200" />
        ) : colorDot ? (
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorDot }} />
        ) : null}

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
  if (status?.colorHex) {
    const rgb = hexToRgb(status.colorHex);
    if (rgb) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full"
          style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`, color: status.colorHex }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.colorHex }} />
          {status.name || 'Yeni'}
        </span>
      );
    }
  }
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

function renderWithHashtags(text, navigate) {
  if (!text) return text;
  const parts = text.split(/(#\d+)/g);
  return parts.map((part, i) => {
    const match = part.match(/^#(\d+)$/);
    if (match) {
      const ticketId = match[1];
      return (
        <a
          key={i}
          href={`/tickets/${ticketId}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/tickets/${ticketId}`); }}
          className="hashtag-mention hashtag-ticket inline"
        >
          #{ticketId}
        </a>
      );
    }
    return part;
  });
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