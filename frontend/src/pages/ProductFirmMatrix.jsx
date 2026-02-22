import { useEffect, useState, useMemo } from 'react';
import { Check, X, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import { productsApi, firmsApi } from '../services/api';

export default function ProductFirmMatrix() {
  const [products, setProducts] = useState([]);
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);        // "productId-firmId" while toggling
  const [sortBy, setSortBy] = useState(null);         // product id to sort by
  const [sortDir, setSortDir] = useState('desc');      // 'asc' | 'desc'

  const load = () => {
    setLoading(true);
    Promise.all([
      productsApi.getAll().catch(() => []),
      firmsApi.getAll().catch(() => []),
    ])
      .then(([p, f]) => {
        setProducts(p || []);
        setFirms(f || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Build a Set of "productId-firmId" for quick lookup
  const linkedSet = useMemo(() => {
    const s = new Set();
    for (const product of products) {
      if (product.firmProducts) {
        for (const fp of product.firmProducts) {
          s.add(`${product.id}-${fp.firmId}`);
        }
      }
    }
    return s;
  }, [products]);

  const isLinked = (productId, firmId) => linkedSet.has(`${productId}-${firmId}`);

  // Sort firms based on selected product column
  const sortedFirms = useMemo(() => {
    if (!sortBy) return firms;
    return [...firms].sort((a, b) => {
      const aLinked = isLinked(sortBy, a.id) ? 1 : 0;
      const bLinked = isLinked(sortBy, b.id) ? 1 : 0;
      return sortDir === 'desc' ? bLinked - aLinked : aLinked - bLinked;
    });
  }, [firms, sortBy, sortDir, linkedSet]);

  const handleSort = (productId) => {
    if (sortBy === productId) {
      if (sortDir === 'desc') {
        setSortDir('asc');
      } else {
        // Third click → clear sorting
        setSortBy(null);
        setSortDir('desc');
      }
    } else {
      setSortBy(productId);
      setSortDir('desc');
    }
  };

  const handleToggle = async (productId, firmId) => {
    const key = `${productId}-${firmId}`;
    if (saving) return;
    setSaving(key);
    try {
      if (isLinked(productId, firmId)) {
        await productsApi.removeFirm(productId, firmId);
      } else {
        await productsApi.addFirm(productId, firmId);
      }
      // Reload products to refresh firmProducts
      const updatedProducts = await productsApi.getAll().catch(() => products);
      setProducts(updatedProducts || []);
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Güncelleme hatası: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const trueCount = (productId) =>
    firms.filter((f) => isLinked(productId, f.id)).length;

  return (
    <div>
      <Header
        title="Ürün – Firma Matrisi"
        subtitle={`${products.length} ürün, ${firms.length} firma`}
      />

      <div className="p-6">
        <div className="bg-surface-0 rounded-xl border border-surface-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              <span className="ml-2 text-sm text-surface-500">Yükleniyor...</span>
            </div>
          ) : products.length === 0 || firms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-surface-500">
                {products.length === 0 && firms.length === 0
                  ? 'Henüz ürün ve firma eklenmemiş.'
                  : products.length === 0
                    ? 'Henüz ürün eklenmemiş.'
                    : 'Henüz firma eklenmemiş.'}
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-180px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {/* Top-left corner cell */}
                    <th className="sticky left-0 top-0 z-20 bg-surface-50 border-b border-r border-surface-200 px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider min-w-[200px]">
                      Firma
                    </th>
                    {products.map((product) => (
                      <th
                        key={product.id}
                        className="sticky top-0 z-10 bg-surface-50 border-b border-surface-200 px-3 py-3 text-center min-w-[120px] cursor-pointer select-none hover:bg-surface-100 transition-colors"
                        onClick={() => handleSort(product.id)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-surface-800 whitespace-nowrap">
                              {product.name}
                            </span>
                            {sortBy === product.id ? (
                              sortDir === 'desc' ? (
                                <ArrowDown className="w-3 h-3 text-primary-600" />
                              ) : (
                                <ArrowUp className="w-3 h-3 text-primary-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-surface-300" />
                            )}
                          </div>
                          <span className="text-[10px] text-surface-400 font-normal">
                            {trueCount(product.id)}/{firms.length}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedFirms.map((firm, idx) => (
                    <tr
                      key={firm.id}
                      className={idx % 2 === 0 ? 'bg-surface-0' : 'bg-surface-50/40'}
                    >
                      <td className="sticky left-0 z-10 border-r border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-800 whitespace-nowrap bg-inherit">
                        {firm.name}
                      </td>
                      {products.map((product) => {
                        const linked = isLinked(product.id, firm.id);
                        const key = `${product.id}-${firm.id}`;
                        const isSaving = saving === key;

                        return (
                          <td
                            key={product.id}
                            className="px-3 py-2.5 text-center border-surface-100"
                          >
                            <button
                              onClick={() => handleToggle(product.id, firm.id)}
                              disabled={!!saving}
                              className={`
                                inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer
                                ${isSaving
                                  ? 'opacity-50'
                                  : linked
                                    ? 'bg-success/10 text-success hover:bg-success/20 ring-1 ring-success/20'
                                    : 'bg-surface-100 text-surface-300 hover:bg-surface-200 hover:text-surface-500 ring-1 ring-surface-200'
                                }
                              `}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : linked ? (
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
