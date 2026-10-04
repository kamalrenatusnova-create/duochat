# Design Brief

## Direction

Ember — a warm, intimate two-person chat app where a shared connection code unlocks a private room between you and one friend.

## Tone

Warm analog meets modern polish: cream paper surfaces, ember-coral accents, and soft rounded forms that feel handwritten and human rather than corporate.

## Differentiation

A warm coral-on-cream messaging canvas with a charred-ember wordmark and jade "connected" presence — the anti-blue chat app.

## Color Palette

| Token      | OKLCH          | Role                              |
| ---------- | -------------- | --------------------------------- |
| background | 0.965 0.014 78 | Warm cream canvas (light)         |
| foreground | 0.22 0.028 45  | Warm ink text                     |
| card       | 0.99 0.008 80  | Raised conversation surfaces      |
| primary    | 0.63 0.155 33  | Ember coral — send, CTA, accents  |
| accent     | 0.58 0.11 168  | Jade — connected / presence state |
| muted      | 0.93 0.018 78  | Sidebar wells, timestamps         |
| dark bg    | 0.165 0.014 48 | Warm charcoal (dark mode)         |

## Typography

- Display: Fraunces — wordmark, empty-state headlines, connection-code hero
- Body: DM Sans — messages, names, labels, all UI
- Mono: Geist Mono — connection codes, timestamps, file sizes
- Scale: hero `text-4xl md:text-6xl font-semibold tracking-tight`, h2 `text-2xl font-semibold`, label `text-xs font-semibold tracking-widest uppercase`, body `text-[15px] leading-relaxed`

## Elevation & Depth

Layered warm surfaces: sidebar sits on `bg-sidebar`, conversation on `bg-background`, cards/bubbles lift with `shadow-subtle` and outgoing bubbles with a coral-tinted `shadow-bubble-out`; no neon or glow.

## Structural Zones

| Zone        | Background              | Border        | Notes                                             |
| ----------- | ----------------------- | ------------- | ------------------------------------------------- |
| App frame   | `bg-sidebar`            | —             | Rounded, `shadow-elevated`, floats on warm page   |
| Sidebar     | `bg-sidebar`            | `border-r`    | Connections list; active item coral-tinted + bar  |
| Chat header | `bg-card/80 backdrop-blur` | `border-b` | Avatar, name, jade connected pill, leave action   |
| Messages    | `bg-background`         | —             | `bg-gradient-subtle`; in/out bubble alternation   |
| Composer    | `bg-card`               | `border-t`    | Pill input, attach + send; safe-area padding      |

## Spacing & Rhythm

8px base grid; 16–20px pane padding; 10px gap between messages with 24px between sender groups; bubbles max-w `[72%]` desktop / `[85%]` mobile.

## Component Patterns

- Buttons: pill (`rounded-full`), `bg-primary` with warm shadow, hover darkens + lifts 1px; ghost icon buttons for attach/leave
- Cards: `rounded-2xl`, `bg-card`, `border`, `shadow-subtle`; connection cards hover to `bg-sidebar-accent`
- Bubbles: incoming `rounded-[18px] rounded-bl-md bg-bubble-in`; outgoing `rounded-[18px] rounded-br-md bg-bubble-out text-bubble-out-foreground`
- Badges: jade pill for connected; coral circular count badge for unread
- Connection code: `font-mono tracking-[0.3em]` in a dashed-border card

## Motion

- Entrance: `animate-fade-up` for panes, `animate-message-in` for new bubbles (0.28s spring)
- Hover: `transition-smooth` on cards/buttons, 0.3s ease
- Decorative: `animate-ember-pulse` on the logo dot and connected indicator; `animate-slide-in-left` for sidebar items

## Constraints

- Exactly two participants per conversation; no group UI
- No reactions or read receipts — presence is a simple jade dot only
- Tokens only: no raw hex/rgb or arbitrary color classes in components
- Light and dark must both feel warm; dark is never cold grey

## Signature Detail

A charred-ember flame dot beside the Fraunces wordmark that gently pulses in jade when your friend is connected — the app's heartbeat.
