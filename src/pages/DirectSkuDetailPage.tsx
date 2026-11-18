import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, FileSpreadsheet, Package } from 'lucide-react';
import type { DirectSku } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { ProductImage } from '../components/product/ProductImage';
import { resolveDisplayBrand } from '../utils/catalogBrands';
import { getBeltSkuMedia } from '../utils/beltCatalogMedia';

export const DirectSkuDetailPage: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const { openInquiryModal } = useCatalog();
  const [item, setItem] = useState<DirectSku | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch(`/api/catalog/direct-sku/${encodeURIComponent(decodeURIComponent(code))}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          setStatus('not-found');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!controller.signal.aborted && data?.item) {
          setItem(data.item);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('not-found');
      });
    return () => controller.abort();
  }, [code]);

  if (status === 'loading') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-14 text-center text-xs text-slate-500" dir="rtl">
        در حال دریافت اطلاعات کد کالا...
      </div>
    );
  }

  if (status === 'not-found' || !item) {
    return (
      <main dir="rtl" className="mx-auto max-w-4xl px-4 py-14 text-center space-y-4">
        <Package className="w-10 h-10 text-[#E06518] mx-auto" />
        <h1 className="text-lg font-black text-[#2B313A]">کد کالای مستقیم یافت نشد</h1>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-[#E06518] px-5 py-2.5 text-xs font-bold text-white"
        >
          <span>مشاهده کاتالوگ محصولات</span>
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </main>
    );
  }

  const brandLabel = resolveDisplayBrand(item.brand, item.name);
  const beltSkuMedia = getBeltSkuMedia(undefined, item.skuCode);

  return (
    <main dir="rtl" className="mx-auto max-w-6xl px-4 py-8 space-y-6 text-right">
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link to="/" className="hover:text-[#E06518]">صفحه اصلی</Link>
        <ChevronLeft className="w-3.5 h-3.5" />
        <Link
          to={`/category/${encodeURIComponent(item.categorySlug)}`}
          className="hover:text-[#E06518]"
        >
          {item.categoryName}
        </Link>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="font-mono text-[#2B313A]">{item.skuCode}</span>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start shadow-xs">
        <div className="rounded-2xl border border-slate-200 bg-[#FAF8F5] p-6 aspect-[4/3] grid place-items-center">
          <ProductImage
            src={beltSkuMedia?.profileDrawingWebp || item.imageUrl}
            alt={item.name}
            className="max-h-72 w-full object-contain"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
            <span>
              کد مستقیم: <strong className="font-mono text-[#E06518]" dir="ltr">{item.skuCode}</strong>
            </span>
            {brandLabel && (
              <span>
                برند: <strong className="text-[#2B313A]">{brandLabel}</strong>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-[#2B313A]">{item.name}</h1>

          {item.technicalSpecs && item.technicalSpecs.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs text-right">
                <tbody className="divide-y divide-slate-100">
                  {item.technicalSpecs.map((spec, idx) => (
                    <tr key={`${spec.key}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2.5 font-semibold text-slate-600 w-1/3">{spec.key}</td>
                      <td className="p-2.5 font-bold text-slate-800">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() =>
                openInquiryModal({
                  code: item.skuCode,
                  name: item.name,
                  unit: 'عدد',
                  quantity: 1,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#E06518] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#c85612] cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استعلام قیمت و موجودی</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(item.skuCode).catch(() => {});
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#E06518] cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'کد کپی شد' : 'کپی کد کالا'}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default DirectSkuDetailPage;
