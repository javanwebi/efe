"""Build storefront media from reviewed records and reconcile the historical audit."""
import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'deliverables/belt-master-audit'
GENERATED = ROOT / 'src/generated'


def rows(name):
    with (AUDIT / name).open(encoding='utf-8-sig', newline='') as file:
        return list(csv.DictReader(file))


def local_file(url):
    if not url.startswith('/belt-catalog/'):
        return None
    public = ROOT / 'public/belt-catalog'
    path = (ROOT / 'public' / unquote(url[1:])).resolve()
    return path if path.is_relative_to(public) and path.is_file() else None


def main(check):
    def emit(path, content):
        if check:
            if not path.is_file() or path.read_text(encoding='utf-8') != content:
                raise SystemExit(f'Stale generated output: {path.relative_to(ROOT)}')
        else:
            path.write_text(content, encoding='utf-8')

    def table(name, fields, records):
        from io import StringIO
        buffer = StringIO()
        writer = csv.DictWriter(buffer, fieldnames=fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows({k: row.get(k, '') for k in fields} for row in records)
        emit(AUDIT / name, buffer.getvalue())

    raw = (GENERATED / 'beltCatalogManifest.ts').read_text(encoding='utf-8')
    manifest = json.JSONDecoder().raw_decode(raw.split(' = ', 1)[1])[0]
    skus, families = manifest['skus'], manifest['families']
    snapshot = json.loads((ROOT / 'server/data/engineeredCatalog.json').read_text(encoding='utf-8'))
    snapshot_families = [
        p for p in snapshot['products']
        if ((p.get('resolvedAssignment') or {}).get('categorySlug') or '').startswith('excel-v2-1')
        or (p.get('resolvedAssignment') or {}).get('categorySlug') == 'excel-v2-2-1'
        or 'FAM-52858' in (p.get('legacyFamilyCodes') or [])
    ]
    actual_family_codes = {p['code'] for p in snapshot['products']}
    actual_sku_codes = {v['code'] for p in snapshot['products'] for v in p.get('variants', [])}
    direct_codes = {d['skuCode'] for d in snapshot['directSkus']}
    actual_sku_codes.update(direct_codes)
    standalone = {code for code in direct_codes if skus.get(code) == 'DIRECT-' + code}
    dangling = {code for code, family in skus.items() if family not in families and code not in standalone}
    audit_rows = rows('complete_sku_audit.csv')
    audit = {r['sku_id']: r for r in audit_rows}
    common = sorted(skus.keys() & audit.keys())
    audit_only = sorted(audit.keys() - skus.keys())
    runtime_only = sorted(skus.keys() - audit.keys())
    differences = [code for code in common if audit[code]['proposed_runtime_pfam_id'] != skus[code]]
    pending = dangling | (skus.keys() - actual_sku_codes) | set(runtime_only) | set(differences) | set(manifest['pendingReviewSkuIds'])
    pending.update(r['sku_id'] for r in audit_rows if r['directive_audit_status'] == 'PENDING_REVIEW')

    historical = json.loads((AUDIT / 'image_manifest.json').read_text(encoding='utf-8'))
    approvals = json.loads((AUDIT / 'media-approvals.json').read_text(encoding='utf-8'))
    storefront = {'families': {}, 'skus': {}, 'categories': {}, 'documents': {}}
    belt_category_slugs = {f'excel-v2-1-{i}' for i in range(1, 6)} | {'excel-v2-2-1'}
    reviewed = json.loads((AUDIT / 'media-candidates.json').read_text(encoding='utf-8'))
    for record in reviewed:
        scope = record['scope']
        code = record['code']
        if scope == 'families':
            historical['verifiedFamilyPhotos'].setdefault(code, []).append(record)
        elif scope == 'skus':
            if code in historical['verifiedSkuPhotos']:
                raise SystemExit(f'Existing SKU candidate: {code}')
            historical['verifiedSkuPhotos'][code] = record

    photo_rows = {'families': [], 'skus': [], 'categories': []}
    hashes = Counter()
    used_approvals = set()
    for scope, key in [('families', 'verifiedFamilyPhotos'), ('skus', 'verifiedSkuPhotos')]:
        for code, candidates in sorted(historical[key].items()):
            for candidate in candidates if isinstance(candidates, list) else [candidates]:
                path = candidate['localPath']
                local = local_file(path)
                digest = hashlib.sha256(local.read_bytes()).hexdigest() if local else ''
                if digest:
                    hashes[digest] += 1
                slot = candidate.get('slotIndex')
                family = code if scope == 'families' else skus.get(code)
                approval = approvals.get(path)
                if approval:
                    used_approvals.add(path)
                if not local:
                    status = 'MISSING_LOCAL_FILE'
                elif family not in families or (scope == 'skus' and family != candidate['familyId']):
                    status = 'NEEDS_IDENTITY_REVIEW'
                elif not approval:
                    status = 'PENDING_RIGHTS'
                else:
                    required = ['sha256', 'reviewDate', 'licenseEvidence', 'identityEvidence']
                    if scope == 'skus':
                        required.append('manufacturerModel')
                    if (not all(approval.get(k) for k in required)
                            or approval['sha256'] != digest
                            or approval.get('visualVerification') != 'verified'):
                        raise SystemExit(f'Incomplete or stale approval: {path}')
                    status = 'VERIFIED_REAL_FAMILY_PHOTO' if slot else 'VERIFIED_REAL_SKU_PHOTO'
                    if slot:
                        if slot not in range(1, 5):
                            raise SystemExit(f'Invalid slot: {path}')
                        slots = storefront[scope].setdefault(code, [None] * 4)
                        if slots[slot - 1]:
                            raise SystemExit(f'Multiple approvals for {code}, slot {slot}')
                        slots[slot - 1] = path
                    else:
                        if code in storefront[scope]:
                            raise SystemExit(f'Multiple approvals for {code}')
                        storefront[scope][code] = path
                photo_rows[scope].append({
                    'code': code, 'family_code': family, 'slot': slot,
                    'source_url': candidate.get('sourcePageUrl'),
                    'source_asset_url': candidate.get('sourceUrl'),
                    'manufacturer': candidate.get('manufacturer'),
                    'manufacturer_model': (approval or {}).get('manufacturerModel'),
                    'historical_marking': candidate.get('visibleMarking'),
                    'historical_visual_note': candidate.get('visualInspectionNoteFa'),
                    'visual_verification': 'verified' if status.startswith('VERIFIED') else 'pending',
                    'license_evidence': (approval or {}).get('licenseEvidence'),
                    'identity_evidence': (approval or {}).get('identityEvidence'),
                    'review_date': (approval or {}).get('reviewDate'),
                    'local_path': path, 'sha256': digest, 'status': status,
                })
    category_status = {slug: {'category_slug': slug, 'status': 'RESEARCH_PENDING'} for slug in sorted(belt_category_slugs)}
    document_status = {}
    for record in reviewed:
        scope, code = record['scope'], record['code']
        if scope in ('families', 'skus'):
            continue
        path = record['localPath']
        local = local_file(path)
        if not local:
            raise SystemExit(f'Missing local media: {path}')
        digest = hashlib.sha256(local.read_bytes()).hexdigest()
        approval = approvals.get(path)
        if scope == 'categories':
            if code not in category_status:
                raise SystemExit(f'Unknown belt category: {code}')
            result = category_status[code]
            result.update(local_path=path, source_url=record['sourcePageUrl'], sha256=digest,
                          status='PENDING_RIGHTS')
            hashes[digest] += 1
        else:
            kind = record['documentType']
            if (scope == 'sku-document' and (code not in skus or kind not in ('technicalDrawing', 'profileDrawing'))
                    or scope == 'family-document' and (code not in families or kind not in ('profileDrawing', 'specificationSheet'))
                    or scope not in ('sku-document', 'family-document')):
                raise SystemExit(f'Invalid document scope: {scope}, {code}, {kind}')
            result = document_status.setdefault((scope, code), {})
            result.update(local_path=path, source_url=record['sourcePageUrl'], sha256=digest,
                          status='NEEDS_TECHNICAL_DATA')
        if not approval:
            continue
        used_approvals.add(path)
        required = ['sha256', 'reviewDate', 'licenseEvidence', 'identityEvidence']
        if approval['sha256'] != digest or not all(approval.get(k) for k in required):
            raise SystemExit(f'Incomplete or stale approval: {path}')
        if scope == 'categories':
            if approval.get('visualVerification') != 'verified':
                raise SystemExit(f'Missing visual approval: {path}')
            storefront['categories'][code] = path
            result['status'] = 'VERIFIED_REAL_CATEGORY_PHOTO'
        else:
            status = approval.get('documentStatus')
            if status not in ('VERIFIED_OFFICIAL_DRAWING', 'ENGINEERING_REDRAW') or not approval.get('dimensionEvidence'):
                raise SystemExit(f'Missing technical evidence: {path}')
            documents = storefront['documents'].setdefault(code, {})
            if kind in documents:
                raise SystemExit(f'Duplicate approved document: {code}, {kind}')
            documents[kind] = {'path': path, 'status': status}
            result['status'] = status
    for code, path in storefront['categories'].items():
        if hashes[category_status[code]['sha256']] > 1:
            raise SystemExit(f'Duplicate approved category photo: {path}')
    if set(approvals) != used_approvals:
        raise SystemExit('Approval without a candidate record')
    for records in photo_rows.values():
        for record in records:
            if record['sha256'] and hashes[record['sha256']] > 1:
                if record['status'].startswith('VERIFIED'):
                    raise SystemExit(f'Duplicate approved photo: {record["local_path"]}')
                record['status'] = 'REJECTED_DUPLICATE'
    photo_fields = ['code', 'family_code', 'slot', 'source_url', 'source_asset_url', 'manufacturer',
                    'manufacturer_model', 'historical_marking', 'historical_visual_note',
                    'visual_verification', 'license_evidence', 'identity_evidence', 'local_path',
                    'sha256', 'review_date', 'status']
    candidate_codes = {row['code'] for row in photo_rows['skus']}
    photo_rows['skus'].extend({'code': code, 'family_code': skus[code], 'status': 'RESEARCH_PENDING'}
                              for code in sorted(skus.keys() - candidate_codes))
    existing_slots = {(r['code'], r['slot']) for r in photo_rows['families']}
    photo_rows['families'].extend(
        {'code': code, 'family_code': code, 'slot': slot, 'status': 'RESEARCH_PENDING'}
        for code in sorted(families) for slot in range(1, 5) if (code, slot) not in existing_slots
    )
    table('sku-image-provenance.csv', photo_fields, photo_rows['skus'])
    table('family-image-provenance.csv', photo_fields, photo_rows['families'])
    table('category-image-audit.csv', ['category_slug', 'status', 'source_url', 'local_path', 'sha256'], category_status.values())

    drawings = rows('technical_drawings_audit.csv')
    drawing_by_code = {r['entity_id']: r for r in drawings}
    table('technical-drawing-audit.csv',
          ['entity_type', 'entity_id', 'parent_family_id', 'historical_path', 'status', 'source_url', 'local_path', 'sha256'], [
        {'entity_type': kind, 'entity_id': code,
         'parent_family_id': skus.get(code, code),
         'historical_path': drawing_by_code.get(code, {}).get('asset_path'),
         'status': 'NEEDS_TECHNICAL_DATA', **document_status.get((kind + '-document', code), {})}
        for kind, codes in [('sku', skus), ('family', families)] for code in sorted(codes)
    ])
    table('sku-audit-reconciliation.csv',
          ['sku', 'runtime_family', 'historical_source_family', 'historical_proposed_family',
           'historical_proposed_pfam', 'historical_status', 'target_in_manifest', 'snapshot_direct_sku', 'in_engineered_snapshot', 'requires_review'], [
        {'sku': code, 'runtime_family': skus.get(code),
         'historical_source_family': audit.get(code, {}).get('source_family_id'),
         'historical_proposed_family': audit.get(code, {}).get('proposed_audit_family_id'),
         'historical_proposed_pfam': audit.get(code, {}).get('proposed_runtime_pfam_id'),
         'historical_status': audit.get(code, {}).get('directive_audit_status'),
         'target_in_manifest': skus.get(code) in families,
         'snapshot_direct_sku': code in standalone,
         'in_engineered_snapshot': code in actual_sku_codes,
         'requires_review': code in pending}
        for code in sorted(skus.keys() | audit.keys())
    ])
    table('sku-without-publishable-photo.csv', ['sku', 'family'], [
        {'sku': code, 'family': skus[code]} for code in sorted(skus.keys() - storefront['skus'].keys())
    ])
    emit(GENERATED / 'verifiedBeltMedia.json', json.dumps(storefront, ensure_ascii=False, indent=2) + '\n')
    summary = Counter(r['directive_audit_status'] for r in audit_rows)
    family_audit = Counter(r['family_audit_status'] for r in rows('complete_family_audit.csv'))
    statuses = Counter(r['status'] for records in photo_rows.values() for r in records)
    missing_drawings = sum(bool(r['asset_path']) and not local_file(r['asset_path']) for r in drawings)
    document_counts = Counter(d['status'] for docs in storefront['documents'].values() for d in docs.values())
    emit(AUDIT / 'final-image-coverage-report.md', f'''# Storefront belt-media audit

| Measure | Count |
|---|---:|
| Belt-cohort product families in the engineered snapshot (generator filter) | {len(snapshot_families)} |
| Family keys in application manifest | {len(families)} |
| Manifest family keys present as products in the engineered snapshot | {len(families.keys() & actual_family_codes)} |
| Confirmed standalone DIRECT keys without a family entry | {len(standalone)} |
| Unresolved manifest SKU family references after separating standalone keys | {len(dangling)} |
| Manifest SKUs absent from engineered snapshot product/direct-SKU rows | {len(skus.keys() - actual_sku_codes)} |
| Runtime SKUs | {len(skus)} |
| Historical source families | {family_audit.total()} |
| Historical audit SKUs | {len(audit)} |
| SKUs in both datasets | {len(common)} |
| Runtime-only SKUs | {len(runtime_only)} |
| Historical-only SKUs | {len(audit_only)} |
| Common SKUs with differing proposed/runtime family IDs | {len(differences)} |
| Records flagged for reconciliation or technical review | {len(pending)} |
| Published exact SKU photos | {len(storefront['skus'])} |
| Runtime SKUs without publishable photos | {len(skus) - len(storefront['skus'])} |
| Published family photos | {sum(bool(x) for slots in storefront['families'].values() for x in slots)} |
| Families with four published photos | {sum(all(slots) for slots in storefront['families'].values())} |
| Candidates pending image-use rights | {statuses['PENDING_RIGHTS']} |
| Candidates pending SKU or family identity review | {statuses['NEEDS_IDENTITY_REVIEW']} |
| Historical photo paths missing locally | {statuses['MISSING_LOCAL_FILE']} |
| Candidate assignments rejected for identical bytes | {statuses['REJECTED_DUPLICATE']} |
| Historical technical-audit rows pointing to absent files | {missing_drawings} |
| Published official technical drawings | {document_counts["VERIFIED_OFFICIAL_DRAWING"]} |
| Published engineering redraws | {document_counts["ENGINEERING_REDRAW"]} |

The historical report's 7,627 missing SKU photos is 7,641 (its 7,709-SKU
cohort less {summary['OUT_OF_SCOPE']} out-of-scope entries) minus 14 legacy
photo assignments. It is not a coverage count for the runtime catalog.

Historical SKU classifications: {dict(summary)}.
Historical family classifications: {dict(family_audit)}.
These are prior audit labels. Runtime family assignments and SKU membership are
preserved. Per-SKU manufacturer research and dimensional validation remain open.
Visually similar photos require follow-up even when SHA-256 hashes differ.
A prior marking note does not establish rights or the manufacturer-to-internal-SKU mapping.
''')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    main(parser.parse_args().check)
