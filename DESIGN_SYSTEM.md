# Swop Desktop — Design System ("Bento" Theme)

This is the visual language for new and updated components in `swop-desktop-app`.
The shared primitives live in [`components/ui/bento.tsx`](components/ui/bento.tsx) —
**import** `BentoCard`, `Chip`, and `SectionHead` from there rather than inventing new
card/chip styles. A full reference usage is [`components/wallet/WalletContent.tsx`](components/wallet/WalletContent.tsx).

```tsx
import { BentoCard, Chip, SectionHead } from '@/components/ui/bento';
```

> **Rule of thumb:** when you build or edit a component, match the tokens below.
> If a primitive already exists (card, chip, section header), import it — don't restyle from scratch.

---

## 1. Fonts

Fonts are configured globally in [`app/layout.tsx`](app/layout.tsx) and applied via
[`app/globals.css`](app/globals.css). **Do not import or declare new font families in components.**

| Use | Family | Source |
| --- | --- | --- |
| Body / UI text | System stack → `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui` | `globals.css` body rule |
| Configured sans (`font-inter` / `var(--font-inter)`) | **Inter** (400/500/600/700) | `next/font/google` |
| Display headings | **Figtree** (300–900) | `next/font/google` |
| Numbers, addresses, hashes, code | **JetBrains Mono** (`var(--font-jetbrains-mono)` / `.dm-mono`) | `next/font/google` |

Use the mono font for anything tabular or address-like (token amounts, wallet addresses, tx hashes).

---

## 2. Typography scale

The theme uses **explicit bracketed pixel sizes** with tight tracking — not Tailwind's default `text-lg` etc.

| Role | Classes |
| --- | --- |
| Section title | `text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900` |
| Big number / hero value | `text-[24px] font-semibold leading-tight text-gray-950` |
| Body | `text-[13px] text-gray-500` |
| Caption / secondary | `text-[12px] text-gray-500` |
| Micro / footnote | `text-[11px] text-gray-400` |
| Uppercase label | `text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400` |

Headings get **negative** letter-spacing (`tracking-[-0.02em]`); uppercase labels get **positive** (`tracking-[0.08em]`).

---

## 3. Color palette

| Token | Value | Use |
| --- | --- | --- |
| Primary text | `text-gray-950` / `text-gray-900` | Headings, key values |
| Secondary text | `text-gray-500` | Body, captions |
| Muted text | `text-gray-400` | Footnotes, labels |
| Hairline border | `border-black/[0.06]` (hover `border-black/[0.15]`) | Card & control borders |
| Accent | **Emerald** — `bg-emerald-50` / `text-emerald-600` | Rewards, positive, highlights |
| Primary button | `bg-gray-950` (hover `bg-gray-800`) | Filled CTAs |
| Destructive | `text-red-500` / `bg-red-50` | Errors |

**Token brand colors** (for charts/avatars) live in the `TOKEN_COLORS` map in `WalletContent.tsx`:
`SOL #10b981 · SWOP #14b8a6 · ETH #047857 · BTC #f59e0b · USDC #2563eb · USDT #22c55e · default #6b7280`.

> A separate dark "terminal" theme (the `--dm-*` variables in `globals.css`, `.dm-mono`, `.dm-window`)
> exists for specific surfaces. Don't mix it with the light bento theme — pick one per surface.

---

## 4. Shape, spacing & elevation

| Property | Value |
| --- | --- |
| Card radius | `rounded-2xl` |
| Pills / chips / icon badges / buttons | `rounded-full` |
| Dropdowns / small panels | `rounded-xl` |
| Card shadow | `shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]` |
| Section spacing | `mt-8` between sections, `mb-3` under a `SectionHead` |
| Page column | `max-w-[855px] w-full mx-auto` |
| Control height | `h-7` (chips / icon buttons), `h-10` (primary buttons) |

---

## 5. Reusable primitives

These are exported from [`components/ui/bento.tsx`](components/ui/bento.tsx) — import them, don't copy.
All three accept a `className` that is merged via `cn()`, so you can extend without overriding the base look.

### `BentoCard` — the base surface
```tsx
<BentoCard padding="p-4" className="my-4">
  {children}
</BentoCard>
```
Renders a white `rounded-2xl` card with the hairline border + standard layered shadow.
`padding` is a convenience slot (e.g. `"p-4"`); any other div props pass through.

### `Chip` — pill filter / action
```tsx
<Chip active={selected === 'all'} onClick={() => setSelected('all')}>
  All
</Chip>
```
Pill button (`h-7`, `rounded-full`). `active` inverts it to `bg-gray-900 text-white`.
Standard `<button>` props (`onClick`, `disabled`, …) pass through.

### `SectionHead` — title + caption + action
```tsx
<SectionHead
  title="Tokens"
  caption="12 assets across 6 chains"
  action={<Chip onClick={openManage}>Manage</Chip>}
/>
```

### Primary button
```tsx
<button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gray-950 px-4 text-[13px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
  Action
</button>
```

### Icon badge (e.g. accent circle)
```tsx
<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
  <Sparkles className="h-4 w-4" />
</span>
```

---

## 6. Conventions

- **Icons:** `lucide-react`, sized `w-3.5 h-3.5` (in chips/buttons) or `w-4 h-4` (standalone).
- **A standard section** = `<section className="mt-8">` → `<SectionHead />` → `<BentoCard />`.
- **Hover states** lift the border (`border-black/[0.06]` → `border-black/[0.15]`) and add `transition`.
- **Don't** use NextUI default surfaces, ad-hoc shadows, or default Tailwind text sizes for new bento UI —
  they won't match. Reach for the tokens above.
