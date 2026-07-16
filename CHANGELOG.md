# Changelog

All notable changes to this project will be documented in this file.

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
