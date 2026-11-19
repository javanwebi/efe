import verifiedMedia from '../generated/verifiedBeltMedia.json';
import beltManifestRaw from '../generated/beltCatalogManifest';
import type { Product, ProductGalleryImage } from '../types';

export interface BeltManifestFamilyEntry {
  s:
    | 'excel-v2-1-1'
    | 'excel-v2-1-2'
    | 'excel-v2-1-3'
    | 'excel-v2-1-4'
    | 'excel-v2-1-5'
    | 'excel-v2-2-1';
  d: string;
  db: string | null;
  p: [string | null, string | null, string | null, string | null];
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
  aliases?: Record<string, string>;
  families: Record<string, BeltManifestFamilyEntry>;
  skus: Record<string, string>;
}

const manifest = beltManifestRaw as unknown as BeltCatalogManifest;
const EXCLUDED_FAMILY_SET = new Set<string>(manifest.excludedFamilyIds || []);
const EXCLUDED_MIXED_SKU_SET = new Set<string>(manifest.excludedMixedSkuIds || []);
const familyPhotosByCode: Record<string, readonly (string | null)[]> = verifiedMedia.families;
const skuPhotosByCode: Record<string, string> = verifiedMedia.skus;

type DrawingStatus = 'VERIFIED_OFFICIAL_DRAWING' | 'ENGINEERING_REDRAW';
type DocumentEntry = { path: string; status: DrawingStatus };
const documentsByCode: Record<string, Partial<Record<'technicalDrawing' | 'profileDrawing' | 'specificationSheet', DocumentEntry>>> =
  verifiedMedia.documents;
const categoryPhotos: Record<string, string> = verifiedMedia.categories;
const beltCategorySlugs = new Set(['excel-v2-1-1', 'excel-v2-1-2', 'excel-v2-1-3', 'excel-v2-1-4', 'excel-v2-1-5', 'excel-v2-2-1']);

export function isBeltMediaCategory(slug: string): boolean {
  return beltCategorySlugs.has(slug);
}

export function getBeltCategoryPhoto(slug: string): string | null {
  return publicAsset(categoryPhotos[slug]);
}

export const missingBeltSkuPhotoLabel = 'تصویر واقعی اختصاصی این کد کالا هنوز تأیید نشده است.';

function publicAsset(path?: string | null): string | null {
  return path ? (import.meta.env?.BASE_URL || '/') + path.slice(1) : null;
}

export interface BeltFamilyMedia {
  familyCode: string;
  menuCategorySlug: string;
  dominantDivision: string;
  existingDbImage: string | null;
  hasVerifiedRealPhoto: boolean;
  cardPreviewSvg: string | null;
  primaryThumbnail: string | null;
  familyPhotos: [string | null, string | null, string | null, string | null];
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
  technicalDrawingStatus: DrawingStatus | 'NEEDS_TECHNICAL_DATA';
  realProductImage: string | null;
  realImageStatus: 'VERIFIED_REAL_SKU_PHOTO' | 'REAL_IMAGE_NOT_FOUND';
  realImageStatusLabelFa: string;
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
  if (clean && !EXCLUDED_FAMILY_SET.has(clean)) {
    const aliased = manifest.aliases?.[clean];
    if (aliased && Object.prototype.hasOwnProperty.call(manifest.families, aliased)) {
      return aliased;
    }
    if (Object.prototype.hasOwnProperty.call(manifest.families, clean)) {
      return clean;
    }
  }
  if (clean && EXCLUDED_FAMILY_SET.has(clean)) {
    return null;
  }
  for (const legacy of hints?.legacyFamilyCodes || []) {
    const c = String(legacy || '').trim();
    if (!c || EXCLUDED_FAMILY_SET.has(c)) continue;
    const aliasedLegacy = manifest.aliases?.[c];
    if (aliasedLegacy && Object.prototype.hasOwnProperty.call(manifest.families, aliasedLegacy)) {
      return aliasedLegacy;
    }
    if (Object.prototype.hasOwnProperty.call(manifest.families, c)) {
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
  const [first, second, third, fourth] = familyPhotosByCode[manifestFamilyCode] || [];
  const familyPhotos: BeltFamilyMedia['familyPhotos'] = [
    publicAsset(first), publicAsset(second), publicAsset(third), publicAsset(fourth),
  ];
  const primaryThumbnail = familyPhotos.find(Boolean) || null;
  const documents = documentsByCode[manifestFamilyCode];

  return {
    familyCode: manifestFamilyCode,
    menuCategorySlug: entry.s,
    dominantDivision: entry.d,
    existingDbImage: null,
    hasVerifiedRealPhoto: Boolean(primaryThumbnail),
    cardPreviewSvg: publicAsset(documents?.profileDrawing?.path),
    primaryThumbnail,
    familyPhotos,
    specSheetWebp: null,
    specSheetSvg: publicAsset(documents?.specificationSheet?.path),
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
  if (cleanFamily && cleanFamily !== mappedFamily
      && resolveBeltManifestFamilyCode(cleanFamily, hints) !== mappedFamily) return null;

  const realProductImage = publicAsset(skuPhotosByCode[cleanSku]);
  const documents = documentsByCode[cleanSku];
  return {
    skuCode: cleanSku,
    familyCode: mappedFamily,
    technicalDrawingWebp: null,
    technicalDrawingSvg: publicAsset(documents?.technicalDrawing?.path),
    profileDrawingWebp: null,
    profileDrawingSvg: publicAsset(documents?.profileDrawing?.path),
    technicalDrawingStatus: documents?.technicalDrawing?.status || documents?.profileDrawing?.status || 'NEEDS_TECHNICAL_DATA',
    realProductImage,
    realImageStatus: realProductImage ? 'VERIFIED_REAL_SKU_PHOTO' : 'REAL_IMAGE_NOT_FOUND',
    realImageStatusLabelFa: realProductImage ? 'عکس واقعی این کد کالا' : missingBeltSkuPhotoLabel,
  };
}

export function buildBeltGalleryImages(
  product: Pick<Product, 'code' | 'legacyFamilyCodes' | 'name' | 'variants'>,
  baseGallery: ProductGalleryImage[],
  activeSkuCode?: string | null,
): ProductGalleryImage[] {
  const hints = { variants: product.variants, legacyFamilyCodes: product.legacyFamilyCodes };
  const family = getBeltFamilyMedia(product.code, null, hints);
  if (!family) return baseGallery;
  if (activeSkuCode) {
    const sku = getBeltSkuMedia(undefined, activeSkuCode);
    return sku?.realProductImage ? [{
      id: 'belt-sku-' + sku.skuCode,
      url: sku.realProductImage,
      scope: 'variant',
      variantCode: sku.skuCode,
      title: 'عکس واقعی کد ' + sku.skuCode,
      order: 1,
    }] : [];
  }
  return family.familyPhotos.flatMap((url, index) => url ? [{
    id: 'belt-family-' + (index + 1),
    url,
    scope: 'family',
    title: 'عکس خانواده ' + product.name,
    order: index + 1,
  }] : []);
}
