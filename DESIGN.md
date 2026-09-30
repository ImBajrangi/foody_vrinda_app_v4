# Foody Vrinda — Design System & Theme Architecture Specification
**Document Version:** 4.0.0  
**Project:** Foody Vrinda (`foody_vrinda_v3` / `foody_vrinda_app_v4`)  
**Scope:** Universal Multi-Role Application (Customer, Kitchen, Delivery/Transport, Owner, Developer)

---

## 1. Executive Summary & Philosophy

Foody Vrinda is an ultra-premium, Vedic Satvik cloud kitchen platform operating in Sri Dham Vrindavan. The application must deliver a **flawless, consistent, and cohesive visual language** across all 5 operational desks and mobile viewports.

### The Core Theme Duality
The system operates strictly on **two deliberate, non-clashing aesthetic modes**:

| Mode | Theme Personality | Primary Accent | Accent Fallback/Contrast | Base Canvas | Elevated Card Surface |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Light Mode** | *Vedic Divine Light* — Warm, devotional, temple-grade purity & saffron warmth | **Royal Saffron Amber** (`#D97706` / `#B45309`) | Deep Amber (`#92400E`) / White Text | `#FAF7F2` (Ivory Cream) | `#FFFFFF` (Pure White) |
| **Dark Mode** | *Obsidian Luxury* — Modern, state-of-the-art cyber-vedic dark UI | **Cyber Neon Lime** (`#E0FF33`) | Deep Obsidian (`#121011`) | `#1E1B1C` (Obsidian 900) | `#282526` (Obsidian 850) |

> [!IMPORTANT]
> **Zero Neon Lime in Light Mode**: Neon Lime (`#E0FF33`) is strictly forbidden in Light Mode. On light/white backgrounds, `#E0FF33` has almost zero contrast ratio (~1.2:1), making buttons, map routes, and text unreadable. In Light Mode, all primary accents automatically translate to **Royal Saffron Amber (`#D97706` / `#B45309`)**.

---

## 2. Global Semantic Color Token Matrix

All UI components must bind to standard CSS variables and Tailwind semantic utility classes rather than hardcoded hex values.

```
                  ┌────────────────────────────────────────┐
                  │          FOODY VRINDA THEME            │
                  └──────────────────┬─────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [ LIGHT THEME (Vedic) ]                 [ DARK THEME (Obsidian) ]
       • Canvas: #FAF7F2                       • Canvas: #1E1B1C
       • Surface: #FFFFFF                      • Surface: #282526
       • Card: #FFFFFF                         • Card: #242021
       • Text Primary: #1C1917                 • Text Primary: #FFFFFF
       • Primary Accent: #D97706 (Amber)       • Primary Accent: #E0FF33 (Neon Lime)
       • Map Route: #D97706 (Amber/Saffron)    • Map Route: #E0FF33 (Neon Lime)
       • Radio/Active: Amber 600               • Radio/Active: Neon Lime
```

### 2.1 CSS Semantic Tokens Definition

```css
:root, [data-theme="light"], .light {
  /* Canvas & Backgrounds */
  --bg-app: #FAF7F2;
  --bg-surface: #FFFFFF;
  --bg-card: #FFFFFF;
  --bg-elevated: #F5EFEB;
  --bg-subtle: #F0EAE1;
  --bg-input: #F3ECE2;

  /* Typography */
  --text-primary: #1C1917;       /* Deep warm obsidian black */
  --text-secondary: #57534E;     /* Medium stone */
  --text-muted: #78716C;         /* Subtle stone */
  --text-inverse: #FFFFFF;

  /* Borders & Dividers */
  --border-app: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.05);
  --border-focus: #D97706;

  /* Primary Brand Accent */
  --accent-primary: #D97706;     /* Saffron Royal Amber */
  --accent-hover: #B45309;
  --accent-bg-subtle: rgba(217, 119, 6, 0.10);
  --accent-border: rgba(217, 119, 6, 0.28);
  --accent-text: #FFFFFF;

  /* Semantic Status Colors */
  --color-success: #15803D;      /* Forest Green 700 */
  --color-success-bg: rgba(22, 163, 74, 0.10);
  --color-warning: #D97706;      /* Amber 600 */
  --color-warning-bg: rgba(217, 119, 6, 0.10);
  --color-danger: #DC2626;       /* Red 600 */
  --color-danger-bg: rgba(220, 38, 38, 0.10);
  --color-info: #2563EB;         /* Blue 600 */
  --color-info-bg: rgba(37, 99, 235, 0.10);

  /* Map Navigation Elements */
  --map-route-line: #D97706;     /* Solid Royal Saffron */
  --map-rider-pin: #B45309;
  --map-rider-radar: rgba(217, 119, 6, 0.40);
  --map-store-pin: #1C1917;
  --map-customer-pin: #15803D;

  /* Shadows */
  --shadow-card: 0 4px 20px -2px rgba(28, 25, 23, 0.06);
  --shadow-elevated: 0 12px 36px -4px rgba(28, 25, 23, 0.12);
  --shadow-modal: 0 25px 70px -10px rgba(0, 0, 0, 0.25);
}

[data-theme="dark"], .dark {
  /* Canvas & Backgrounds */
  --bg-app: #1E1B1C;
  --bg-surface: #282526;
  --bg-card: #242021;
  --bg-elevated: #322E30;
  --bg-subtle: #181617;
  --bg-input: #151314;

  /* Typography */
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1AA;
  --text-muted: #71717A;
  --text-inverse: #121011;

  /* Borders & Dividers */
  --border-app: rgba(255, 255, 255, 0.10);
  --border-subtle: rgba(255, 255, 255, 0.05);
  --border-focus: #E0FF33;

  /* Primary Brand Accent */
  --accent-primary: #E0FF33;     /* Cyber Neon Lime */
  --accent-hover: #CCFF00;
  --accent-bg-subtle: rgba(224, 255, 51, 0.12);
  --accent-border: rgba(224, 255, 51, 0.30);
  --accent-text: #121011;

  /* Semantic Status Colors */
  --color-success: #4ADE80;      /* Neon Emerald */
  --color-success-bg: rgba(74, 222, 128, 0.12);
  --color-warning: #FBBF24;      /* Gold Amber */
  --color-warning-bg: rgba(251, 191, 36, 0.12);
  --color-danger: #F87171;       /* Rose Red */
  --color-danger-bg: rgba(248, 113, 113, 0.15);
  --color-info: #60A5FA;         /* Sky Blue */
  --color-info-bg: rgba(96, 165, 250, 0.12);

  /* Map Navigation Elements */
  --map-route-line: #E0FF33;     /* Solid Cyber Neon Lime */
  --map-rider-pin: #E0FF33;
  --map-rider-radar: rgba(224, 255, 51, 0.45);
  --map-store-pin: #FAF7F2;
  --map-customer-pin: #4ADE80;

  /* Shadows */
  --shadow-card: 0 4px 24px -2px rgba(0, 0, 0, 0.50);
  --shadow-elevated: 0 16px 40px -4px rgba(0, 0, 0, 0.75);
  --shadow-modal: 0 25px 70px rgba(0, 0, 0, 0.90);
}
```

---

## 3. Comprehensive Sizing, Spacing & Dimension Matrix

The system follows an **8pt fluid baseline grid** optimized for seamless ergonomics across all phone tiers (from 320px compact screens to 600px+ large displays and tablets).

### 3.1 Typography Scale & Weights

| Token / Class | Font Size | Line Height | Font Weight | Family | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-[9.5px]` | 9.5px | 1 | 900 (Black) | Outfit / Mono | Cart count badges, notification pings |
| `text-[11px]` / `text-2xs` | 11px | 1.2 | 700 / 800 | Plus Jakarta Sans | Sub-labels, order timestamps, status tags |
| `text-xs` | 12px | 1.35 | 500 / 600 / 700 | Plus Jakarta Sans | Secondary metadata, category chips, prices |
| `text-sm` | 14px | 1.4 | 500 / 600 / 700 | Plus Jakarta Sans | Body text, dish descriptions, input fields |
| `text-base` | 16px | 1.5 | 600 / 700 | Plus Jakarta Sans | Standard body, primary list titles, modal buttons |
| `text-lg` | 18px | 1.4 | 700 / 800 | Outfit | Card headers, section subheaders |
| `text-xl` | 20px | 1.3 | 800 (ExtraBold) | Outfit | Modal titles, dish name headlines |
| `text-2xl` | 24px | 1.25 | 800 / 900 | Outfit | Desk headers, store hero title |
| `text-3xl` | 30px | 1.2 | 900 (Black) | Outfit | Landing page headers, promo banners |

### 3.2 Spacing & Padding Scale

| Token | Pixel Value | Standard Usage |
| :--- | :--- | :--- |
| `p-1` / `gap-1` | 4px | Micro-pill padding, badge margins |
| `p-1.5` / `gap-1.5` | 6px | Action button clusters, filter chip gaps |
| `p-2` / `gap-2` | 8px | Button inner padding, tag spacing |
| `p-2.5` / `gap-2.5` | 10px | Compact input inner padding, search bar |
| `p-3` / `gap-3` | 12px | Small card padding, list item gaps |
| `p-4` / `gap-4` | 16px | Standard card padding, modal content margins |
| `p-5` / `gap-5` | 20px | Hero section padding, container gutters |
| `p-6` / `gap-6` | 24px | Desk dashboard container padding |

### 3.3 Component Dimensions & Touch Targets

| Component | Width | Height / Min-Height | Border Radius | Min Touch Target |
| :--- | :--- | :--- | :--- | :--- |
| **Header Action Button** | 36px (`w-9`) mobile / 40px (`sm:w-10`) | 36px (`h-9`) mobile / 40px (`sm:h-10`) | `rounded-full` (9999px) | `44px × 44px` (`apple-tap-target`) |
| **Search Input Capsule** | 100% full width | 44px – 48px | `rounded-full` | `48px` height |
| **Floating Cart Capsule** | `max-w-[calc(100vw-24px)]` | 56px – 60px | `rounded-full` / `rounded-2xl` | `56px` height |
| **Desk Switcher Tab** | Equal grid column (`auto-cols-fr`) | 36px | `rounded-xl` (12px) | `44px` height |
| **Quantity Stepper (+/-)** | 32px – 36px | 32px – 36px | `rounded-full` | `44px × 44px` area |
| **Filter / Category Chip** | Auto (Content based) | 32px – 36px | `rounded-full` | `40px` height |
| **Modal Drag Handle** | 36px – 40px | 4px – 5px | `rounded-full` | `32px` touch area |
| **Primary Action Button (CTA)**| 100% / Auto | 48px – 52px | `rounded-2xl` (16px) | `48px` height |

### 3.4 Iconography Sizing Matrix

| Icon Context | Size (px) | Stroke Width | Primary Colors (Light / Dark) |
| :--- | :--- | :--- | :--- |
| **Header Actions** (Search, Bell, Moon, Sun) | 16px – 17px | 2.0 | Amber 600 / Neon Lime (`#E0FF33`) |
| **Cart Bag Icon** | 17px | 2.2 | Amber 600 / Neon Lime (`#E0FF33`) |
| **Search / Input Lead Icon** | 16px – 18px | 2.0 | Stone 500 / Zinc 400 |
| **Card Status & Meta Icons** (Clock, Star, MapPin) | 13px – 14px | 1.8 | Stone 600 / Zinc 400 |
| **Chevron / Dropdown Arrows** | 15px – 16px | 2.0 | Stone 500 / Zinc 400 |
| **Modal Close / Clear (×)** | 16px – 18px | 2.2 | Stone 600 / Zinc 300 |

---

## 4. Accessibility (a11y) & WCAG 2.1 AA Compliance

To ensure barrier-free accessibility for all users:

1. **Touch Targets (WCAG 2.5.5)**:
   - All clickable elements (buttons, icons, tabs, chips) enforce a minimum interactive target size of **`44px × 44px`** using the `.apple-tap-target` utility.
2. **Contrast Ratio (WCAG 1.4.3)**:
   - Normal text: Minimum **4.5:1** contrast ratio against background.
   - Large text & CTAs: Minimum **3.0:1** contrast ratio.
   - Zero low-contrast elements (e.g., Neon Lime is strictly forbidden on white/light backgrounds).
3. **Screen Reader & ARIA Attributes**:
   - Icon-only buttons must have descriptive `aria-label` (e.g., `aria-label="Search"`, `aria-label="Toggle Theme"`, `aria-label="Notifications"`).
   - Dynamic badges use `aria-live="polite"` for non-intrusive updates.
   - Interactive dropdowns and accordions include `aria-expanded="true/false"`.
4. **Focus & Keyboard Navigation**:
   - Custom outline focus ring: `focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-[#E0FF33] focus-visible:outline-none`.
5. **Reduced Motion & Fluidity**:
   - Supports `prefers-reduced-motion: reduce` by dampening heavy spring physics to instant opacity transitions.

---

## 5. UI Component Standards & Guidelines

### 5.1 Button Hierarchy

| Hierarchy Tier | Light Mode Styling | Dark Mode Styling | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Action (CTA)** | `bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md` | `bg-[#E0FF33] hover:bg-[#d4f828] text-[#121011] font-black shadow-md` | Add to Cart, Checkout, Accept Order, Place Order |
| **Secondary Action** | `bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200` | `bg-white/10 hover:bg-white/15 text-white border border-white/10` | Cancel, Filter, View Menu, Secondary Navigation |
| **Selected/Active Pill** | `bg-amber-500/15 border-amber-500/40 text-amber-900 font-bold` | `bg-[#E0FF33]/15 border-[#E0FF33]/40 text-[#E0FF33] font-bold` | Active filter chips, selected tab, selected kitchen |
| **Destructive Action** | `bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white border border-red-500/20` | `bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30` | Reject Order, Delete Item, Cancel Booking |

---

### 5.2 Live Maps, GPS Tracking & Pins (Sarathi / Rider)

```
        ┌────────────────────────────────────────────────────────┐
        │                 MAP THEME SPECIFICATION                │
        └───────────────────────────┬────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      [ LIGHT MODE MAP ]                        [ DARK MODE MAP ]
      • Tile Style: Positron / Crisp Light      • Tile Style: Dark Matter / Obsidian
      • Route Line: #D97706 (Solid Saffron)     • Route Line: #E0FF33 (Neon Lime)
      • Route Glow: rgba(217, 119, 6, 0.25)     • Route Glow: rgba(224, 255, 51, 0.25)
      • Rider Pin: Deep Amber + Saffron Radar   • Rider Pin: Dark Puck + Lime Radar
      • Route Ribbon: White/95 + Saffron Badges • Route Ribbon: Obsidian/95 + Lime Badges
```

- **Polyline Stroke**: Solid 4.5px vector line with zero dotted casing beads.
- **Route Glow**: 7px semi-transparent shadow beneath the main polyline.
- **Origin & Drop-off Badges**:
  - `ORIGIN`: Light mode `bg-amber-500/15 text-amber-700 border-amber-500/30` | Dark mode `bg-[#E0FF33]/15 text-[#E0FF33] border-[#E0FF33]/30`
  - `DROP-OFF`: Light mode `bg-emerald-500/15 text-emerald-700 border-emerald-500/30` | Dark mode `bg-emerald-500/15 text-emerald-400 border-emerald-500/30`

---

### 5.3 Role Switcher & Header Navigation

- **Desktop Header**:
  - Light mode: `bg-[#FAF7F2]/90 backdrop-blur-md border-b border-stone-200/80`
  - Dark mode: `bg-[#1E1B1C]/90 backdrop-blur-md border-b border-white/10`
- **Active Role Tab**:
  - Light mode: `bg-amber-600 text-white font-black shadow-xs`
  - Dark mode: `bg-[#E0FF33] text-[#121011] font-black shadow-xs`
- **Inactive Role Tabs**:
  - Light mode: `bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50`
  - Dark mode: `bg-transparent text-zinc-400 hover:text-white hover:bg-white/5`

---

### 5.4 Modal Dialogs & Bottom Sheets

All modals must adhere to standard layering and gesture controls:
1. **Z-Index Standard**:
   - Page Elements: `z-0` to `z-30`
   - Floating Bars & Island Capsules: `z-40`
   - Modal Overlays & Bottom Sheets: `z-[99999]`
   - Dynamic Island / Notifications: `z-[100000]`
2. **Backdrop Blur**: `bg-black/60 dark:bg-black/80 backdrop-blur-xs`
3. **Modal Shell Styling**:
   - Light mode: `bg-[#FAF7F2] border border-stone-200 text-stone-900 shadow-2xl rounded-t-[32px] sm:rounded-[36px]`
   - Dark mode: `bg-[#1E1B1C] border border-white/10 text-white shadow-2xl rounded-t-[32px] sm:rounded-[36px]`
4. **Drag Handle**:
   - Light mode: `bg-stone-300` | Dark mode: `bg-white/20`

---

### 5.5 Status Badges & Lifecycle States

| Status | Meaning | Light Mode Badge | Dark Mode Badge |
| :--- | :--- | :--- | :--- |
| `new` / `pending` | Order placed, awaiting kitchen | `bg-amber-500/15 text-amber-700 border-amber-500/30` | `bg-amber-500/15 text-amber-400 border-amber-500/30` |
| `preparing` / `in_kitchen` | Food cooking in desi ghee | `bg-orange-500/15 text-orange-700 border-orange-500/30` | `bg-orange-500/15 text-orange-400 border-orange-500/30` |
| `ready_for_pickup` | Packed and waiting for rider | `bg-blue-500/15 text-blue-700 border-blue-500/30` | `bg-blue-500/15 text-blue-400 border-blue-500/30` |
| `out_for_delivery` | Rider is en route | `bg-violet-500/15 text-violet-700 border-violet-500/30` | `bg-violet-500/15 text-violet-400 border-violet-500/30` |
| `delivered` / `completed` | Delivered to devotee | `bg-emerald-500/15 text-emerald-700 border-emerald-500/30` | `bg-emerald-500/15 text-emerald-400 border-emerald-500/30` |
| `cancelled` | Order cancelled | `bg-rose-500/15 text-rose-700 border-rose-500/30` | `bg-rose-500/15 text-rose-400 border-rose-500/30` |

---

## 6. Specific View Audit & Normalization Plan

### 6.1 Kitchen Desk (`KitchenView.jsx`)
- **Current Issue**: "Accept & Start Cooking" is currently rendered with neon lime `#E0FF33` even in Light Mode while surrounding headers/tabs are orange.
- **Normalization Rule**:
  - Light mode: Primary order accept button becomes `bg-amber-600 hover:bg-amber-700 text-white font-black`.
  - Dark mode: Primary order accept button becomes `bg-[#E0FF33] hover:bg-[#d4f828] text-[#121011] font-black`.
  - OTP & Rider Pickup badge: In light mode, uses `bg-stone-100 text-stone-900 border border-stone-300 font-mono font-black` (no black obsidian pill in light mode).

### 6.2 Transport / Rider Desk (`TransportView.jsx`)
- **Current Issue**: Map line and markers used neon lime on bright white tiles.
- **Normalization Rule**:
  - Light mode: Map route uses Royal Saffron (`#D97706`), rider marker uses amber radar ping, route ribbon uses `bg-white/95 text-stone-900 border-stone-200`.
  - Dark mode: Map route uses Cyber Neon Lime (`#E0FF33`), rider marker uses lime radar ping, route ribbon uses `bg-[#1E1B1C]/90 text-white border-white/10`.

### 6.3 Owner Desk (`OwnerView.jsx`) & Developer Desk (`DeveloperView.jsx`)
- **Normalization Rule**:
  - Statistics cards, revenue graphs, and metric counters strictly inherit `--bg-card` (`#FFFFFF` in Light, `#242021` in Dark) and `--text-primary`.
  - All tabular action buttons adhere to the button hierarchy matrix in Section 5.1.

---

## 7. Mobile & Touch Ergonomics Rules

1. **Auto-Focus Suppression**: Mobile devices must never auto-focus inputs on modal load to prevent unwanted virtual keyboard viewport jumps.
2. **Scroll-to-Blur**: Touching or scrolling any result list immediately blurs active inputs (`document.activeElement.blur()`).
3. **Safe Area Insets**: Floating capsules, cart bars, and bottom sheets must observe `env(safe-area-inset-bottom)` and `max-w-[calc(100vw-24px)]` to prevent edge clipping.
4. **Minimum Touch Target**: Interactive touch targets must measure at least `44px × 44px`.

---

## 8. Implementation Checklist & Phasing (Awaiting User Sign-Off)

- [x] **Phase 0**: Sizing, Typography, Component Dimensions & a11y specifications added to `DESIGN.md`.
- [ ] **Phase 1**: Token & CSS normalization in `src/index.css` (defining CSS custom property mappings).
- [ ] **Phase 2**: `KitchenView.jsx` light theme contrast normalization (Accept CTA, OTP pill, status filters).
- [ ] **Phase 3**: `TransportView.jsx` & `ActiveOrderTrackingModal.jsx` light theme map polyline & marker contrast normalization.
- [ ] **Phase 4**: `OwnerView.jsx` & `DeveloperView.jsx` dark/light consistency pass.
- [ ] **Phase 5**: Full compile check (`npm run build` + Android `./gradlew assembleDebug`).

