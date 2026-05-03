# Pull request

## Summary

<!-- 1–2 sentences describing the change and why -->

## Checklist

- [ ] Tests pass locally (`cd plugin && node --test tests/*.test.mjs`)
- [ ] No personal data committed (no real SIRET, RCS, phone, email, company_id)
- [ ] Brouillon-only invariant respected — no exposure of `finalize()`, no auto-promotion `DRAFT → PENDING/FINALIZED`
- [ ] Guardrails in `lib/guardrails.mjs` not weakened (whitelist still strict, DELETE still blocked)
- [ ] If touching auth/session/cookie code: SECURITY.md considered

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation only

## Linked issue

<!-- Closes #N -->
