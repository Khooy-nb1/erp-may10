# PH1 Remediation - Frontend Token Map (Step 6H)

**Document ID:** \`DOC-PH1-REM-009\`  
**Purpose:** the PH1 SPA was built with Tailwind v4 CSS-first tokens (\`@theme\` in
\`frontend/src/styles/index.css\`). The integrated frontend is Core's Tailwind 3.4 with
\`frontend/tailwind.config.js\`, which does **not** generate PH1's token utilities. Every ported
component therefore rewrites the classes below; unknown class names render unstyled instead of failing
the build, so this mapping is applied deliberately, file by file.

Core tokens available: \`brand.{primary,dark,light,pale,bg,surface,border,text,secondary,muted}\` and
\`may10.{primary,dark,bg,text,muted,success,warning,danger,50..900}\`.

| PH1 (Tailwind v4) | Core (Tailwind 3.4) | Notes |
|---|---|---|
| \`bg-background\` | \`bg-brand-bg\` | workspace background #F7FAFC |
| \`bg-surface\` | \`bg-white\` | cards/tables |
| \`bg-surface-muted\` | \`bg-slate-50\` | table headers, inert rows |
| \`border-border\` | \`border-brand-border\` | #DCEAF4 |
| \`border-border-strong\` | \`border-slate-300\` | inputs on focus-adjacent states |
| \`text-foreground\` | \`text-brand-text\` | #172033 |
| \`text-muted-foreground\` | \`text-brand-secondary\` | #5F6F82 |
| \`text-subtle-foreground\` | \`text-slate-400\` | hints, empty cells |
| \`bg-primary\` | \`bg-brand-primary\` | Corporate Blue #0F5FAF (was #2563eb) |
| \`text-primary\` / \`border-primary\` / \`ring-ring\` | \`text-brand-primary\` / \`border-brand-primary\` / \`ring-brand-primary\` | |
| \`text-primary-foreground\` | \`text-white\` | |
| \`hover:bg-primary-hover\` | \`hover:bg-brand-dark\` | #0F4C81 |
| \`bg-primary-soft\` | \`bg-brand-light\` | #EAF5FC |
| \`bg-success-soft\` / \`text-success-strong\` | \`bg-emerald-50\` / \`text-emerald-700\` | solid: \`bg-emerald-600\` |
| \`bg-warning-soft\` / \`text-warning-strong\` | \`bg-amber-50\` / \`text-amber-700\` | solid: \`bg-amber-500\` |
| \`bg-danger-soft\` / \`text-danger-strong\` | \`bg-rose-50\` / \`text-rose-700\` | solid: \`bg-rose-600\` |
| \`bg-info-soft\` / \`text-info-strong\` | \`bg-sky-50\` / \`text-sky-700\` | solid: \`bg-sky-600\` |
| \`bg-violet-soft\` / \`text-violet-strong\` | \`bg-violet-50\` / \`text-violet-700\` | |
| \`rounded-control\` | \`rounded-xl\` | form controls and buttons |
| \`rounded-card\` | \`rounded-2xl\` | cards and table containers |
| \`shadow-card\` | \`shadow-sm\` | |
| \`shadow-raised\` | \`shadow-md\` | dialogs, popovers |
| \`text-chart-axis\` / \`bg-chart-grid\` | literal \`#CBD5E1\` / \`#EEF2F7\` in chart code | charts draw SVG, not utilities |
| \`font-sans\` | unchanged | Core config sets Inter |

Rules for the port:

1. No new dependency: no \`@radix-ui/*\`, no \`sonner\`, no \`react-hook-form\`, no \`zod\`, no
   \`class-variance-authority\`, no \`@fontsource/*\`. Radix-based primitives are hand-rolled in
   \`sales/components/ui/*.jsx\`; toasts use the module bridge in \`components/ui/toast.jsx\` which renders
   Core's \`components/Toast.jsx\`.
2. Files are \`.jsx\` (no TypeScript); prop names, exported names, Vietnamese labels and user-visible
   strings stay identical to PH1.
3. Dialogs render through \`createPortal\` into \`document.body\`, close on Escape and on overlay click
   (except \`AlertDialog\`, which follows PH1's explicit-confirmation behaviour), and lock background
   scroll while open.
4. Charts keep PH1's SVG geometry, scales and legends; only the colour values and class names change.
5. Responsive contract (6H): desktop >= 1024px, tablet 768-1023px, mobile < 768px - keep PH1's grid
   breakpoints (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`) as-is.
