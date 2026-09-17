# PH1 Remediation — Step 10 Production Build Evidence

**Document ID:** `DOC-PH1-REM-011`
**Date:** 2026-09-17
**Branch:** `integration/ph1-sales-core`
**Purpose:** evidence for PLAN.md Step 10 (production build from the integrated Core workspace, clean install, no dependency duplication).

---

## 1. Clean install + build (integrated frontend)

Run from `frontend/` (Core workspace; package manager standardised on npm per BASELINE.md §3):

```bash
rm -rf node_modules
npm ci        # 210 packages, from package-lock.json (lockfileVersion 3)
npm run build # vite build
```

```
vite v6.4.3 building for production...
✓ 1815 modules transformed.
dist/index.html                   0.84 kB │ gzip:   0.51 kB
dist/assets/index-CHDaSFb9.css  220.83 kB │ gzip:  35.38 kB
dist/assets/index-D3m5CKc7.js   854.93 kB │ gzip: 215.60 kB
✓ built in 18.63s
BUILD_EXIT=0
```

- **Exit code 0** on a clean install (not incremental).
- The only warning is Rollup's chunk-size advisory (>500 kB) — pre-existing bundle shape, not a gate.
- PH1's TSX pages are compiled by Vite's esbuild pipeline (ruling R-4: TSX retained, no `tsc` step required by the Core build), so there is no TypeScript/JSX build mismatch.

### Operational note (Windows file locks)

A clean install required stopping the two long-running Vite processes that hold `node_modules/vite/node_modules/@esbuild/win32-x64/esbuild.exe` and `@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node`:

- `frontend` (project process, port 5173) — stopped, then restarted after the build.
- `ph1-frontend` (stale second dev server on port 5174, stuck in *starting* for 11 h) — stopped.

`npm ci` against a running dev server fails with `EPERM` on those two binaries; this is environment behaviour, not a build defect.

## 2. Dependency duplication check

`npm ls react react-dom react-router-dom tailwindcss typescript vite --depth=0` (top level) and `npm ls react react-dom react-router-dom --all` (full tree):

| Package | Instances in tree | Versions in tree |
|---|---|---|
| `react` / `react-dom` | nested duplicates of the same build | **18.3.1 only** |
| `react-router-dom` | 1 | **7.18.3 only** (Core-locked; ruling R-5) |
| `tailwindcss` | 1 | 3.4.19 |
| `vite` | 1 | 6.4.3 |
| `@vitejs/plugin-react` | 1 | 4.7.0 |

No React version duplication, no router version duplication, no Tailwind major mismatch (v4 → v3 migration executed in Step 6), no unresolved ESM/CJS boundary in the frontend build (Vite bundles the PH1 pages into the Core SPA entry — single `index-*.js`).

## 3. Backend checks in the same session

All backend suites were re-run after the build (see `STEP8_BUSINESS_PARITY_EVIDENCE.md` §1): `test_ph1_sales_api.js` 115/0, `test_rbac_security.js` 27/27, `test_cross_module_integration.js` 8/8, `test_ph1_business_parity.js` 70/0, `audit_step2_verification.js` complete, `test_ph4_api.js` 16/16.

## 4. Step 10 exit criteria

- [x] `npm install`/`npm ci` + `npm run build` exit 0 (clean install).
- [x] No React / router version duplication; no Tailwind compiler mismatch; no ESM/CJS boundary failure; no TSX build mismatch.
- [x] Core routes unaffected (SPA builds as a single bundle; route smoke in Step 6 evidence + the `/api/v1/modules` and PH4 checks in the backend suites).
- [x] No PH4 build regression (PH4 pages ship in the same bundle and their API suite is green).
