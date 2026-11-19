# Belt media review

Run `python scripts/audit-belt-media.py` from the repository root to regenerate
the storefront media index and reconciliation files. Use `--check` to compare
the checked-in output with the sources. The older audit files are historical inputs.

New records go in `media-candidates.json`. Each record includes `scope`, `code`,
`localPath` under `/belt-catalog/`, and `sourcePageUrl`. Family photo records use
scope `families` and include `slotIndex` (1–4). SKU records use scope `skus` and
include `familyId`, including the existing `DIRECT-<SKU>` key for standalone entries.
Both photo scopes also record `sourceUrl` and `manufacturer`. Category records use
scope `categories` and the catalog category slug. Supply WebP files for photos.

Add an entry to `media-approvals.json` only after review. Key the entry by its
exact `localPath` and record its `sha256`, `reviewDate`, `identityEvidence`,
and confirm that the file depicts the physical product. For photos, use `visualVerification: "verified"` after
checking the original image. For exact SKU photos, record `manufacturerModel`
and include evidence tying the physical item and dimensions to the internal code.

Use `family-document` or `sku-document` for technical files. The candidate's
`documentType` is `profileDrawing`, `technicalDrawing` (SKU), or
`specificationSheet` (family). The approval includes `licenseEvidence`, `dimensionEvidence`, and
`documentStatus` set to `VERIFIED_OFFICIAL_DRAWING` or `ENGINEERING_REDRAW`.

The November 19 SKU source check records the HTTP result for each of the 14
historical product pages. All 14 original image URLs returned decodable images.
The asset comparison applies EXIF orientation and compares RGB pixel values after
resizing the original and local copy to 64 × 64. This checks visual correspondence
between files. It does not verify product dimensions or grant reuse rights.
