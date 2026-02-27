import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Building2,
  Package,
  Globe,
  Tag,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Quote,
  Code,
  Undo2,
  Redo2,
  ImagePlus,
  Paperclip,
  Link as LinkIcon,
  Highlighter,
  X,
  Minus,
} from 'lucide-react';
import Header from '../components/Header';
import { ticketsApi, firmsApi, prioritiesApi, labelsApi, statusesApi } from '../services/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [firms, setFirms] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [firmProducts, setFirmProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [allLabels, setAllLabels] = useState([]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const labelPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    priorityId: '',
    statusId: '',
    firmId: '',
    productId: '',
    scope: '',
    selectedLabels: [],
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Detayli aciklama yazin...' }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  // Set default priority to "Düşük" once priorities are loaded
  useEffect(() => {
    if (priorities.length > 0 && !form.priorityId) {
      const dusuk = priorities.find(
        (p) => p.name && p.name.toLowerCase().includes('düşük')
      );
      if (dusuk) {
        setForm((prev) => ({ ...prev, priorityId: String(dusuk.id) }));
      }
    }
  }, [priorities]);

  // Set default status to "Yeni Talep" once statuses are loaded
  useEffect(() => {
    if (statuses.length > 0 && !form.statusId) {
      const yeniTalep = statuses.find(
        (s) => s.name && (s.name.toLowerCase().includes('yeni') || s.name.toLowerCase().includes('new'))
      );
      if (yeniTalep) {
        setForm((prev) => ({ ...prev, statusId: String(yeniTalep.id) }));
      }
    }
  }, [statuses]);

  useEffect(() => {
    firmsApi.getAll().then(setFirms).catch(() => {});
    prioritiesApi.getAll().then(setPriorities).catch(() => {});
    statusesApi.getAll().then(setStatuses).catch(() => {});
    labelsApi.getAll().then(setAllLabels).catch(() => {});
  }, []);

  // When firm changes, fetch products for that firm
  useEffect(() => {
    if (!form.firmId) {
      setFirmProducts([]);
      return;
    }
    setLoadingProducts(true);
    firmsApi
      .getProducts(form.firmId)
      .then(setFirmProducts)
      .catch(() => setFirmProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [form.firmId]);

  // Close label picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (labelPickerRef.current && !labelPickerRef.current.contains(e.target)) {
        setShowLabelPicker(false);
      }
    };
    if (showLabelPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLabelPicker]);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFirmChange = (e) => {
    const newFirmId = e.target.value;
    setForm((prev) => ({ ...prev, firmId: newFirmId, productId: '' }));
  };

  const handleAddLabel = (label) => {
    setForm((prev) => ({
      ...prev,
      selectedLabels: [...prev.selectedLabels, label],
    }));
    setShowLabelPicker(false);
  };

  const handleRemoveLabel = (labelId) => {
    setForm((prev) => ({
      ...prev,
      selectedLabels: prev.selectedLabels.filter((l) => l.id !== labelId),
    }));
  };

  const availableLabels = allLabels.filter(
    (label) => !form.selectedLabels.some((sl) => sl.id === label.id)
  );

  // File upload handler
  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        setAttachments((prev) => [...prev, { ...data, originalName: file.name }]);
      }
    } catch (err) {
      alert('Dosya yuklenemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, []);

  // Image upload for inline embed
  const handleImageUpload = useCallback(async (files) => {
    if (!files || files.length === 0 || !editor) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      }
    } catch (err) {
      alert('Resim yuklenemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Link URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const htmlContent = editor?.getHTML() || '';
      // Build content with attachments list appended
      let finalContent = htmlContent;
      if (attachments.length > 0) {
        const attachmentHtml = attachments
          .map((a) => `<p><a href="${a.url}" target="_blank">${a.name}</a></p>`)
          .join('');
        finalContent += `<hr/><p><strong>Ekler:</strong></p>${attachmentHtml}`;
      }

      const payload = {
        title: form.title,
        content: finalContent,
        priorityId: form.priorityId ? Number(form.priorityId) : null,
        statusId: form.statusId ? Number(form.statusId) : null,
        firmId: form.firmId ? Number(form.firmId) : null,
        assignedUserId: null,
        productId: form.productId ? Number(form.productId) : null,
        scope: form.scope || null,
      };
      const created = await ticketsApi.create(payload);

      // Add labels to the created ticket
      if (form.selectedLabels.length > 0 && created?.id) {
        for (const label of form.selectedLabels) {
          try {
            await ticketsApi.addLabel(created.id, label.id, 1);
          } catch {
            // Ignore label add errors
          }
        }
      }

      navigate('/tickets');
    } catch (err) {
      console.error('Ticket create error:', err);
      alert('Ticket olusturulurken hata olustu:\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const productDisabled = !form.firmId;

  const priorityDotColor = (name) => {
    if (!name) return '#9CA3AF';
    const n = name.toLowerCase();
    if (n.includes('kritik') || n.includes('critical')) return '#EF4444';
    if (n.includes('yüksek') || n.includes('high')) return '#F59E0B';
    if (n.includes('düşük') || n.includes('low')) return '#9CA3AF';
    return '#3B82F6';
  };

  const selectedPriority = priorities.find((p) => String(p.id) === String(form.priorityId));

  return (
    <div>
      <Header title="Yeni Ticket" />

      <div className="p-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Title + Rich Text Content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Title */}
              <div className="bg-surface-0 rounded-xl border border-surface-200">
                <div className="p-5">
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Baslik <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={update('title')}
                    placeholder="Ticket basligi..."
                    className="input-field"
                  />
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="bg-surface-0 rounded-xl border border-surface-200">
                <div className="px-5 pt-4 pb-2">
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Detay
                  </label>
                </div>
                {/* Toolbar */}
                {editor && (
                  <div className="px-4 pb-2 flex flex-wrap items-center gap-0.5 border-b border-surface-200">
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      active={editor.isActive('bold')}
                      title="Kalin"
                    >
                      <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      active={editor.isActive('italic')}
                      title="Italik"
                    >
                      <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      active={editor.isActive('underline')}
                      title="Alti Cizili"
                    >
                      <UnderlineIcon className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      active={editor.isActive('strike')}
                      title="Ustunu Ciz"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleHighlight().run()}
                      active={editor.isActive('highlight')}
                      title="Vurgula"
                    >
                      <Highlighter className="w-4 h-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      active={editor.isActive('heading', { level: 1 })}
                      title="Baslik 1"
                    >
                      <Heading1 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      active={editor.isActive('heading', { level: 2 })}
                      title="Baslik 2"
                    >
                      <Heading2 className="w-4 h-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      active={editor.isActive('bulletList')}
                      title="Madde Listesi"
                    >
                      <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      active={editor.isActive('orderedList')}
                      title="Numarali Liste"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      active={editor.isActive('blockquote')}
                      title="Alinti"
                    >
                      <Quote className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                      active={editor.isActive('codeBlock')}
                      title="Kod Blogu"
                    >
                      <Code className="w-4 h-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      active={editor.isActive({ textAlign: 'left' })}
                      title="Sola Hizala"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      active={editor.isActive({ textAlign: 'center' })}
                      title="Ortala"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      active={editor.isActive({ textAlign: 'right' })}
                      title="Saga Hizala"
                    >
                      <AlignRight className="w-4 h-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Link Ekle">
                      <LinkIcon className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => imageInputRef.current?.click()}
                      title="Resim Ekle"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => fileInputRef.current?.click()}
                      title="Dosya Ekle"
                    >
                      <Paperclip className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={() => editor.chain().focus().setHorizontalRule().run()}
                      title="Yatay Cizgi"
                    >
                      <Minus className="w-4 h-4" />
                    </ToolbarButton>

                    <div className="ml-auto flex items-center gap-0.5">
                      <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Geri Al"
                      >
                        <Undo2 className="w-4 h-4" />
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Ileri Al"
                      >
                        <Redo2 className="w-4 h-4" />
                      </ToolbarButton>
                    </div>
                  </div>
                )}
                {/* Editor Content */}
                <div className="tiptap-editor">
                  <EditorContent editor={editor} />
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="px-4 py-3 border-t border-surface-200">
                    <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
                      Ekler ({attachments.length})
                    </p>
                    <div className="space-y-1.5">
                      {attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                            <span className="truncate text-surface-700">{att.name}</span>
                            <span className="text-xs text-surface-400 shrink-0">
                              {(att.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(i)}
                            className="p-1 text-surface-400 hover:text-danger transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="px-4 py-2 border-t border-surface-200 text-xs text-surface-500">
                    Yukleniyor...
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="btn-secondary"
                >
                  Iptal
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Kaydediliyor...' : 'Olustur'}
                </button>
              </div>
            </div>

            {/* Right Sidebar: Metadata */}
            <div className="space-y-4">
              <div className="bg-surface-0 rounded-xl border border-surface-200 divide-y divide-surface-100">
                {/* Priority */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-50/60 transition-colors">
                  <span className="flex items-center gap-2 text-sm text-surface-500">
                    <AlertCircle className="w-4 h-4" />
                    Oncelik
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: priorityDotColor(selectedPriority?.name),
                      }}
                    />
                    <select
                      value={form.priorityId}
                      onChange={update('priorityId')}
                      className="text-sm font-semibold bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 cursor-pointer max-w-[150px] truncate appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 8px center',
                      }}
                    >
                      <option value="">Seciniz...</option>
                      {priorities.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Firm */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-50/60 transition-colors">
                  <span className="flex items-center gap-2 text-sm text-surface-500">
                    <Building2 className="w-4 h-4" />
                    Firma
                  </span>
                  <select
                    value={form.firmId}
                    onChange={handleFirmChange}
                    className="text-sm font-semibold bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 cursor-pointer max-w-[150px] truncate appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                    }}
                  >
                    <option value="">Seciniz...</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-50/60 transition-colors">
                  <span className="flex items-center gap-2 text-sm text-surface-500">
                    <Package className="w-4 h-4" />
                    Urun
                    {productDisabled && (
                      <span className="text-[10px] text-surface-400">(Firma secin)</span>
                    )}
                  </span>
                  <select
                    value={form.productId}
                    onChange={update('productId')}
                    disabled={productDisabled}
                    className={`text-sm font-semibold bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 cursor-pointer max-w-[150px] truncate appearance-none ${
                      productDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                    }}
                  >
                    <option value="">
                      {loadingProducts
                        ? 'Yukleniyor...'
                        : productDisabled
                          ? 'Firma secin'
                          : 'Seciniz...'}
                    </option>
                    {firmProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scope (Kapsam) */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-50/60 transition-colors">
                  <span className="flex items-center gap-2 text-sm text-surface-500">
                    <Globe className="w-4 h-4" />
                    Kapsam
                  </span>
                  <select
                    value={form.scope}
                    onChange={update('scope')}
                    className="text-sm font-semibold bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 cursor-pointer max-w-[150px] truncate appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                    }}
                  >
                    <option value="">Seciniz...</option>
                    <option value="Yerel">Yerel</option>
                    <option value="Genel">Genel</option>
                  </select>
                </div>
              </div>

              {/* Labels (Etiketler) */}
              <div className="bg-surface-0 rounded-xl border border-surface-200 p-4">
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Etiketler
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {form.selectedLabels.length > 0 ? (
                    form.selectedLabels.map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-surface-100 text-surface-700"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: label.colorHex || '#6B7280' }}
                        />
                        {label.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(label.id)}
                          className="p-0.5 hover:text-danger transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-surface-400">Etiket eklenmedi</span>
                  )}
                  <div className="relative" ref={labelPickerRef}>
                    <button
                      type="button"
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
                                type="button"
                                key={label.id}
                                onClick={() => handleAddLabel(label)}
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
        </form>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors cursor-pointer ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-surface-200 mx-1" />;
}
