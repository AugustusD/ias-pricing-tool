# IAS Dealer Pricing Tool — Project Context

Read this file at the start of every new session before making any changes.

---

## What This Tool Is

A dealer-facing pricing calculator for Innovative Aluminum Systems (IAS) authorized dealers. It displays the 2026 price list, allows dealers to apply Standard and Infinity discount percentages, build an order, and export to Excel or email.

## Tech Stack

- React 19 + TypeScript + Tailwind 4 + shadcn/ui
- Vite (static frontend only — no backend)
- All catalog data lives in `client/src/lib/catalogData.ts`

## Key Data Structures in catalogData.ts

Each item has:

| Field | Purpose |
|---|---|
| `profileGroup` | Groups items under a collapsible profile header (Square / Round / Flat / Colonial). Set to `null` for items that don't belong to a profile group. |
| `sectionHeading` | Renders a standalone dark section divider above the item. Only used when `profileGroup` is null. If both are set, it is a data error. |
| `type` | `"standard"` (uses Standard discount), `"infinity"` (uses Infinity discount), `"net"` (no discount) |

## Catalog Structure Rules

- Items with `profileGroup` set appear inside that profile's collapsible section.
- Items with `profileGroup: null` and a non-empty `sectionHeading` appear under a standalone dark header.
- Items with both set are a bug — the renderer ignores `sectionHeading` when `profileGroup` is present.
- End Caps & Sleeve Caps (PCPS, PCPR, etc.) belong under `sectionHeading: "End Caps & Sleeve Caps"` with `profileGroup: null`.
- Post Mount Plates (MPLPMC, MPLPMW, PPLPMW, PPLPMSTR) belong under `sectionHeading: "Post Mount Plates"` with `profileGroup: null`.

## File Map

| File | Purpose |
|---|---|
| `client/src/lib/catalogData.ts` | All product data (~6700 lines) |
| `client/src/components/ProductTable.tsx` | Renders the catalog with profile group headers and section headings |
| `client/src/components/OrderPanel.tsx` | Right-side order summary panel |
| `client/src/components/OrderSummaryModal.tsx` | Full order modal with Excel export |
| `client/src/components/Sidebar.tsx` | Left navigation sidebar |
| `client/src/pages/Home.tsx` | Main page layout |
| `client/src/index.css` | Global styles and design tokens |

## Design System

- **Background:** near-black (`#0a0a0a`)
- **Accent:** gold (`#b8962e` / `#d4af37`)
- **Profile group headers:** black background, gold text, gold left bar
- **Section heading headers:** same dark style as profile headers
- **Font:** Helvetica for branding, system sans-serif for body

## Session Workflow

1. Read `TODO.md` first.
2. Make changes.
3. Verify in the live preview at `https://3000-inbmzt8ydvnp226rd7d7m-8ae84b6a.us2.manus.computer`.
4. Update `TODO.md` (mark completed items ✅, add new issues).
5. Save checkpoint.
