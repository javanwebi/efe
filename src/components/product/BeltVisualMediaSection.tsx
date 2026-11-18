import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Layers,
  Ruler,
  ShieldCheck,
  ZoomIn,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BeltFamilyMedia, BeltSkuMedia } from '../../utils/beltCatalogMedia';
import { toPersianDigits } from '../../utils/formatters';

export interface BeltDocModalPayload {
  title: string;
  webpUrl: string;
  svgUrl: string;
  subtitle?: string;
}

interface BeltVisualMediaSectionProps {
  productName: string;
  beltFamilyMedia: BeltFamilyMedia;
  beltSkuMedia: BeltSkuMedia | null;
  selectedSkuSize?: string;
  selectedSkuName?: string;
  onOpenDocModal: (payload: BeltDocModalPayload) => void;
  onJumpToFamilyGallery?: () => void;
}

export const BeltVisualMediaSection: React.FC<BeltVisualMediaSectionProps> = ({
  productName,
  beltFamilyMedia,
  beltSkuMedia,
  selectedSkuSize,
  selectedSkuName,
  onOpenDocModal,
  onJumpToFamilyGallery,
}) => {
  const familySlots = [
    {
      id: 'fam-img-1',
      slotCode: '01-main.webp',
      url: beltFamilyMedia.familyPhotos[0],
      svgUrl: beltFamilyMedia.familyPhotos[0],
      label: 'جایگاه ۱: نمای اصلی خانواده (01-main)',
      caption: 'نمای کلی تسمه اختصاصی همین خانواده',
      statusTag: beltFamilyMedia.familyPhotos[0] ? 'VERIFIED_FAMILY_IMAGE' : 'NOT_FOUND',
    },
    {
      id: 'fam-img-2',
      slotCode: '02-angle.webp',
      url: beltFamilyMedia.familyPhotos[1],
      svgUrl: beltFamilyMedia.familyPhotos[1],
      label: 'جایگاه ۲: نمای زاویه و دندانه (02-angle)',
      caption: 'مقطع گام و شیارهای استاندارد',
      statusTag: beltFamilyMedia.familyPhotos[1] ? 'VERIFIED_FAMILY_IMAGE' : 'NOT_FOUND',
    },
    {
      id: 'fam-img-3',
      slotCode: '03-detail.webp',
      url: beltFamilyMedia.familyPhotos[2],
      svgUrl: beltFamilyMedia.familyPhotos[2],
      label: 'جایگاه ۳: جزئیات بافت و کورد (03-detail)',
      caption: 'ساختار لایه‌های داخلی و نخ کششی',
      statusTag: beltFamilyMedia.familyPhotos[2] ? 'VERIFIED_FAMILY_IMAGE' : 'NOT_FOUND',
    },
    {
      id: 'fam-spec',
      slotCode: '04-specifications.webp',
      url: beltFamilyMedia.specSheetWebp,
      svgUrl: beltFamilyMedia.specSheetSvg || beltFamilyMedia.specSheetWebp,
      label: 'جایگاه ۴: جدول مهندسی ابعاد (04-specifications)',
      caption: 'مشخصات ثابت و بازه ابعادی خانواده',
      statusTag: beltFamilyMedia.specSheetWebp ? 'VERIFIED_ENGINEERING_REDRAW' : 'NOT_FOUND',
    },
  ];

  const verifiedSlotsCount = familySlots.filter((s) => Boolean(s.url)).length;

  return (
    <section
      dir="rtl"
      aria-label="گالری تخصصی تصاویر و نقشه‌های مهندسی"
      className="space-y-5"
    >
      {/* Part 1: 4 Standardized Slots for the Family */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-black text-[#37383b] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E06518]" />
              <span>جایگاه‌های ۴گانه تصویر خانواده محصول ({productName})</span>
            </h2>
            <p className="text-xs text-slate-500">
              خانواده مرجع:{' '}
              <strong className="font-mono text-slate-700" dir="ltr">
                {beltFamilyMedia.familyCode}
              </strong>{' '}
              — رعایت کامل قوانین ۴ و ۵ دستور مادر (عدم تکرار عکس بین خانواده‌ها؛ جایگاه فاقد عکس اختصاصی به‌صورت شفاف خالی می‌ماند)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#c25111] text-[11px] font-bold">
              {toPersianDigits(verifiedSlotsCount)} از {toPersianDigits(4)} جایگاه دارای سند تاییدشده
            </span>
            <Link
              to="/belt-audit"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>مشاهده گزارش ممیزی و پایلوت</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {familySlots.map((card) =>
            card.url ? (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  onOpenDocModal({
                    title: `${card.label} — ${productName}`,
                    webpUrl: card.url!,
                    svgUrl: card.svgUrl || card.url!,
                    subtitle: `${card.caption} (${card.statusTag})`,
                  })
                }
                className="group rounded-2xl border border-slate-200/90 bg-white overflow-hidden text-right hover:border-[#E06518] hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full bg-[#f8fafc] p-3 flex items-center justify-center overflow-hidden border-b border-slate-100">
                  <img
                    src={card.url}
                    alt={card.label}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <span
                    className="absolute top-2 right-2 rounded-md bg-emerald-900/80 text-white px-2 py-0.5 text-[9.5px] font-mono font-bold"
                    dir="ltr"
                  >
                    {card.statusTag}
                  </span>
                  <span className="absolute top-2.5 left-2.5 rounded-lg bg-slate-900/70 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="p-3 space-y-0.5 bg-[#FAF8F5] flex-1">
                  <div className="text-xs font-black text-[#2B313A]">{card.label}</div>
                  <div className="text-[11px] text-slate-500">{card.caption}</div>
                </div>
              </button>
            ) : (
              <div
                key={card.id}
                className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/75 overflow-hidden text-right flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full p-4 flex flex-col items-center justify-center text-center border-b border-slate-200/70 space-y-2">
                  <span
                    className="rounded-md bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 text-[10px] font-mono font-bold"
                    dir="ltr"
                  >
                    NOT_FOUND ({card.slotCode})
                  </span>
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                  <p className="text-[11px] text-slate-600 font-bold leading-4">
                    تصویر واقعی اختصاصی و غیرتکراری برای این جایگاه ثبت نشده است
                  </p>
                  <p className="text-[10px] text-slate-500 leading-4">
                    طبق قوانین ۴ و ۵، از عکس استوک عمومی یا مشترک سایر خانواده‌ها استفاده نمی‌شود.
                  </p>
                </div>
                <div className="p-3 space-y-0.5 bg-white flex-1">
                  <div className="text-xs font-black text-slate-700">{card.label}</div>
                  <div className="text-[11px] text-slate-500">{card.caption}</div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Part 2: 2 Standardized Slots for the Selected SKU */}
      {beltSkuMedia && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-black text-[#37383b] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#E06518]" />
                <span>اسناد بصری ۲گانه اختصاصی کد کالا (SKU)</span>
              </h2>
              <p className="text-xs text-slate-500">
                جایگاه ۱: عکس واقعی مارکینگ روی تسمه (`01-real-marking`) | جایگاه ۲: نقشه فنی پروفیل و ابعاد (`02-technical-drawing`)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-mono font-bold"
                dir="ltr"
              >
                SKU: {beltSkuMedia.skuCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Slot 01: Real Marking Photo */}
            <article className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#FBF8F3] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-[#37383b] leading-snug">
                    جایگاه اول SKU (`01-real-marking`): عکس واقعی خود تسمه (کد {beltSkuMedia.skuCode})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تطبیق مستقیم برند، پروفیل و سایز چاپ‌شده روی بدنه تسمه
                  </p>
                </div>
                {beltSkuMedia.realImageStatus === 'EXACT_SKU_IMAGE_FOUND' ? (
                  <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>VERIFIED_REAL_PRODUCT_IMAGE</span>
                  </span>
                ) : (
                  <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[10.5px] font-mono font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>NOT_FOUND</span>
                  </span>
                )}
              </div>
              {beltSkuMedia.realImageStatus === 'EXACT_SKU_IMAGE_FOUND' && beltSkuMedia.realProductImage ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenDocModal({
                      title: `تصویر واقعی خود تسمه — کد ${beltSkuMedia.skuCode}`,
                      webpUrl: beltSkuMedia.realProductImage!,
                      svgUrl: beltSkuMedia.realProductImage!,
                      subtitle: `${selectedSkuName || productName} — چاپ روی بدنه مطابق کد کالا`,
                    })
                  }
                  aria-label={`بزرگ‌نمایی تصویر واقعی کد ${beltSkuMedia.skuCode}`}
                  className="group relative flex-1 flex items-center justify-center bg-[#f8fafc] p-3 aspect-[16/10] cursor-zoom-in"
                >
                  <img
                    src={beltSkuMedia.realProductImage}
                    alt={`تصویر واقعی تسمه کد ${beltSkuMedia.skuCode}`}
                    className="w-full h-full object-contain rounded-xl group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/75 text-white px-2.5 py-1 text-[10.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>بزرگ‌نمایی</span>
                  </span>
                </button>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/70 aspect-[16/10] space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <p className="text-xs sm:text-sm font-black text-slate-800">
                      {beltSkuMedia.realImageStatusLabelFa}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-5">
                      تصویر واقعی اختصاصی با مارکینگ دقیق این کد (`{beltSkuMedia.skuCode}`) هنوز ثبت نشده است. طبق قوانین ۴ و ۵ دستور مادر، عکس سایز دیگر یا تصویر تکراری جایگزین نمی‌شود.
                    </p>
                  </div>
                  {onJumpToFamilyGallery && (
                    <button
                      type="button"
                      onClick={onJumpToFamilyGallery}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#E06518] hover:text-[#E06518] px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>مشاهده مشخصات خانواده</span>
                    </button>
                  )}
                </div>
              )}
            </article>

            {/* Slot 02: CAD Technical Drawing */}
            <article className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#FBF8F3] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-[#37383b] leading-snug">
                    جایگاه دوم SKU (`02-technical-drawing`): نقشه فنی پروفیل و ابعاد (کد {beltSkuMedia.skuCode})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate" dir="auto">
                    {selectedSkuSize || selectedSkuName || productName}
                  </p>
                </div>
                {beltSkuMedia.technicalDrawingWebp && beltSkuMedia.technicalDrawingSvg ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDocModal({
                        title: `نقشه فنی کامل ۴نمایی کد ${beltSkuMedia.skuCode}`,
                        webpUrl: beltSkuMedia.technicalDrawingWebp!,
                        svgUrl: beltSkuMedia.technicalDrawingSvg!,
                        subtitle: selectedSkuName || productName,
                      })
                    }
                    className="self-start sm:self-auto shrink-0 min-h-[34px] px-3 py-1 rounded-lg bg-[#E56B1E] hover:bg-[#C95210] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>نقشه ۴نمایی (VERIFIED_ENGINEERING_REDRAW)</span>
                  </button>
                ) : (
                  <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 text-[10.5px] font-mono font-bold">
                    NEEDS_TECHNICAL_DATA
                  </span>
                )}
              </div>
              {beltSkuMedia.profileDrawingWebp && beltSkuMedia.technicalDrawingSvg ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenDocModal({
                      title: `نقشه فنی پروفیل کد ${beltSkuMedia.skuCode}`,
                      webpUrl: beltSkuMedia.profileDrawingWebp!,
                      svgUrl: beltSkuMedia.technicalDrawingSvg!,
                      subtitle: selectedSkuName || productName,
                    })
                  }
                  aria-label={`بزرگ‌نمایی نقشه فنی پروفیل کد ${beltSkuMedia.skuCode}`}
                  className="group relative flex-1 flex items-center justify-center bg-white p-3 aspect-[16/10] cursor-zoom-in"
                >
                  <img
                    src={beltSkuMedia.profileDrawingWebp}
                    alt={`نقشه فنی پروفیل و مشخصات ابعادی تسمه کد ${beltSkuMedia.skuCode}`}
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </button>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-rose-50/40 aspect-[16/10] space-y-2">
                  <AlertCircle className="w-7 h-7 text-rose-500" />
                  <p className="text-xs sm:text-sm font-black text-slate-800">
                    تولید نقشه فنی متوقف شده است (NEEDS_TECHNICAL_DATA)
                  </p>
                  <p className="text-[11px] text-slate-600 max-w-md leading-5">
                    طبق قانون ۱ دستور مادر، به دلیل وجود ابهام در ابعاد/پروفیل این کد کالا (`PENDING_REVIEW`)، هیچ نقشه فنی حدسی یا بدون داده معتبر ترسیم نمی‌شود.
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
};
