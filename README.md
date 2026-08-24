# DHIS2 Tool Template

Template for simple, vanilla-JavaScript DHIS2 tools — no React, no App Platform.

> **WARNING**
> Tools built from this template are intended to be used by system administrators to perform specific tasks; they are not intended for end users. They are available as DHIS2 apps, but have not been through the same rigorous testing as normal core apps. They should be used with care, and always tested in a development environment.

## Supported DHIS2 versions

Verified against DHIS2 2.40–2.43 (July 2026). On 2.41 and older the bundled legacy header bar is shown; on 2.42+ the app renders inside the DHIS2 global shell, which provides its own header.

## Requirements

- Node.js >= 20.19 and yarn
- The `zip` command-line utility (for `yarn run zip`; preinstalled on macOS/Linux)

## Getting started

### Install dependencies

```
yarn install
```

### Start the dev server

```
yarn start
```

The app is served on http://localhost:8081 by default. All `/api/...` calls are proxied to the DHIS2 instance with authentication handled server-side by the proxy, so the DHIS2 instance needs no CORS configuration and credentials never reach the browser.

Without configuration, the proxy assumes DHIS2 runs on http://localhost:8080/dhis with `admin:district`. To develop against a different instance, copy `.env.template` to `.env` and fill in the values:

```
DHIS2_BASE_URL=http://localhost:9000/dev

# Option 1: Personal Access Token (recommended for DHIS2 2.38+)
# Create one in DHIS2 under: Profile → Edit profile → Personal access tokens
DHIS2_API_TOKEN=your_token_here

# Option 2: Username and password
DHIS2_USERNAME=john_doe
DHIS2_PASSWORD=District1!

# Optional: change the dev-server port (default 8081)
DHIS2_DEV_PORT=8082
```

Token takes priority over username/password if both are set. `.env` is gitignored — never commit credentials.

### Lint

```
yarn lint
```

### Compile to zip

```
yarn run zip
```

This lints, builds to `build/`, and packages `compiled/<name>.zip`.

### Install in DHIS2

Upload the zip in the **App Management** app (or `POST /api/apps`). The app appears in the app menu under the `manifest.webapp.name` value from `package.json`.

## Creating a new tool from this template

See the scaffolding checklist in [AGENTS.md](AGENTS.md) — update `package.json` (name, description, version, manifest section), replace the icons in `src/img/icons/`, and build your UI in `src/index.html` + `src/app.js`, using the API helpers in `src/js/d2api.js`.

## License

© Copyright University of Oslo 2026
