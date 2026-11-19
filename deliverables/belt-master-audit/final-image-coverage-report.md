# Storefront belt-media audit

| Measure | Count |
|---|---:|
| Belt-cohort product families in the engineered snapshot (generator filter) | 474 |
| Family keys in application manifest | 1088 |
| Manifest family keys present as products in the engineered snapshot | 474 |
| Confirmed standalone DIRECT keys without a family entry | 364 |
| Unresolved manifest SKU family references after separating standalone keys | 0 |
| Manifest SKUs absent from engineered snapshot product/direct-SKU rows | 8 |
| Runtime SKUs | 8094 |
| Historical source families | 640 |
| Historical audit SKUs | 7709 |
| SKUs in both datasets | 7674 |
| Runtime-only SKUs | 420 |
| Historical-only SKUs | 35 |
| Common SKUs with differing proposed/runtime family IDs | 8 |
| Records flagged for reconciliation or technical review | 441 |
| Prior SKU rows with pitch × tooth count consistent with recorded pitch length (within 0.5 mm) | 1853 |
| Prior SKU rows with a pitch-length conflict or non-integer tooth count | 7 |
| Published exact SKU photos | 12 |
| Runtime SKUs without publishable photos | 8082 |
| Published family photos | 37 |
| Families with four published photos | 2 |
| Candidates pending visual review | 58 |
| Candidates pending SKU or family identity review | 0 |
| Historical photo paths missing locally | 0 |
| Candidate assignments rejected for identical bytes | 0 |
| Historical technical-audit rows pointing to absent files | 8104 |
| Published official technical drawings | 0 |
| Published engineering redraws | 0 |

The historical report's 7,627 missing SKU photos is 7,641 (its 7,709-SKU
cohort less 68 out-of-scope entries) minus 14 legacy
photo assignments. It is not a coverage count for the runtime catalog.

Historical SKU classifications: {'FAMILY_MISMATCH': 1629, 'CORRECT_FAMILY': 5876, 'STANDALONE_CANDIDATE': 125, 'OUT_OF_SCOPE': 68, 'PENDING_REVIEW': 11}.
Historical family classifications: {'RESCUED_MISPLACED_BELT_FAMILY': 18, 'SINGLETON_STANDALONE_CANDIDATE': 285, 'HOMOGENEOUS_VALID_FAMILY': 145, 'HETEROGENEOUS_SPLIT_OR_REASSIGNED': 180, 'OUT_OF_SCOPE_NON_BELT_FAMILY': 8, 'PENDING_ENGINEERING_REVIEW': 4}.
These are prior audit labels. Runtime family assignments and SKU membership are
preserved. Per-SKU manufacturer research and dimensional validation remain open.
The pitch-length check uses prior audit fields and tests internal arithmetic consistency.
Visually similar photos require follow-up even when SHA-256 hashes differ.
A prior marking note does not establish the manufacturer-to-internal-SKU mapping.
