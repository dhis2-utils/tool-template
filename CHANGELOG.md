# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0

First stable release. The template is considered feature-complete for its purpose: a
minimal, vanilla-JavaScript starting point for DHIS2 admin tools.

- Corrected the Node requirement to `>=20.19.0` — the previously declared `>=18` was
  not achievable, as ESLint 10, webpack-cli 7 and copy-webpack-plugin 14 all require
  Node 20.9 or newer
- Release workflow now verifies that the pushed tag matches the `package.json` version,
  and builds the GitHub release notes from the matching `CHANGELOG.md` section instead
  of auto-generating them from commits
- CI and release workflows pin all actions to commit SHAs, run on Node 22, and install
  with `--ignore-scripts` so third-party lifecycle scripts are not executed in CI
- CI uploads the built app bundle as a workflow artifact
- App menu name is set explicitly via `manifest.webapp.name` in `package.json`, so it is
  independent of the npm package name
- Legacy header-bar detection no longer misfires if DHIS2 drops the `2.` version prefix
- Removed the broker-dependent end-to-end test harness (`e2e/`), its SonarCloud
  configuration, and the internal review documents from `docs/` — none of them were
  usable outside the original development environment

## 0.4.0

- Dev-server API calls now go same-origin through the webpack proxy: no CORS whitelisting needed on the DHIS2 instance, and credentials are no longer embedded in the dev bundle
- `d2PostThenGet` accepts an optional JSON body and a separate poll endpoint, and rejects with an error on timeout instead of resolving with an empty result
- `d2PutJson`/`d2Delete` UID validation no longer false-positives on endpoints with query parameters
- Dev-server port configurable via `DHIS2_DEV_PORT` in `.env`
- Fixed merged charset/viewport meta tag in `index.html`; added `lang` attribute
- Declared Node >= 18 requirement (`engines` in `package.json`)
- Removed stale `package-lock.json`; yarn is the single package manager
- Split CI (lint + build on PRs and main) from the release workflow (tag-driven, maintained actions)
- Removed internal planning documents from the template

## 0.3.0

- Replaced `d2auth.json` with `.env`; supports Personal Access Tokens and Basic Auth
- Merged CLAUDE.md into AGENTS.md
- Replaced `npm run` with `yarn` in scripts
