# DHIS2 Tool Template

Simple webpack-based template for building DHIS2 web apps ("tools") intended for system administrators.

## Project Structure

```
src/
  app.js           - Entry point, imports API helpers and CSS
  index.html       - Main HTML template with DHIS2 header bar div
  js/d2api.js      - DHIS2 API wrapper (d2Get, d2PostJson, d2PutJson, d2Delete, d2PostThenGet)
  js/check-header-bar.js - Loads legacy header bar for DHIS2 < 2.42
  css/style.css    - App styles
  img/             - Icons and images
  resources/       - Legacy DHIS2 header bar JS
```

## Build & Dev

- `yarn install` - Install dependencies
- `yarn start` - Start dev server on port 8081, proxying to DHIS2
- `yarn run build` - Build to `build/` directory
- `yarn run zip` - Build and zip for DHIS2 upload to `compiled/`
- `yarn run lint` - Run ESLint

## Auth Configuration

Copy `.env.template` to `.env` and fill in the values. Supports two auth methods (token takes priority):

```
DHIS2_BASE_URL=http://localhost:8080/dhis
DHIS2_API_TOKEN=your_token        # Personal Access Token (DHIS2 2.38+, recommended)
DHIS2_USERNAME=admin              # Basic Auth fallback
DHIS2_PASSWORD=district
```

`.env` is gitignored — never commit credentials.

## Key Conventions

- Vanilla JavaScript (no framework), ES modules in `src/js/`
- All DHIS2 API calls go through `d2api.js` helpers
- CSS in `src/css/`, imported in `app.js`
- The app runs inside DHIS2 as an installed app (relative API path `../../..`)
- Dev mode uses proxy + Basic Auth; production uses DHIS2 session
- Uses `d2-manifest` to generate `manifest.webapp` from `package.json` metadata
- ESLint: 4-space indent, double quotes, semicolons required

## When Making Changes Based on This Template

1. Update `name`, `description`, and `version` in `package.json`
2. Update the `manifest.webapp` section in `package.json` (app name, developer info)
3. Replace icon files in `src/img/icons/`
4. Add app logic in `src/app.js` and new modules in `src/js/`
5. Update `src/index.html` with the app's UI
