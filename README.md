# BrandWeave Network

**The partnership network for brands.** *Stronger brands, woven together.*

Brands discover complementary brands, expose the marketing channels they're willing to share, negotiate
two-way commercial terms in a Deal Room, track the sales that result, and settle commission and flat fees.
Affiliate tracking is the infrastructure; brand-to-brand discovery and customer-experience partnerships are the product.

> Domain: brandweavenetwork.com · Stack: Next.js 16 · React 19 · TypeScript · Tailwind 4 · Prisma (PostgreSQL)

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # commission engine + conversion pipeline (45 tests)
npm run typecheck && npm run lint
npm run db:validate  # validates prisma/schema.prisma
```

Open `/` for the marketing site, then **Enter the demo workspace** to explore the app as *Maya Okafor, Owner at Lumen Labs*.

> **Windows note:** the npm scripts call package entry files directly (`node ./node_modules/…`) because
> `.bin` shims break when the project path contains `&`.

## What's built vs. what's scaffolding

| Area | State |
|---|---|
| Marketing site (all six sections), sign-in/up pages | Built. Auth pages are a **demo stub** — no provider is connected. |
| App shell, role-based permissions | Built. Roles are enforced server-side in every action (`src/lib/constants.ts`, `src/app/actions.ts`); the session is the demo user. |
| Brand profile, Available Channels, Discover (all spec filters), brand pages, Brand Matches | Built. Channel *editing* and file uploads are not yet. |
| Opportunities, connection requests, Deal Rooms, messaging (incl. internal notes), Deal Builder | Built (in-memory writes). |
| Tracking links, QR codes, click redirect, conversion API, tracking pixel | Built and working end-to-end. |
| Commission engine, transaction lifecycle, reversals, payout statements | Built and unit-tested (`src/lib/commission.ts`). |
| Transactions, Payouts, Analytics, Integrations, Settings | Built. |
| **Persistence** | **Not yet.** Writes go to an in-memory store (`src/lib/store.ts`) that resets on restart / serverless cold start. `prisma/schema.prisma` is the validated target model. |
| Real auth (Clerk / Auth.js with orgs), object storage, email, Stripe payouts, Shopify | Not started (Phase 2). |

All demo brands (Voyago, Lumen Labs, Stagecraft Live, …) are **fictional**. No real company is represented as a member.

## Architecture

```
src/
  app/
    (marketing)/         public site
    (auth)/              sign-in / sign-up (stub)
    (platform)/          the app: home, discover, brands/[slug], opportunities, partnerships/[id] (Deal Room),
                         messages, links, transactions, payouts, analytics, integrations, brand-profile, settings
    r/[code]/            click tracking → 302 with bw_click_id
    api/v1/conversions   server-side conversion API (Bearer key)
    api/v1/pixel         tracking pixel (fallback)
    actions.ts           server actions — every one re-checks the caller's role
  lib/
    commission.ts        PURE engine: eligibility → commission → lifecycle → reversal → statement
    conversions.ts       parse/validate events, join to click, create Transaction
    tracking.ts          click/link ids, destination normalisation
    matching.ts          rule-based Brand Matches that explain *why* two brands fit
    store.ts / queries.ts  in-memory store + read models (swap for Prisma)
    data/                fictional seed data (transactions are generated through the real engine)
```

### The money model

* **Integer cents, basis points.** No floats touch money.
* **Directions.** A partnership holds up to two *directions*: `promoter` drives sales to `payer`, who pays. Each has its own channels, compensation, attribution, rules and terms — reciprocal deals are native, not a special case.
* **Lifecycle:** `Pending` (returns period) → `Approved` → `Locked` (locking period) → `Payable` (next monthly cycle) → `Paid`, or `Reversed`. Returns on *paid* commission create a negative **Adjustment** instead of rewriting history.

### Tracking loop

1. A partner's audience clicks `…/r/<code>` → a `Click` with a unique `clk_…` id is recorded → redirect to the destination with `?bw_click_id=clk_…`.
2. The receiving brand stores that id and, on purchase, calls the API:

```bash
curl -X POST http://localhost:3000/api/v1/conversions \
  -H "Authorization: Bearer bw_test_lumen_demo" -H "Content-Type: application/json" \
  -d '{"order_id":"1042","click_id":"clk_…","revenue":349.00,"currency":"USD","customer_type":"new","country":"US"}'
```

3. The event is joined to the click, checked against the agreement (window, currency, new-customer rule, geography, excluded SKUs), commission is computed, and a `Pending` transaction is created.

Security properties (covered by `src/lib/conversions.test.ts`): only the **paying** brand can report sales for a click; conversions are **idempotent** per `(payer, order_id)`; input is validated and size-capped; link destinations must be on the paying brand's own domain (no open redirects). The pixel cannot authenticate its sender, so its transactions are tagged `source: "pixel"` — the API is the recommended integration.

`bw_test_<brand>_demo` keys are **demo-only**. Production keys must be generated once, stored hashed (`ApiKey` model), and scoped per organization.

## Next steps (in the order of your build priority)

1. **Auth + organizations** — Clerk or Auth.js; replace `CURRENT_USER`; add a `proxy.ts` gate for `(platform)`.
2. **Persistence** — first Prisma migration (include the partial unique index noted in the schema), then replace `store.ts` / `queries.ts` behind the same function signatures.
3. Channel editor + asset uploads (S3-compatible).
4. Notifications + Resend email; proposal history (`Proposal` snapshots) and contract generation.
5. Scheduled job to advance transaction statuses and assemble payouts; Stripe Connect for automated payouts.
6. Dedicated tracking host `go.brandweavenetwork.com/<code>`; bot filtering and fraud checks on clicks.
7. Shopify / WooCommerce / BigCommerce integrations; promo-code attribution; AI matching (the `BrandMatch.reasons` interface is where it plugs in).
