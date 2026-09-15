# Automation P0 Debug Order

For Goal `HEALTH-VISUAL-PILOT-001`, automation smoothness and deterministic debugging have priority over visual implementation changes whenever CI state is inconsistent or misleading.

Required order:
1. Canonicalize branch against current `main` before diagnosing CI.
2. Run Health VISUAL manifest/approved-asset policy first.
3. Keep production asset allowlist synchronized with the approved visual manifest; expected checksums may be registered before binaries match, but CI must fail until repository bytes match those checksums.
4. Do not treat a delivery/deployment green status as release readiness while manifest state is `BLOCKED`.
5. Resolve exact asset/checksum failures before browser/visual claims.
6. Re-run all required gates on one exact PR head SHA.
7. Only after all internal gates are green, accept exact-SHA Vercel preview and desktop/mobile evidence.
8. Amanda Goal Controller remains the only Goal-level completion authority.

No second controller, no synthetic completion, no stale-state success, no silent asset substitution.
