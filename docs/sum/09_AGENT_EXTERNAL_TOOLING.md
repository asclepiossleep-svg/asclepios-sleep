# SUM Agent External Tooling

Rex is not useful as an isolated coding model. It is an execution node that must be able to inspect the systems it is changing, while remaining bounded from production-risk actions.

## Tool classes

### GitHub — source/change control
- Status: connected through GitHub Actions / Claude Code Action.
- Default write path: feature branch → tests → PR.
- Forbidden by default: direct main commit, self-merge, secret/admin changes.
- Proof: issue/comment work order → branch → commit → checks → PR → report.

### Supabase — database/runtime inspection
Project config: `.mcp.json`.

Default MCP posture:
- project-scoped by `SUPABASE_PROJECT_REF`;
- read-only;
- feature groups limited to docs, database and debugging;
- bearer credential injected as `SUPABASE_ACCESS_TOKEN`, never committed.

This lets Rex inspect schema/data/logical state needed to debug without silently gaining mutation authority. Database writes/migrations require an explicitly approved elevation path and the normal migration/security review.

Authentication/config is **not operational** until the two required environment values are present in the execution environment and a harmless read-only query is proven.

### Vercel — deployment/runtime
Vercel remote MCP is appropriate for authenticated interactive sessions. Unattended CI should prefer scoped credentials and API/check mechanisms that can be audited and rotated.

Rex requires these capabilities over time:
- project identity;
- preview deployment URL;
- deployment status/build output;
- runtime logs;
- environment-variable presence (not secret values in logs);
- domain status;
- deployment/check result.

No production-domain mutation, DNS change, paid plan change or production promotion without owner authority.

### Shopify — commerce
Production commerce administration remains in Shopify. Rex should not receive broad Admin credentials merely to render a storefront.

Runtime/site integration should use the narrowest Shopify interface needed:
- Storefront/customer-safe API for catalogue/cart where appropriate;
- signed Admin/webhook backend integration for order events where required;
- secrets only server-side;
- idempotent webhook ingestion.

Catalogue/content changes must preserve DRAFT/launch gates until commercial fields are confirmed.

### CRM / lifecycle marketing
Provider is not yet selected. Mature candidates may include Shopify-native customer/lifecycle features initially, then Klaviyo/HubSpot or another approved provider when the operating requirement justifies it.

Do not create duplicate customer truth. External CRM IDs remain aliases to canonical customer identity.

### Fulfilment / carrier
Provider is TBC. Rex works against the SUM fulfilment adapter and test doubles until a real 3PL/carrier is commercially selected. Provider-specific code must be isolated behind the adapter contract.

### Error monitoring
Provider is TBC. Until selected, structured logs + health endpoints + GitHub synthetic checks are the minimum floor, not the final observability stack.

## Permission levels

### L0 — inspect
Read repo, docs, provider metadata, logs, schema, status.

### L1 — safe staging write
Feature branches, PRs, test data, staging-only configuration where credentials and scope allow.

### L2 — reversible operational write
Draft Shopify objects, replaying failed staging events, retrying CI, preview deployment actions.

### L3 — production-impacting
Publishing products, capturing/refunding money, changing stock truth, contacting customers, fulfilment dispatch, DNS/domain changes, production DB mutation.

L3 always requires the relevant owner/commercial/legal authorization; automation does not infer permission from technical capability.

## Agent work-order contract

Before acting Rex must state internally/record in the PR:
1. which SUM link is being moved;
2. current evidence state;
3. target evidence state;
4. provider/tool required;
5. allowed permission level;
6. success probe;
7. failure probe;
8. rollback/recovery path.

If a required provider is unavailable, Rex must not invent a result. It marks `NOT WIRED`, implements the provider-neutral adapter/test double if useful, and moves to the next unblocked link.

## Credential health

Secrets are dependencies with their own health state. Monitoring records only presence/validity outcome, never secret values.

Required checks include:
- credential missing;
- authentication rejected;
- permission insufficient;
- expired/revoked;
- provider rate-limited;
- environment mismatch (preview vs production).

## Proven-pattern rule

Use official/provider-supported APIs, SDKs, webhooks and workflow primitives before custom scraping or browser automation. Browser automation is a test/last-mile tool, not the canonical integration transport when an API exists.
