import React from 'react';
import { ImageOff, ZoomIn } from 'lucide-react';
import type { BeltFamilyMedia, BeltSkuMedia } from '../../utils/beltCatalogMedia';
import { ProductImage } from './ProductImage';

export interface BeltDocModalPayload {
  title: string;
  webpUrl: string;
  svgUrl: string;
  subtitle?: string;
}

interface BeltVisualMediaSectionProps {
  productName: string;
  beltFamilyMedia: BeltFamilyMedia | null;
  beltSkuMedia: BeltSkuMedia | null;
  onOpenDocModal: (payload: BeltDocModalPayload) => void;
}

const slotLabels = ['نمای اصلی', 'نمای زاویه‌دار', 'نمای جزئیات', 'نمای نزدیک'];

export const BeltVisualMediaSection: React.FC<BeltVisualMediaSectionProps> = ({
  productName,
  beltFamilyMedia,
  beltSkuMedia,
  onOpenDocModal,
}) => {
  const documents = [
    { title: 'مقطع پروفیل خانواده', url: beltFamilyMedia?.cardPreviewSvg },
    { title: 'برگه مشخصات خانواده', url: beltFamilyMedia?.specSheetSvg || beltFamilyMedia?.specSheetWebp },
    { title: 'نقشه فنی کد کالا', url: beltSkuMedia?.technicalDrawingSvg || beltSkuMedia?.technicalDrawingWebp },
    { title: 'مقطع پروفیل کد کالا', url: beltSkuMedia?.profileDrawingSvg || beltSkuMedia?.profileDrawingWebp },
  ];

  return (
    <section dir="rtl" className="space-y-5">
      {beltFamilyMedia && (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-black text-slate-800">عکس‌های خانواده</h2>
        <p className="mt-1 text-xs text-slate-600">{productName}</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {beltFamilyMedia.familyPhotos.map((url, index) => {
            const label = slotLabels[index];
            return (
              <li key={label} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {url ? (
                  <button
                    type="button"
                    onClick={() => onOpenDocModal({ title: label, webpUrl: url, svgUrl: url })}
                    className="relative block w-full cursor-zoom-in text-right"
                    aria-label={'بزرگ‌نمایی ' + label}
                  >
                    <ProductImage src={url} disableFallback alt={label} loading="lazy" className="aspect-[4/3] w-full object-contain p-3" />
                    <ZoomIn className="absolute left-2 top-2 h-4 w-4 text-slate-600" aria-hidden="true" />
                    <span className="block px-3 pb-3 text-xs font-bold">{label}</span>
                  </button>
                ) : (
                  <div className="flex min-h-28 flex-col items-center justify-center gap-2 p-3 text-center">
                    <ImageOff className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                    <span className="text-xs text-slate-600">تصویر تأیید نشده است.</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-black text-slate-800">نقشه‌های فنی</h2>
        {documents.some((document) => document.url) ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {documents.map(({ title, url }) => url && (
              <button
                key={title}
                type="button"
                onClick={() => onOpenDocModal({ title, webpUrl: url, svgUrl: url })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
              >
                {title}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-600">نقشه فنی تأییدشده هنوز در دسترس نیست.</p>
        )}
      </div>
    </section>
  );
};
