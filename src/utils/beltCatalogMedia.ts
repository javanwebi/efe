import beltManifestRaw from '../generated/beltCatalogManifest';
import type { Product, ProductGalleryImage } from '../types';

export interface BeltManifestFamilyEntry {
  s: 'excel-v2-1-1' | 'excel-v2-1-2' | 'excel-v2-1-3' | 'excel-v2-1-4';
  d: string;
  db: string | null;
  p: [string | null, string | null, string | null];
}

export interface BeltCatalogManifest {
  version: number;
  generatedAt: string;
  totals: {
    realBeltFamilies: number;
    realBeltSkus: number;
    excludedPureNonBeltFamilies: number;
    excludedMixedNonBeltSkus: number;
    exactVerifiedRealSkuImages: number;
  };
  excludedFamilyIds: string[];
  excludedMixedSkuIds: string[];
  pendingReviewSkuIds?: string[];
  exactRealSkuIds: string[];
  families: Record<string, BeltManifestFamilyEntry>;
  skus: Record<string, string>;
}

const manifest = beltManifestRaw as unknown as BeltCatalogManifest;
const EXCLUDED_FAMILY_SET = new Set<string>(manifest.excludedFamilyIds || []);
const EXCLUDED_MIXED_SKU_SET = new Set<string>(manifest.excludedMixedSkuIds || []);
const PENDING_REVIEW_SKU_SET = new Set<string>(manifest.pendingReviewSkuIds || []);
const EXACT_REAL_SKU_SET = new Set<string>(manifest.exactRealSkuIds || []);

export interface BeltFamilyMedia {
  familyCode: string;
  menuCategorySlug: string;
  dominantDivision: string;
  existingDbImage: string | null;
  primaryThumbnail: string;
  familyPhotos: [string | null, string | null, string | null];
  specSheetWebp: string | null;
  specSheetSvg: string | null;
}

export interface BeltSkuMedia {
  skuCode: string;
  familyCode: string;
  technicalDrawingWebp: string | null;
  technicalDrawingSvg: string | null;
  profileDrawingWebp: string | null;
  profileDrawingSvg: string | null;
  technicalDrawingStatus: 'VERIFIED_ENGINEERING_REDRAW' | 'NEEDS_TECHNICAL_DATA';
  realProductImage: string | null;
  realImageStatus: 'EXACT_SKU_IMAGE_FOUND' | 'REAL_IMAGE_NOT_FOUND';
  realImageStatusLabelFa: string;
}

function normalizeOfficialDbImage(candidate?: string | null): string | null {
  const clean = String(candidate || '').trim();
  if (/^\/storage\/products\/(catalog\/e\([1-9]\d{0,3}\)\.png|thumbs\/e\([1-9]\d{0,3}\)\.webp)$/i.test(clean)) {
    return clean;
  }
  return null;
}

export function getBeltManifestTotals() {
  return manifest.totals;
}

export interface BeltFamilyHints {
  variants?: Array<{ code?: string | null }> | null;
  legacyFamilyCodes?: string[] | null;
}

export function resolveBeltManifestFamilyCode(
  familyCode?: string | null,
  hints?: BeltFamilyHints,
): string | null {
  const clean = String(familyCode || '').trim();
  if (clean && !EXCLUDED_FAMILY_SET.has(clean) && Object.prototype.hasOwnProperty.call(manifest.families, clean)) {
    return clean;
  }
  if (clean && EXCLUDED_FAMILY_SET.has(clean)) {
    return null;
  }
  for (const legacy of hints?.legacyFamilyCodes || []) {
    const c = String(legacy || '').trim();
    if (c && !EXCLUDED_FAMILY_SET.has(c) && Object.prototype.hasOwnProperty.call(manifest.families, c)) {
      return c;
    }
  }
  for (const variant of hints?.variants || []) {
    const sku = String(variant?.code || '').trim();
    if (!sku || EXCLUDED_MIXED_SKU_SET.has(sku)) continue;
    const mapped = manifest.skus[sku];
    if (mapped && !EXCLUDED_FAMILY_SET.has(mapped) && Object.prototype.hasOwnProperty.call(manifest.families, mapped)) {
      return mapped;
    }
  }
  return null;
}

export function isExcludedBeltFamily(familyCode?: string | null): boolean {
  const clean = String(familyCode || '').trim();
  return Boolean(clean && EXCLUDED_FAMILY_SET.has(clean));
}

export function isRealBeltFamily(familyCode?: string | null, hints?: BeltFamilyHints): boolean {
  return Boolean(resolveBeltManifestFamilyCode(familyCode, hints));
}

export function isExcludedBeltSku(skuCode?: string | null): boolean {
  const clean = String(skuCode || '').trim();
  return Boolean(clean && EXCLUDED_MIXED_SKU_SET.has(clean));
}

export function isRealBeltSku(skuCode?: string | null): boolean {
  const clean = String(skuCode || '').trim();
  if (!clean || EXCLUDED_MIXED_SKU_SET.has(clean)) return false;
  return Object.prototype.hasOwnProperty.call(manifest.skus, clean);
}

export function getBeltFamilyMedia(
  familyCode?: string | null,
  _existingImageOverride?: string | null,
  hints?: BeltFamilyHints,
): BeltFamilyMedia | null {
  const manifestFamilyCode = resolveBeltManifestFamilyCode(familyCode, hints);
  if (!manifestFamilyCode) return null;
  const entry = manifest.families[manifestFamilyCode];
  // Only accept entry.db if it passed strict visual verification in the manifest
  const dbImg = normalizeOfficialDbImage(entry.db);
  const base = `/src/assets/catalog/belts/families/${encodeURIComponent(manifestFamilyCode)}`;
  const photo1 = entry.p[0] ? `${base}/family-image-01.webp` : null;
  const photo2 = entry.p[1] ? `${base}/family-image-02.webp` : null;
  const photo3 = entry.p[2] ? `${base}/family-image-03.webp` : null;
  const hasSpecSheet = entry.d !== 'service-ambiguous';
  const specSheetWebp = hasSpecSheet ? `${base}/family-specifications.webp` : null;
  const specSheetSvg = hasSpecSheet ? `${base}/family-specifications.svg` : null;

  return {
    familyCode: manifestFamilyCode,
    menuCategorySlug: entry.s,
    dominantDivision: entry.d,
    existingDbImage: dbImg,
    primaryThumbnail: dbImg || photo1 || photo2 || photo3 || specSheetWebp || '',
    familyPhotos: [photo1, photo2, photo3],
    specSheetWebp,
    specSheetSvg,
  };
}

export function getBeltSkuMedia(
  familyCode?: string | null,
  skuCode?: string | null,
  hints?: BeltFamilyHints,
): BeltSkuMedia | null {
  const cleanSku = String(skuCode || '').trim();
  if (!cleanSku || isExcludedBeltSku(cleanSku)) return null;
  const mappedFamily = manifest.skus[cleanSku];
  if (!mappedFamily) return null;
  const cleanFamily = String(familyCode || '').trim();
  if (cleanFamily && cleanFamily !== mappedFamily) {
    const resolvedFamily = resolveBeltManifestFamilyCode(cleanFamily, hints);
    const belongsToVariants = Boolean(
      hints?.variants?.some((v) => String(v?.code || '').trim() === cleanSku),
    );
    if (resolvedFamily !== mappedFamily && !(cleanFamily.startsWith('PFAM-') && belongsToVariants)) {
      return null;
    }
  }
  const base = `/src/assets/catalog/belts/skus/${encodeURIComponent(cleanSku)}`;
  const hasExactReal = EXACT_REAL_SKU_SET.has(cleanSku);
  const isPendingReview = PENDING_REVIEW_SKU_SET.has(cleanSku);

  return {
    skuCode: cleanSku,
    familyCode: mappedFamily,
    technicalDrawingWebp: isPendingReview ? null : `${base}/technical-drawing.webp`,
    technicalDrawingSvg: isPendingReview ? null : `${base}/technical-drawing.svg`,
    profileDrawingWebp: isPendingReview ? null : `${base}/profile-drawing.webp`,
    profileDrawingSvg: isPendingReview ? null : `${base}/profile-drawing.svg`,
    technicalDrawingStatus: isPendingReview ? 'NEEDS_TECHNICAL_DATA' : 'VERIFIED_ENGINEERING_REDRAW',
    realProductImage: hasExactReal ? `${base}/real-product-image.webp` : null,
    realImageStatus: hasExactReal ? 'EXACT_SKU_IMAGE_FOUND' : 'REAL_IMAGE_NOT_FOUND',
    realImageStatusLabelFa: hasExactReal
      ? 'تصویر واقعی کالای فیزیکی تأییدشده (VERIFIED_REAL_PRODUCT_IMAGE)'
      : 'تصویر واقعی اختصاصی یافت نشد (NOT_FOUND — طبق قانون ۵ بدون جایگزینی تصویر تکراری)',
  };
}

export function buildBeltGalleryImages(
  product: Pick<Product, 'code' | 'legacyFamilyCodes' | 'name' | 'image' | 'images' | 'variants'>,
  baseGallery: ProductGalleryImage[],
  activeSkuCode?: string | null,
): ProductGalleryImage[] {
  const hints: BeltFamilyHints = {
    variants: product.variants,
    legacyFamilyCodes: product.legacyFamilyCodes,
  };
  const familyMedia = getBeltFamilyMedia(
    product.code,
    product.images?.find((u) => Boolean(normalizeOfficialDbImage(u))) || product.image,
    hints,
  );
  if (!familyMedia) return baseGallery;
  const result: ProductGalleryImage[] = [];
  const seenKeys = new Set<string>();
  const pushUnique = (img: ProductGalleryImage) => {
    const key = `${img.scope}:${img.variantCode || ''}:${img.url}`;
    if (!img.url || seenKeys.has(key)) return;
    seenKeys.add(key);
    result.push({ ...img, order: result.length + 1 });
  };
  if (familyMedia.existingDbImage) {
    pushUnique({
      id: `belt-db-${product.code}`,
      url: familyMedia.existingDbImage,
      scope: 'family',
      title: `تصویر اصلی کاتالوگ خانواده ${product.name}`,
    });
  }
  const photoLabels = [
    'نمای کلی تسمه (01-main)',
    'نمای زاویه و دندانه (02-angle)',
    'مقطع لایه‌ها و ساختار داخلی (03-detail)',
  ];
  familyMedia.familyPhotos.forEach((url, idx) => {
    if (!url) return;
    pushUnique({
      id: `belt-fam-${product.code}-${idx + 1}`,
      url,
      scope: 'family',
      title: `تصویر واقعی اختصاصی خانواده ${product.name} — ${photoLabels[idx]}`,
    });
  });
  if (familyMedia.specSheetWebp) {
    pushUnique({
      id: `belt-fam-spec-${product.code}`,
      url: familyMedia.specSheetWebp,
      scope: 'family',
      title: `جدول مشخصات و استاندارد ابعاد خانواده ${product.name} (04-specifications)`,
    });
  }
  for (const variant of product.variants || []) {
    if (!variant?.code || isExcludedBeltSku(variant.code)) continue;
    const skuMedia = getBeltSkuMedia(product.code, variant.code, hints);
    if (skuMedia?.realProductImage) {
      pushUnique({
        id: `belt-sku-real-${variant.code}`,
        url: skuMedia.realProductImage,
        scope: 'variant',
        variantCode: variant.code,
        title: `تصویر واقعی کالای فیزیکی کد ${variant.code} (01-real-marking)`,
      });
    }
  }
  const targetSku = String(
    activeSkuCode || product.variants?.find((v) => v?.code && !isExcludedBeltSku(v.code))?.code || '',
  ).trim();
  if (targetSku && !isExcludedBeltSku(targetSku)) {
    const activeSkuMedia = getBeltSkuMedia(product.code, targetSku, hints);
    if (activeSkuMedia?.profileDrawingWebp) {
      pushUnique({
        id: `belt-sku-profile-${targetSku}`,
        url: activeSkuMedia.profileDrawingWebp,
        scope: 'variant',
        variantCode: targetSku,
        title: `نقشه پروفیل و ابعاد مهندسی کد ${targetSku} (02-technical-drawing)`,
      });
    }
  }
  return result;
}
