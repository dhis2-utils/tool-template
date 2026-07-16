# Review findings: tool-template v0.3.0

Reviewed: 2026-07-15 · Scope: code review + functional test (structure/tooling/architecture focus — this is a template, not a functional app) · Reviewer: agent (Claude Fable 5, Claude Code)
DHIS2 versions tested: 2.40.12, 2.41.9, 2.42.5.1, 2.43.0.1 (Sierra Leone demo seeds, broker instances)

## Summary

The template is in good shape and does what it promises: `yarn install → yarn run zip` produces a zip that installs and renders cleanly on every supported DHIS2 version from 2.40 through 2.43, the legacy-header-bar switch behaves correctly on both sides of the 2.42 global-shell boundary, and lint/build are clean out of the box. No HIGH findings. The issues that matter are tooling hygiene: the release workflow uses archived GitHub Actions and fails on any second push to main without a version bump, two diverged lockfiles are committed, AGENTS.md documents a wrong signature for `d2PostThenGet`, and the dev-server setup routes API calls around its own proxy, making dev mode depend on the instance's CORS allowlist.

## Findings

### HIGH

None.

### MEDIUM

#### M1. AGENTS.md documents a wrong signature for `d2PostThenGet`

- **Where**: `AGENTS.md:47` vs `src/js/d2api.js:148`
- **What**: AGENTS.md says `d2PostThenGet(postUrl, body, getUrl)` — three parameters, with a POST body. The actual function takes a single `endpoint`, sends **no body**, and polls the **same** endpoint with GET. AGENTS.md is the contract that coding agents (and new developers) build against; code generated from this doc will silently drop its POST body and poll the wrong URL.
- **Fix**: Correct AGENTS.md to `d2PostThenGet(endpoint)` and note the no-body/same-endpoint semantics — or, better, extend the function to match the documented (more useful) signature and keep the docs.

#### M2. Two diverged lockfiles committed (`yarn.lock` + `package-lock.json`)

- **Where**: repo root; e.g. webpack pinned at 5.101.3 in `package-lock.json` but resolved to 5.105.4 by `yarn.lock`
- **What**: README, scripts, and CI all use yarn, but an npm lockfile is also tracked and has already drifted. Which dependency tree you get depends on which tool you happen to run — and every project scaffolded from the template inherits the ambiguity.
- **Fix**: Delete `package-lock.json`, add it to `.gitignore` (or add `packageManager`/an `.npmrc` with `package-lock=false`).

#### M3. Release workflow uses archived actions and fails on repeat pushes to main

- **Where**: `.github/workflows/webpack.yml:45-65`
- **What**: Three problems. (1) `actions/create-release@v1` and `actions/upload-release-asset@v1` are archived/unmaintained (deprecated since 2021). (2) The workflow runs on **every push to main** and tries to create release `v<package.json version>` — the second push without a version bump fails because the tag/release already exists. (3) It also triggers on `v*.*.*` tags, so a tagged release attempts to create the same release twice. Minor: `jq` is preinstalled on ubuntu-latest (the install step is dead weight), and the `id:`/`GITHUB_ENV` mix is inconsistent. There is also no CI at all for pull requests (no lint/build check).
- **Fix**: Replace with `softprops/action-gh-release` (or plain `gh release create`), trigger releases on tags only (or gate on a version change), and add a separate PR workflow running `yarn lint && yarn build`. `CHANGELOG.md` is used as the release body but is empty — worth seeding with a real entry per release.

#### M4. Dev mode bypasses its own proxy, so it depends on the instance's CORS allowlist and embeds credentials in the served bundle

- **Where**: `src/js/d2api.js:3` (`baseUrl = isDev ? dhisDevConfig.baseUrl : "../../.."`), `webpack.config.js:116-118` (DefinePlugin), `webpack.config.js:120-150` (proxy)
- **What**: The dev server configures a full pass-through proxy that injects the `Authorization` header and maintains the JSESSIONID — but in dev mode `d2api.js` fetches the DHIS2 instance **directly, cross-origin**, with the Basic/PAT credentials compiled into the served JavaScript via `DefinePlugin`. The proxy ends up serving only the legacy header bar's relative requests. Consequences: (a) dev mode only works if the app origin is in the instance's CORS allowlist — it works out of the box against the demo databases solely because they pre-whitelist `http://localhost:8081` (verified live on 2.42); against any other instance the first dev experience is opaque CORS failures, and nothing in the README says so; (b) your PAT/password is readable in the browser bundle (dev-only, but PATs are long-lived).
- **Fix**: In dev, set `baseUrl` to `""` so all API calls go same-origin through the existing proxy (http-proxy-middleware appends the path to the target, so instances behind a context path like `/dhis` keep working). Then `DHIS_CONFIG` no longer needs to carry `authorization` to the browser at all, and the CORS requirement disappears. Alternatively, at minimum document the CORS-whitelist requirement in the README.

### LOW

#### L1. Malformed meta tag merges charset and viewport — `src/index.html:6` — `<meta charset="utf-8" name="viewport" content="...">` is one element; per the HTML spec the `name`/`content` pair on a charset meta is ignored, so there is effectively no viewport declaration. Split into two `<meta>` tags (and add `lang="en"` to `<html>`).

#### L2. Dev port hardcoded twice — `webpack.config.js:28` defines `devServerPort = 8081` but `webpack.config.js:77` hardcodes `publicPath: "http://localhost:8081/"`. Changing the port silently breaks asset URLs. Interpolate the constant (or make the port overridable via `.env`, e.g. `DHIS2_DEV_PORT`).

#### L3. `validateUID` false-positives on query strings — `src/js/d2api.js:31-34` — `endpoint.split("/").pop()` includes the query string, so e.g. `d2Delete("dataElements/Ab12Cd34Ef5?force=true")` warns about a missing UID. Strip the query/fragment before testing.

#### L4. `d2PostThenGet` resolves with an empty object on timeout — `src/js/d2api.js:176` — after 10 empty polls it resolves `getData` (possibly `{}`) instead of rejecting, so callers can't distinguish "job produced nothing" from "gave up waiting". Reject with a timeout error (and consider making tries/interval parameters).

#### L5. Internal AI planning docs shipped in the template — `docs/superpowers/` contains a design spec and implementation plan for a past improvement round. Every app scaffolded from the template inherits them. Move to a wiki/issue or delete; `.DS_Store` should also be added to `.gitignore` (one is sitting untracked in the working tree).

#### L6. README gaps — `README.md` — no statement of supported DHIS2 versions (this review verified 2.40–2.43), no instruction for installing the zip (App Management upload), no mention of `yarn lint` or of AGENTS.md's scaffolding checklist. Also states webpack "assumes DHIS2 is running on http://localhost:8080/dhis" — true only as fallback when no `.env` exists. Minor: the title "DHIS2 App Template for Dummies" reads as informal for an org template.

#### L7. No `engines` field — `package.json` — `webpack.config.js:33` uses global `fetch`, so Node ≥ 18 is required but nothing declares it; on Node 16 `yarn start` crashes cryptically. Add `"engines": { "node": ">=18" }`. (The `zip` script also shells out to the `zip` binary — absent on Windows; worth a README note.)

## Claims investigated and rejected

- **Claim**: Dev mode cannot work without manually extending the instance's CORS allowlist (would have raised M4 to HIGH).
- **Source**: static review of `d2api.js` dev-mode base URL + DHIS2 CORS rules.
- **Refuted by**: live test — `yarn start` against a broker 2.42.5.1 Sierra Leone instance worked immediately; the demo seed pre-whitelists `http://localhost:8081` (confirmed via preflight `OPTIONS` returning `Access-Control-Allow-Origin`). The dependency on the allowlist is real (kept as M4) but the out-of-box breakage claim was wrong for demo databases.

- **Claim**: The vendored legacy header bar's hardcoded `/api/38/staticContent/logo_banner` request breaks on newer servers.
- **Source**: 404s captured in every version's console during functional testing.
- **Refuted by**: the same 404 appears on 2.42/2.43 where the request comes from DHIS2's own global shell (`/api/42/...`, `/api/43/...`) — it is normal DHIS2 behaviour when no custom logo is configured, not a template defect.

## Architecture assessment

**Stay on the vanilla tool-template shape — the template is the reference implementation of that shape and implements it correctly.** Judged against the conventions for vanilla DHIS2 tools: correct `manifest.webapp` + webpack marker files, relative `../../..` API base in production (works at any context path, verified on all four versions), `d2-manifest` generation preserved in the build chain, a single small API wrapper module, and a version-aware header-bar shim that correctly straddles the 2.42 global-shell boundary (legacy bar rendered on 2.40/2.41; hidden, shell-provided header on 2.42/2.43 — verified live). Bundle is ~6 KB of app code; no framework weight. The one architectural wrinkle worth fixing is M4 (route dev traffic through the proxy); with that, the dev experience matches the App Platform's zero-CORS-setup behaviour while keeping the template's simplicity. Nothing here argues for migrating the template itself to the App Platform — its entire purpose is the lightweight admin-tool niche the platform doesn't serve.

## Resolution

All findings (M1–M4, L1–L7) were fixed the same day and re-verified live — see `FIXES.md` in this folder for the per-finding fixes and verification, and `CHANGELOG.md` (0.4.0) for the change list. Notes on downstream `create-dhis2-app` skill implications were delivered separately (kept outside the repo).

## Environment gaps

None material. All four target versions were tested via broker instances with Sierra Leone demo seeds. Functional testing was Chromium-only (Playwright); no mobile/other-browser pass — acceptable for an admin-tool template.
