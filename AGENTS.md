# DHIS2 Tool - Agent Instructions

## Context

This is a DHIS2 web application built from the tool-template. It is a simple, vanilla JavaScript app that runs inside DHIS2 as an installed webapp. It is NOT a React app and does NOT use the DHIS2 App Platform.

## Architecture

- **Build system**: Webpack 5 with dev server proxy for DHIS2 authentication
- **No framework**: Plain JS with ES modules, direct DOM manipulation
- **API layer**: All DHIS2 API calls go through `src/js/d2api.js` (d2Get, d2PostJson, d2PutJson, d2Delete)
- **Styling**: Plain CSS in `src/css/`, loaded via webpack
- **DHIS2 integration**: Runs as installed app with relative API base path (`../../..`); dev mode uses proxy

## Rules

- Do not introduce React, Vue, or other frameworks - keep it vanilla JS
- Do not replace the webpack build with Vite or other tools
- All API calls must use the helpers in `src/js/d2api.js`
- Do not hardcode DHIS2 URLs or credentials in source files — credentials go in `.env` (gitignored)
- Auth config: copy `.env.template` to `.env`; supports `DHIS2_API_TOKEN` (PAT, recommended) or `DHIS2_USERNAME`+`DHIS2_PASSWORD` (Basic Auth)
- Keep the app simple - these tools are for admin tasks, not end-user applications
- Preserve the `d2-manifest` post-build step that generates `manifest.webapp`
- ESLint config: 4-space indent, double quotes, semicolons

## DHIS2 API

When making DHIS2 API calls, use the wrapper functions:
- `d2Get("/api/endpoint")` - GET requests
- `d2PostJson("/api/endpoint", body)` - POST with JSON body
- `d2PutJson("/api/endpoint", body)` - PUT with JSON body (warns if no UID)
- `d2Delete("/api/endpoint")` - DELETE requests (warns if no UID)

The `formatEndpoint` helper normalizes paths, so `/api/foo`, `api/foo`, and `/foo` all work.
