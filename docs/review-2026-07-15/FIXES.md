# Fixes applied — tool-template, 2026-07-15

Follow-up to `REVIEW-FINDINGS.md` in this folder. One entry per finding addressed.

Verification legend: live = re-tested against a fresh broker 2.42.5.1 Sierra Leone instance
(`agent-review-tt-42b`: zip install/render matrix, dev-server request capture, d2api runtime
tests); inspection = read-back of the changed file plus clean `yarn lint && yarn build`.

---

## Fixed

### M1. AGENTS.md documented a wrong signature for `d2PostThenGet`

- **Severity:** MEDIUM
- **Fix:** Extended the function to match the documented (more useful) signature —
  `d2PostThenGet(endpoint, body?, getEndpoint?, maxTries?, intervalMs?)` — rather than
  weakening the docs, and updated AGENTS.md to describe the final semantics.
- **Where:** `src/js/d2api.js:151`, `AGENTS.md:47`
- **Verified by:** live — exercised against the data-integrity API on 2.42.5.1: success path
  returns the summary; timeout path rejects with a clear error (also closes L4).

### M2. Two diverged lockfiles committed

- **Severity:** MEDIUM
- **Fix:** Deleted `package-lock.json`; added it to `.gitignore` so it can't return.
- **Where:** `package-lock.json` (removed), `.gitignore:11`
- **Verified by:** inspection — `git ls-files` shows only `yarn.lock`; `yarn install && yarn build` clean.

### M3. Release workflow used archived actions and failed on repeat pushes to main

- **Severity:** MEDIUM
- **Fix:** Replaced `webpack.yml` with two workflows: `ci.yml` (lint + build on PRs and main)
  and `release.yml` (tag-driven, `softprops/action-gh-release`, CHANGELOG as release body).
  Seeded `CHANGELOG.md` with the 0.4.0 entry.
- **Where:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`,
  `.github/workflows/webpack.yml` (removed), `CHANGELOG.md`
- **Verified by:** inspection — YAML validated locally; the equivalent `yarn lint && yarn build`
  steps pass. Full end-to-end confirmation lands with the first PR and first `v*` tag on GitHub.

### M4. Dev mode bypassed its own proxy (CORS dependency, credentials in served bundle)

- **Severity:** MEDIUM
- **Fix:** In dev builds `DHIS_CONFIG` now carries `baseUrl: ""`, so all API calls go
  same-origin through the webpack dev-server proxy, which injects authentication.
  Credentials no longer reach the browser bundle; no CORS whitelisting needed.
- **Where:** `webpack.config.js:120-122` (DefinePlugin), `src/js/d2api.js:1-3` (unchanged consumer)
- **Verified by:** live — request capture during a dev-server session showed zero direct
  (cross-origin) requests to the instance; served bundle grep'd clean of credentials.

### L1. Malformed merged charset/viewport meta tag

- **Severity:** LOW
- **Fix:** Split into separate `<meta charset>` and `<meta name="viewport">` tags; added `lang="en"`.
- **Where:** `src/index.html:3-7`
- **Verified by:** inspection of the rebuilt bundle's HTML.

### L2. Dev port hardcoded twice

- **Severity:** LOW
- **Fix:** Port now configurable via `DHIS2_DEV_PORT` (default 8081); `publicPath` is `"/"`
  in dev, so no second hardcoded URL.
- **Where:** `webpack.config.js:28`, `webpack.config.js:77`
- **Verified by:** live — dev server started on an overridden port and served the app.

### L3. `validateUID` false-positives on query strings

- **Severity:** LOW
- **Fix:** Strip query/fragment before extracting the trailing UID.
- **Where:** `src/js/d2api.js:32-33`
- **Verified by:** live — d2api runtime tests on 2.42.5.1; endpoints with `?force=true` no longer warn.

### L4. `d2PostThenGet` resolved with an empty object on timeout

- **Severity:** LOW
- **Fix:** Rewritten as part of M1 — rejects with a timeout error after `maxTries` empty polls.
- **Where:** `src/js/d2api.js:181`
- **Verified by:** live — see M1.

### L5. Internal AI planning docs shipped in the template

- **Severity:** LOW
- **Fix:** Deleted `docs/superpowers/` (design spec + implementation plan).
- **Where:** `docs/superpowers/` (removed)
- **Verified by:** inspection — directory absent from the tree and from `git ls-files`.

### L6. README gaps

- **Severity:** LOW
- **Fix:** README now states supported DHIS2 versions (2.40–2.43, as verified by this review),
  zip install instructions, `yarn lint`, correct `.env`-based dev configuration, and a neutral title.
- **Where:** `README.md`
- **Verified by:** inspection.

### L7. No `engines` field

- **Severity:** LOW
- **Fix:** Declared `"engines": { "node": ">=18" }` (webpack config relies on global `fetch`).
- **Where:** `package.json:5-7`
- **Verified by:** inspection.

## Not fixed (deliberate)

None — all findings from the 2026-07-15 review were addressed.
