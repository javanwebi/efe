import type { Express, Request, Response } from 'express';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.resolve('/tmp/sanatpish-asset-cache');
const DELIVERABLES_DIR = path.resolve(process.cwd(), 'deliverables/belt-master-audit');
const SERVER_DATA_DIR = path.resolve(process.cwd(), 'server/data');

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

let cachedSvgLookup: { families: Record<string, any>; skus: Record<string, any> } | null = null;
let cachedImageManifest: {
  verifiedFamilyPhotos: Record<string, Array<{ slotIndex: number; sourceUrl: string }>>;
  verifiedSkuPhotos: Record<string, { sourceUrl: string }>;
} | null = null;

function getSvgLookup() {
  if (!cachedSvgLookup) {
    try {
      const raw = fs.readFileSync(path.join(SERVER_DATA_DIR, 'beltSvgLookup.json'), 'utf8');
      cachedSvgLookup = JSON.parse(raw);
    } catch {
      cachedSvgLookup = { families: {}, skus: {} };
    }
  }
  return cachedSvgLookup!;
}

function getImageManifest() {
  if (!cachedImageManifest) {
    try {
      const raw = fs.readFileSync(path.join(DELIVERABLES_DIR, 'image_manifest.json'), 'utf8');
      cachedImageManifest = JSON.parse(raw);
    } catch {
      cachedImageManifest = { verifiedFamilyPhotos: {}, verifiedSkuPhotos: {} };
    }
  }
  return cachedImageManifest!;
}

function escapeXml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rtl(text: unknown): string {
  const cleaned = String(text ?? '').trim();
  if (!cleaned) return '';
  return `\u202B${escapeXml(cleaned)}\u202C`;
}

function trunc(text: string, maxLen: number): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1) + '…';
}

function fmtNum(val: number | null | undefined, suffix = '', digits = 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  const rounded = Number.isInteger(val) ? String(val) : Number(val.toFixed(digits)).toString();
  return suffix ? `${rounded} ${suffix}` : rounded;
}

function renderFamilySpecSvg(fam: any): string {
  const profilesStr = (fam.dominantProfiles || []).join(', ') || 'STANDARD';
  const pitchStr = fmtNum(fam.pitchMm, 'mm');
  const angleStr = fmtNum(fam.toothAngleDeg, '°');
  const thickStr = fmtNum(fam.beltThicknessMm, 'mm');
  const rows: Array<any> = fam.sampleSkus || [];

  const tableRowsSvg = rows
    .slice(0, 6)
    .map((r, i) => {
      const y = 716 + i * 38;
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F8F5EE';
      return `
      <rect x="62" y="${y - 24}" width="1276" height="36" fill="${bg}" stroke="#E6DFD3" stroke-width="0.8"/>
      <text x="1290" y="${y}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="#E56B1E">${escapeXml(r.sku)}</text>
      <text x="980" y="${y}" text-anchor="end" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="700" fill="#1F2022">${rtl(trunc(r.name, 46))}</text>
      <text x="540" y="${y}" text-anchor="middle" font-family="monospace" font-size="12.5" font-weight="700" fill="#1F2022">${escapeXml(r.profile || '-')}</text>
      <text x="340" y="${y}" text-anchor="middle" font-family="monospace" font-size="12.5" font-weight="700" fill="#1F2022">${escapeXml(fmtNum(r.widthMm, 'mm'))}</text>
      <text x="150" y="${y}" text-anchor="middle" font-family="monospace" font-size="12.5" font-weight="700" fill="#1F2022">${escapeXml(fmtNum(r.lengthMm, 'mm'))}</text>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1020" width="1400" height="1020">
  <rect x="0" y="0" width="1400" height="1020" fill="#FBF8F3"/>
  <rect x="38" y="38" width="1324" height="944" rx="14" fill="#FFFFFF" stroke="#55565A" stroke-width="2"/>
  <rect x="38" y="38" width="1324" height="108" rx="14" fill="#55565A"/>
  <rect x="38" y="142" width="1324" height="6" fill="#E56B1E"/>
  <rect x="62" y="56" width="310" height="68" rx="10" fill="#434448" stroke="#E56B1E" stroke-width="1.5"/>
  <text x="217" y="84" text-anchor="middle" font-family="monospace" font-size="16" font-weight="700" fill="#FFFFFF">${escapeXml(trunc(fam.familyCode, 24))}</text>
  <text x="217" y="109" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="#FFB07C">${escapeXml(trunc(fam.dominantDivision, 30))}</text>
  <text x="1332" y="82" text-anchor="end" font-family="Tahoma, sans-serif" font-size="22" font-weight="800" fill="#FFFFFF">${rtl('شناسنامه مهندسی و جدول مشخصات خانواده تسمه صنعتی')}</text>
  <text x="1332" y="116" text-anchor="end" font-family="Tahoma, sans-serif" font-size="15" font-weight="600" fill="#F4EDE2">${rtl(trunc(fam.familyName, 84))}</text>

  <rect x="62" y="166" width="1276" height="44" rx="8" fill="#F7F3EC" stroke="#E2D9C8" stroke-width="1.2"/>
  <text x="1316" y="194" text-anchor="end" font-family="Tahoma, sans-serif" font-size="13" font-weight="700" fill="#1F2022">${rtl(`استاندارد مرجع: ${fam.dominantStandard}   |   پروفیل: ${profilesStr}   |   برند: ${fam.brand}`)}</text>
  <text x="84" y="194" text-anchor="start" font-family="monospace" font-size="12.5" font-weight="700" fill="#E56B1E">VERIFIED_ENGINEERING_REDRAW</text>

  <rect x="62" y="228" width="1276" height="38" rx="8" fill="#E56B1E"/>
  <text x="1318" y="253" text-anchor="end" font-family="Tahoma, sans-serif" font-size="15" font-weight="800" fill="#FFFFFF">${rtl('بخش اول — مشخصات مهندسی ثابت خانواده (Fixed Family Identity)')}</text>

  <rect x="62" y="280" width="1276" height="310" rx="10" fill="#FFFFFF" stroke="#DCD4C6" stroke-width="1.5"/>
  <line x1="700" y1="280" x2="700" y2="590" stroke="#DCD4C6" stroke-width="1.5"/>
  <g stroke="#E6DFD3" stroke-width="1">
    <line x1="62" y1="342" x2="1338" y2="342"/>
    <line x1="62" y1="404" x2="1338" y2="404"/>
    <line x1="62" y1="466" x2="1338" y2="466"/>
    <line x1="62" y1="528" x2="1338" y2="528"/>
  </g>
  <g font-family="Tahoma, sans-serif" font-size="13.5" font-weight="700">
    <text x="1318" y="318" text-anchor="end" fill="#55565A">${rtl('خانواده و زیرشاخه کاتالوگ:')}</text>
    <text x="1080" y="318" text-anchor="end" fill="#1F2022">${rtl(trunc(`${fam.submenu} ← ${fam.leaf}`, 46))}</text>
    <text x="1318" y="380" text-anchor="end" fill="#55565A">${rtl('پروفیل و گام استاندارد:')}</text>
    <text x="1080" y="380" text-anchor="end" font-family="monospace" fill="#E56B1E">${escapeXml(`Profile: ${profilesStr} | Pitch: ${pitchStr} | Angle: ${angleStr}`)}</text>
    <text x="1318" y="442" text-anchor="end" fill="#55565A">${rtl('ضخامت کل تسمه (Thickness):')}</text>
    <text x="1080" y="442" text-anchor="end" font-family="monospace" fill="#1F2022">${escapeXml(thickStr)}</text>
    <text x="1318" y="504" text-anchor="end" fill="#55565A">${rtl('فرم عرضه و واحد فروش:')}</text>
    <text x="1080" y="504" text-anchor="end" fill="#1F2022">${rtl(`${fam.dominantSupplyForm} (${fam.unit})`)}</text>
    <text x="1318" y="566" text-anchor="end" fill="#55565A">${rtl('تعداد کدهای تسمه عضو خانواده:')}</text>
    <text x="1080" y="566" text-anchor="end" font-family="monospace" fill="#E56B1E">${fam.skuCount} Valid Belt SKUs</text>

    <text x="678" y="318" text-anchor="end" fill="#55565A">${rtl('جنس بدنه تسمه (Body Material):')}</text>
    <text x="450" y="318" text-anchor="end" fill="#1F2022">${rtl(trunc(fam.dominantBodyMaterial, 46))}</text>
    <text x="678" y="380" text-anchor="end" fill="#55565A">${rtl('ساختار کورد کششی (Tensile Cord):')}</text>
    <text x="450" y="380" text-anchor="end" fill="#1F2022">${rtl(trunc(fam.dominantCord, 46))}</text>
    <text x="678" y="442" text-anchor="end" fill="#55565A">${rtl('پوشش پشت / روکش (Backing):')}</text>
    <text x="450" y="442" text-anchor="end" fill="#1F2022">${rtl(trunc(fam.backingOrCoating || 'استاندارد صنعتی بدون روکش اضافه', 46))}</text>
    <text x="678" y="504" text-anchor="end" fill="#55565A">${rtl('استاندارد هندسی مرجع:')}</text>
    <text x="450" y="504" text-anchor="end" font-family="monospace" fill="#1F2022">${escapeXml(trunc(fam.dominantStandard, 44))}</text>
    <text x="678" y="566" text-anchor="end" fill="#55565A">${rtl('وضعیت ممیزی مهندسی:')}</text>
    <text x="450" y="566" text-anchor="end" fill="#15803D">${rtl('تاییدشده طبق دستور مادر صنعت پیش')}</text>
  </g>

  <rect x="62" y="610" width="1276" height="38" rx="8" fill="#55565A"/>
  <text x="1318" y="635" text-anchor="end" font-family="Tahoma, sans-serif" font-size="14.5" font-weight="800" fill="#FFFFFF">${rtl('بخش دوم — نمونه کدهای کالای عضو و پارامترهای متغیر (طول و عرض)')}</text>

  <rect x="62" y="656" width="1276" height="36" fill="#EDE6DA" stroke="#DCD4C6" stroke-width="1"/>
  <text x="1290" y="679" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="800" fill="#55565A">${rtl('کد کالا')}</text>
  <text x="980" y="679" text-anchor="end" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="800" fill="#55565A">${rtl('عنوان فنی در انبار')}</text>
  <text x="540" y="679" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="800" fill="#55565A">${rtl('پروفیل')}</text>
  <text x="340" y="679" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="800" fill="#55565A">${rtl('عرض / مقطع')}</text>
  <text x="150" y="679" text-anchor="middle" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="800" fill="#55565A">${rtl('طول موثر / گام')}</text>
  ${tableRowsSvg}
</svg>`;
}

function renderSkuDrawingSvg(sku: any, mode: 'technical' | 'profile'): string {
  const t = sku.technical || {};
  const profile = t.profile || 'STD';
  const pitchStr = fmtNum(t.pitchMm, 'mm');
  const widthStr = fmtNum(t.nominalWidthMm ?? t.topWidthMm, 'mm');
  const thickStr = fmtNum(t.beltThicknessMm, 'mm');
  const toothHeightStr = fmtNum(t.toothHeightMm, 'mm');
  const angleStr = fmtNum(t.toothAngleDeg, '°');
  const lenStr = t.pitchLengthMm
    ? `Lp = ${fmtNum(t.pitchLengthMm, 'mm')}`
    : t.insideLengthMm
      ? `Li = ${fmtNum(t.insideLengthMm, 'mm')}`
      : t.outsideLengthMm
        ? `La = ${fmtNum(t.outsideLengthMm, 'mm')}`
        : sku.rawSize || 'Per Order';

  const isVbelt = String(t.beltDivision || '').includes('vbelt');
  const isDouble = String(t.sidedness || '').includes('double');

  const toothOrSectionGraphic = isVbelt
    ? `<polygon points="260,340 580,340 510,540 330,540" fill="#55565A" fill-opacity="0.2" stroke="#55565A" stroke-width="3"/>
       <line x1="240" y1="385" x2="600" y2="385" stroke="#E56B1E" stroke-width="2" stroke-dasharray="7,5"/>
       <text x="420" y="322" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#E56B1E">Top Width (b) = ${escapeXml(widthStr)}</text>
       <text x="420" y="575" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#1F2022">Height (h) = ${escapeXml(thickStr)} | Angle = ${escapeXml(angleStr)}</text>`
    : `<path d="M 160 390 L 680 390 L 680 445 L 630 445 L 605 525 L 535 525 L 510 445 L 440 445 L 415 525 L 345 525 L 320 445 L 250 445 L 225 525 L 160 525 Z" fill="#55565A" fill-opacity="0.2" stroke="#55565A" stroke-width="3"/>
       ${isDouble ? `<path d="M 225 390 L 250 325 L 320 325 L 345 390 M 415 390 L 440 325 L 510 325 L 535 390" fill="#55565A" fill-opacity="0.2" stroke="#E56B1E" stroke-width="2.5"/>` : ''}
       <line x1="145" y1="418" x2="695" y2="418" stroke="#E56B1E" stroke-width="2" stroke-dasharray="7,5"/>
       <text x="420" y="305" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#E56B1E">Pitch (p) = ${escapeXml(pitchStr)} | Profile = ${escapeXml(profile)}</text>
       <text x="420" y="575" text-anchor="middle" font-family="monospace" font-size="14" font-weight="700" fill="#1F2022">Total Thickness = ${escapeXml(thickStr)} | Tooth Height = ${escapeXml(toothHeightStr)} | Width = ${escapeXml(widthStr)}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 820" width="1280" height="820">
  <rect x="0" y="0" width="1280" height="820" fill="#FBF8F3"/>
  <rect x="30" y="30" width="1220" height="760" rx="14" fill="#FFFFFF" stroke="#55565A" stroke-width="2"/>
  <rect x="30" y="30" width="1220" height="96" rx="14" fill="#55565A"/>
  <rect x="30" y="122" width="1220" height="6" fill="#E56B1E"/>
  <rect x="54" y="46" width="250" height="60" rx="8" fill="#434448" stroke="#E56B1E" stroke-width="1.5"/>
  <text x="179" y="74" text-anchor="middle" font-family="monospace" font-size="17" font-weight="700" fill="#FFFFFF">SKU: ${escapeXml(sku.skuCode)}</text>
  <text x="179" y="96" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="#FFB07C">${escapeXml(profile)} | ${escapeXml(sku.brand)}</text>
  <text x="1222" y="72" text-anchor="end" font-family="Tahoma, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF">${rtl(mode === 'profile' ? `نقشه مهندسی پروفیل و مقطع کد ${sku.skuCode}` : `نقشه فنی ۴نمایی و ابعاد مهندسی کد ${sku.skuCode}`)}</text>
  <text x="1222" y="102" text-anchor="end" font-family="Tahoma, sans-serif" font-size="14" font-weight="600" fill="#F4EDE2">${rtl(trunc(sku.rawName, 78))}</text>

  <rect x="56" y="152" width="728" height="470" rx="12" fill="#FCFBF9" stroke="#DCD4C6" stroke-width="1.5"/>
  <text x="760" y="184" text-anchor="end" font-family="Tahoma, sans-serif" font-size="14" font-weight="800" fill="#55565A">${rtl('نمای هندسی پروفیل و مقطع استاندارد (Scale CAD Diagram)')}</text>
  ${toothOrSectionGraphic}

  <rect x="804" y="152" width="420" height="470" rx="12" fill="#F8F5EE" stroke="#DCD4C6" stroke-width="1.5"/>
  <rect x="804" y="152" width="420" height="40" rx="10" fill="#E56B1E"/>
  <text x="1204" y="178" text-anchor="end" font-family="Tahoma, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF">${rtl('جدول ابعاد اختصاصی کد کالا')}</text>
  <g font-family="Tahoma, sans-serif" font-size="13" font-weight="700">
    <text x="1204" y="226" text-anchor="end" fill="#55565A">${rtl('کد کالا (SKU):')}</text>
    <text x="824" y="226" text-anchor="start" font-family="monospace" fill="#E56B1E">${escapeXml(sku.skuCode)} (${escapeXml(sku.familyCode)})</text>
    <text x="1204" y="274" text-anchor="end" fill="#55565A">${rtl('پروفیل مقطع:')}</text>
    <text x="824" y="274" text-anchor="start" font-family="monospace" fill="#1F2022">${escapeXml(profile)}</text>
    <text x="1204" y="322" text-anchor="end" fill="#55565A">${rtl('طول تسمه (Length):')}</text>
    <text x="824" y="322" text-anchor="start" font-family="monospace" fill="#1F2022">${escapeXml(lenStr)}</text>
    <text x="1204" y="370" text-anchor="end" fill="#55565A">${rtl('عرض / سایز مقطع:')}</text>
    <text x="824" y="370" text-anchor="start" font-family="monospace" fill="#1F2022">${escapeXml(widthStr)}</text>
    <text x="1204" y="418" text-anchor="end" fill="#55565A">${rtl('ضخامت کل (h):')}</text>
    <text x="824" y="418" text-anchor="start" font-family="monospace" fill="#1F2022">${escapeXml(thickStr)}</text>
    <text x="1204" y="466" text-anchor="end" fill="#55565A">${rtl('تعداد دندانه / شیار:')}</text>
    <text x="824" y="466" text-anchor="start" font-family="monospace" fill="#1F2022">${escapeXml(String(t.toothCount ?? t.ribCount ?? '—'))}</text>
    <text x="1204" y="514" text-anchor="end" fill="#55565A">${rtl('فرم عرضه / واحد:')}</text>
    <text x="824" y="514" text-anchor="start" fill="#1F2022">${rtl(`${t.supplyForm || 'endless-loop'} (${sku.unit || 'حلقه'})`)}</text>
    <text x="1204" y="562" text-anchor="end" fill="#55565A">${rtl('استاندارد مرجع:')}</text>
    <text x="824" y="562" text-anchor="start" font-family="monospace" font-size="11.5" fill="#1F2022">${escapeXml(trunc(t.standardReference || 'ISO / DIN', 32))}</text>
  </g>

  <rect x="56" y="644" width="1168" height="118" rx="10" fill="#55565A"/>
  <text x="1200" y="680" text-anchor="end" font-family="Tahoma, sans-serif" font-size="13.5" font-weight="700" fill="#FFFFFF">${rtl(`جنس بدنه: ${t.bodyMaterial || 'الاستومر صنعتی'}   |   کورد کششی: ${t.tensileCord || 'تقویت‌شده'}`)}</text>
  <text x="1200" y="715" text-anchor="end" font-family="Tahoma, sans-serif" font-size="12.5" font-weight="600" fill="#FFB07C">${rtl('ترسیم مهندسی مبتنی بر ابعاد واقعی کد کالا و جداول استاندارد ISO / DIN (VERIFIED_ENGINEERING_REDRAW)')}</text>
  <text x="80" y="742" text-anchor="start" font-family="monospace" font-size="11.5" font-weight="700" fill="#E5E7EB">SANAT PISH INDUSTRIAL BELT ENGINEERING ARCHIVE</text>
</svg>`;
}

async function proxyUpstreamAsset(
  req: Request,
  res: Response,
  upstreamUrls: string[],
  cacheSubpath: string,
  overrideContentType?: string,
) {
  const safeRelative = cacheSubpath.replace(/^\/+/, '').replace(/\.\./g, '');
  if (!safeRelative) {
    res.status(404).end();
    return;
  }
  const ext = path.extname(safeRelative).toLowerCase();
  const contentType = overrideContentType || MIME_BY_EXT[ext] || 'image/jpeg';
  const cacheFile = path.join(CACHE_DIR, safeRelative);

  try {
    const cached = await fsPromises.readFile(cacheFile);
    if (cached.length > 0) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      res.send(cached);
      return;
    }
  } catch {
    // Cache miss
  }

  for (const upstreamUrl of upstreamUrls) {
    try {
      const response = await fetch(upstreamUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SanatPishCatalog/2.0)' },
      });
      if (!response.ok) continue;
      const respType = (response.headers.get('content-type') || '').toLowerCase();
      if (respType.includes('text/html')) continue;
      const buf = Buffer.from(await response.arrayBuffer());
      if (!buf.length) continue;

      await fsPromises.mkdir(path.dirname(cacheFile), { recursive: true });
      await fsPromises.writeFile(cacheFile, buf).catch(() => undefined);

      res.setHeader('Content-Type', respType || contentType);
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      res.send(buf);
      return;
    } catch {
      // Try next upstream URL
    }
  }

  res.status(404).end();
}

export function registerAssetProxyRoutes(app: Express) {
  // 1. Master Belt Audit API routes (Summary + 17 Deliverable File Downloads)
  app.get('/api/belt-audit/summary', async (_req, res) => {
    try {
      const summaryPath = path.join(SERVER_DATA_DIR, 'beltMasterAuditSummary.json');
      const data = await fsPromises.readFile(summaryPath, 'utf8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load belt master audit summary' });
    }
  });

  app.get('/api/belt-audit/deliverables/:filename', async (req, res) => {
    const safeName = path.basename(String(req.params.filename || ''));
    const filePath = path.join(DELIVERABLES_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Deliverable file not found' });
      return;
    }
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    }
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  // 2. Dynamic Family Images & Specification Sheets
  app.get('/src/assets/catalog/belts/families/:familyCode/:assetFile', async (req, res) => {
    const familyCode = decodeURIComponent(String(req.params.familyCode || ''));
    const assetFile = String(req.params.assetFile || '');

    if (assetFile.startsWith('family-specifications.')) {
      const lookup = getSvgLookup();
      const fam = lookup.families[familyCode];
      if (!fam) {
        res.status(404).end();
        return;
      }
      const svg = renderFamilySpecSvg(fam);
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(svg);
      return;
    }

    const slotMatch = assetFile.match(/^family-image-0([123])\.webp$/);
    if (slotMatch) {
      const slotIdx = Number(slotMatch[1]);
      const imgManifest = getImageManifest();
      const slots = imgManifest.verifiedFamilyPhotos[familyCode] || [];
      const hit = slots.find((s) => s.slotIndex === slotIdx);
      if (!hit || !hit.sourceUrl) {
        res.status(404).end();
        return;
      }
      if (hit.sourceUrl.startsWith('/storage/products/')) {
        const rel = hit.sourceUrl.replace(/^\/storage\/products\//, '');
        const encoded = rel
          .split('/')
          .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
          .join('/');
        await proxyUpstreamAsset(
          req,
          res,
          [`https://sanatpish.com/storage/products/${encoded}`],
          `storage/products/${rel}`,
        );
        return;
      }
      await proxyUpstreamAsset(
        req,
        res,
        [hit.sourceUrl],
        `belt-verified/families/${familyCode}/slot-0${slotIdx}.jpg`,
      );
      return;
    }

    res.status(404).end();
  });

  // 3. Dynamic SKU Real Marking Photos & Technical Drawings
  app.get('/src/assets/catalog/belts/skus/:skuCode/:assetFile', async (req, res) => {
    const skuCode = decodeURIComponent(String(req.params.skuCode || ''));
    const assetFile = String(req.params.assetFile || '');

    if (assetFile === 'real-product-image.webp') {
      const imgManifest = getImageManifest();
      const hit = imgManifest.verifiedSkuPhotos[skuCode];
      if (!hit || !hit.sourceUrl) {
        res.status(404).end();
        return;
      }
      await proxyUpstreamAsset(
        req,
        res,
        [hit.sourceUrl],
        `belt-verified/skus/${skuCode}/real-marking.jpg`,
      );
      return;
    }

    if (assetFile.startsWith('technical-drawing.') || assetFile.startsWith('profile-drawing.')) {
      const lookup = getSvgLookup();
      const sku = lookup.skus[skuCode];
      if (!sku) {
        res.status(404).end();
        return;
      }
      const mode = assetFile.startsWith('profile-drawing.') ? 'profile' : 'technical';
      const svg = renderSkuDrawingSvg(sku, mode);
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(svg);
      return;
    }

    res.status(404).end();
  });

  // 4. Existing Upstream Proxy Routes
  app.get('/storage/products/*', async (req, res) => {
    const rel = req.path.replace(/^\/storage\/products\//, '');
    const encoded = rel
      .split('/')
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    await proxyUpstreamAsset(
      req,
      res,
      [`https://sanatpish.com/storage/products/${encoded}`],
      `storage/products/${rel}`,
    );
  });

  app.get('/images/*', async (req, res) => {
    const rel = req.path.replace(/^\/images\//, '');
    const encoded = rel
      .split('/')
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    await proxyUpstreamAsset(
      req,
      res,
      [
        `https://sanatpish.com/images/${encoded}`,
        `https://raw.githubusercontent.com/javanwebi/script/main/public/images/${encoded}`,
      ],
      `images/${rel}`,
    );
  });

  app.get('/src/assets/catalog/*', async (req, res) => {
    const rel = req.path.replace(/^\/src\/assets\/catalog\//, '');
    const encoded = rel
      .split('/')
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    await proxyUpstreamAsset(
      req,
      res,
      [
        `https://sanatpish.com/src/assets/catalog/${encoded}`,
        `https://raw.githubusercontent.com/javanwebi/script/main/src/assets/catalog/${encoded}`,
      ],
      `catalog/${rel}`,
    );
  });
}
