# Works Catalog 2.0 · Phase 1 QA Gate Report

**Date:** 2025-11-25  
**Repo:** MEGA (WeChat mini-program)  
**Scope:** Catalog metadata migration, offline quality gates, magnet physics — no work redesign.

---

## 1. Executive verdict

**PASS** (offline / automated gates)

All six prescribed commands exited **0**. Static catalog invariants and magnet validation for all eight gallery works succeeded. **Human visual and teaching acceptance remain out of scope for this gate** (see §6). **house** is explicitly flagged `visualReview: 'fail'` pending Phase 2 gable work.

---

## 2. Command results

| # | Command | Exit code | Key output |
|---|---------|-----------|------------|
| 1 | `node scripts/validate_gallery.mjs` | **0** | Per-work magnet OK (cube n=6 … flower n=7); `validate_gallery magnet OK`; `validate_catalog OK ids=cube,flower,house,car,rocket,robot,castle,tower assets=15`; `validate_gallery OK` |
| 2 | `node scripts/qa_ux_gate.mjs` | **0** | `UX GATE PASSED (static).`; `VISUAL REQUIRED (真机): MEGA brand + work titles + progress; cream stage; toolbar …` |
| 3 | `node scripts/verify_logic.mjs` | **0** | GLB total 79052 bytes ≤ 120KB; sounds present; gotoStep semantics; `works defined (cube + house + gallery)`; `All offline checks passed.` |
| 4 | `node scripts/verify_magnet.mjs` | **0** | Same eight `OK` lines + `validate_catalog OK`; `All magnet physics checks passed.` |
| 5 | `node scripts/accept_batches.mjs` | **0** | Batches 1–6: **34/34 passed**; `Offline batch acceptance OK. Remaining: WeChat真机预览 (not available in this VM).` |
| 6 | `npm run accept` | **0** | Full pipeline: verify_logic → verify_magnet → accept_batches → qa_ux_gate (aggregate exit 0) |

---

## 3. Catalog 1:1 check

| Check | Result |
|-------|--------|
| `utils/works-catalog.ts` exists | **OK** |
| SEEDS ids | **OK** — `cube`, `flower`, `house`, `car`, `rocket`, `robot`, `castle`, `tower` (8/8) |
| No `status: 'accepted'` in SEEDS block | **OK** — all seeds `status: 'draft'` |
| `house` → `visualReview: 'fail'` | **OK** |
| `validate_gallery.mjs` catalog section | **OK** — required fields, no hardcoded `tileCount` in seeds, WORKS/gallery id parity |
| `utils/works.ts` exports `WORK_CATALOG` | **OK** — `buildWorkCatalog(WORKS)` |
| `WORK_LABELS` / `WORK_TITLES` from catalog | **OK** — `catalogLabelsFromSeeds()` / `catalogTitlesFromSeeds()` |
| `utils/works-stats.ts` | **OK** — `computeShapeUsage`, `computeTileCount` exported and used by `enrichCatalogItem` |
| Entry point unchanged | **OK** — `WORKS = [WORK_CUBE, WORK_LITTLE_HOUSE, ...GALLERY_WORKS]` |
| `validateMagnetBuild` in gallery path | **OK** — `utils/works-gallery.ts` calls `validateMagnetBuild(ordered)` |
| `BuildStep` shape | **OK** — `model`, `assetId`, poses, hints unchanged intent in `works.ts` |
| Dual-geometry constraint documented | **OK** — `utils/tile-spec.ts` (75≠71); `scripts/verify_magnet.mjs` asserts 71/75; `works-design/house.md` forbids 71↔75 mating; no code promoting illegal square↔equilateral mate |

---

## 4. Magnet validation per work id

| Work id | Steps (n) | Magnet gate |
|---------|-----------|-------------|
| cube | 6 | **OK** |
| house | 6 | **OK** (geometry passes; visual not signed off) |
| flower | 7 | **OK** |
| car | 8 | **OK** |
| rocket | 13 | **OK** |
| robot | 14 | **OK** |
| tower | 15 | **OK** |
| castle | 20 | **OK** |

Source: `validate_gallery.mjs` / `verify_magnet.mjs` shared gallery validation.

---

## 5. Regressions found

**None** in automated / static Phase 1 scope.

**Known product gaps (not gate failures):**

- **house** roof remains single-slope placeholder; catalog subtitle and `visualReview: 'fail'` track Phase 2 gable redesign.
- **真机 UX** checklist emitted by `qa_ux_gate.mjs` — not executed in this CI/VM environment.
- Prior audit note (house in `works.ts` vs gallery-only ids) superseded: `validate_gallery` now covers cube via `works.ts` and all eight catalog ids.

---

## 6. Acceptance status

- **Visual acceptance:** pending for all works (`visualReview: 'pending'` except **house** = `'fail'`).
- **Teaching acceptance:** not modeled in seeds; no work has `status: 'accepted'`.
- **Magnet auto-pass ≠ shipped quality** — enforced by script (`no work may be accepted before visual+teaching sign-off`).

---

## 7. Phase 2 (house gable) — gate clearance

**Cleared to start from an offline-gate perspective.**

Rationale:

- Phase 1 catalog + derivation + validation extensions are stable (all scripts green).
- **house** magnet build is valid under current steps; failure is **visual/teaching**, documented and expected.
- Hard constraint for redesign is explicit in design doc and `tile-spec` (75 mm square family only for house roof/walls; no 71 mm equilateral on 75 mm square edges).

Phase 2 implementation should still run `npm run accept` after step changes and update `visualReview` only after human sign-off.

---

## Sign-off

| Role | Offline QA | Visual / 真机 |
|------|------------|---------------|
| Automated gate (this report) | **PASS** | N/A |
| Product acceptance | — | **Pending** |