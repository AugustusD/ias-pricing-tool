# IAS Dealer Pricing Tool — Open Issues & Change Log

> **How to use this file:**
> Read this file at the start of every session. Update it before saving any checkpoint.
> Mark items ✅ only after verifying the fix in the live preview, not just after editing code.

---

## Open Issues

### Data / Catalog

- [ ] **Inside Sleeves & Clips — MLTINSLV20 / MLTINSLVCUT have both `profileGroup: "Square"` AND `sectionHeading: "Square, Round & Colonial"`**
  These two items show under the Square profile group header AND trigger a redundant section heading. Decide: remove the sectionHeading (so they sit cleanly under Square) or move them to a standalone section.

- [ ] **Handrail & Parts — PLSW16/PLSW20/PLSWCUT tagged `profileGroup: "Square"` AND `sectionHeading: "Square"`, PLRW16/PLRW20/PLRWCUT tagged `profileGroup: "Round"` AND `sectionHeading: "Round"`**
  Same dual-tag problem. Likely the sectionHeading should be cleared (empty string) since profileGroup already handles grouping.

- [ ] **Stair Sleeves & PMP — PPLPMSTR appears in this tab with `sectionHeading: "Stair Post Mount Plate"` but also appears in Level Sleeves & Top Rail with `sectionHeading: "Post Mount Plates"`**
  Confirm whether the item should appear in both tabs or only one.

---

### Completed (verified in live preview)

- ✅ **60× `Âº` encoding → `º`** (checkpoint 991477e4)
- ✅ **Post Mount Plates (MPLPMC, MPLPMW, PPLPMW, PPLPMSTR) → `profileGroup: null`, `sectionHeading: "Post Mount Plates"`** (checkpoint 991477e4)
- ✅ **∞ badge removed from all locations** (checkpoint c6b8624a)
- ✅ **All section headers unified to dark gold style** (checkpoint c6b8624a)
- ✅ **Wall Mounts – Top Rail: PRWM* → `profileGroup: "Round"`, PCWM* → `profileGroup: "Colonial"`** (confirmed already correct at checkpoint c6b8624a)
- ✅ **Level Sleeves & Top Rail: End Caps (PCPS, PCPR, PCPSSL, PCPRSL, PCPF, PCPC, PCPFSL, PCPCSL) → `sectionHeading: "End Caps & Sleeve Caps"`** (this session)
- ✅ **Stair Sleeves & PMP: Flat custom stair sleeves (PFSLENDCUS1/2, PFSLCUS1/2) → `profileGroup: "Flat"`** (this session)

---

## Requested Features (not yet started)

- [ ] Customer / project name field in order panel, carried through to Excel export header and email preview
- [ ] Persist order to localStorage with "Order restored" toast on load
- [ ] Global cross-category search (query across all tabs, results grouped by category)

---

## Known Design Decisions

- Profile group headers use: black background, gold text, gold left accent bar
- Section heading headers (non-profile) use the same dark style as profile headers
- `profileGroup` drives the collapsible profile-tab grouping in ProductTable
- `sectionHeading` is used for standalone section dividers when `profileGroup` is null
- Items with both `profileGroup` AND `sectionHeading` set are a data error — the sectionHeading is ignored by the renderer but causes confusion in audits
