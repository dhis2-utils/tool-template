# Design: tool-template Quality Improvements

**Date:** 2026-03-17
**Status:** Approved

## Overview

Address all identified quality issues in the tool-template DHIS2 app template across three areas: bug fixes, dependency modernization, and polish. Changes are organized into three logical commits for clean history and easy review.

---

## Commit 1 — Bug Fixes

### `webpack.config.js`

**`isDevBuild` detection**
Replace fragile `process.argv` check by converting the config export to a webpack function (the recommended pattern), which receives `env.WEBPACK_SERVE` as a boolean when using `webpack serve`:

The entire `webpackConfig` object (including all plugins and rules that reference `isDevBuild`) must be constructed inside the function body. Module-level variables like `dhisConfig` (loaded from `d2auth.json`) remain outside the function as they don't depend on `isDevBuild`.

```js
// Before: plain object export
const isDevBuild = process.argv[1].indexOf("webpack-dev-server") !== -1;
// ... webpackConfig defined at module level ...
module.exports = webpackConfig;

// After: function export — webpackConfig built inside
module.exports = (env = {}) => {
    const isDevBuild = Boolean(env.WEBPACK_SERVE);
    const webpackConfig = {
        // ... all config including plugins referencing isDevBuild ...
    };
    return webpackConfig;
};
```

**`mode` hardcoded to `"development"`**
Make mode conditional so production builds are properly optimized:
```js
mode: isDevBuild ? "development" : "production"
```

**Remove jQuery ProvidePlugin**
The `webpack.ProvidePlugin` block injecting `$`, `jQuery`, and `window.jQuery` has no corresponding jQuery dependency and is not used in the template. Remove it entirely.

**Remove SCSS rule**
The SCSS rule references `sass-loader` which is not installed. The template only uses plain CSS. Remove the rule:
```js
// Remove this block:
{
    test: /\.scss$/,
    use: ["style-loader", "css-loader", "sass-loader"]
}
```

### `src/js/d2api.js`

**`handleApiError` non-JSON crash**
`response.json()` throws if the error response is not JSON (e.g. a 502 returning HTML). Wrap in try/catch with fallback:
```js
const handleApiError = async (response) => {
    let errorMessage = "Network response was not ok";
    try {
        const errorDetail = await response.json();
        errorMessage = errorDetail.message || errorMessage;
    } catch (_) {
        errorMessage = response.statusText || errorMessage;
    }
    throw new Error(`${response.status} ${response.statusText} - ${errorMessage}`);
};
```

**`d2PostThenGet` non-JSON crash**
`d2PostThenGet` calls `response.json()` on both the initial POST and each polling GET without checking `response.ok` first. In both `.then(response => response.json())` chains, add a `response.ok` check first — if not OK, call `handleApiError(response)` (which throws), causing the Promise to reject. This is consistent with the pattern used in `d2Get`, `d2PostJson`, `d2PutJson`, and `d2Delete`.

**Remove duplicate comment**
Remove the second identical `// Ensure the final format is /api/...` comment on line 28.

---

## Commit 2 — Modernization

### Replace deprecated loaders with webpack 5 asset modules

Remove `file-loader` and `url-loader` from `devDependencies` and replace all loader-based rules with native webpack 5 asset module rules:

| Old rule | New rule |
|---|---|
| `url-loader?limit=100000` for PNG | `type: 'asset'` with `parser.dataUrlCondition.maxSize: 100000` (preserves 100 KB inline threshold) |
| `url-loader?limit=10000&mimetype=...` for woff/woff2 | `type: 'asset'` with `parser.dataUrlCondition.maxSize: 10000` |
| `file-loader` for ttf/otf/eot/svg/jpg/gif | `type: 'asset/resource'` |

### Fix deprecated `[hash]` placeholder

In `output.filename`, replace `[hash]` with `[contenthash]` (webpack 5 deprecation):
```js
filename: "[name]-[contenthash].js"
```

### Dependency upgrades

All upgrades target latest stable as of 2026-03-17:

| Package | From | To | Notes |
|---|---|---|---|
| `copy-webpack-plugin` | `^12` | `^14` | No config changes required |
| `webpack-cli` | `^5` | `^7` | No config changes required |
| `eslint` | `^9` | `^10` | Update config (see below) |
| `@eslint/js` | `^9` | `^10` | Paired with eslint upgrade |
| `globals` | `^15` | `^17` | API unchanged |
| `file-loader` | `^6` | removed | Replaced by asset modules |
| `url-loader` | `^4` | removed | Replaced by asset modules |

### Update `eslint.config.js` for ESLint v10

The current config uses `FlatCompat` only to wrap `eslint:recommended`, which is redundant since `@eslint/js` provides `js.configs.recommended` as a native flat config object. Also fix the latent bug where `es2021: true` is incorrectly placed inside the `globals` object instead of as a `languageOptions` property.

Replace with direct flat config:

```js
const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                require: "readonly",
                __dirname: "readonly",
                process: "readonly",
                module: "readonly",
                DHIS_CONFIG: "readonly",
            },
            ecmaVersion: 2021,
            sourceType: "module"
        },
        rules: {
            indent: ["error", 4],
            quotes: ["error", "double"],
            semi: ["error", "always"],
            "no-console": "off"
        }
    }
];
```

Remove `@eslint/eslintrc` from `devDependencies` — it is only needed for `FlatCompat` which is no longer used.

Note: `sourceType: "module"` is correct here because the lint script (`eslint src`) only processes files in `src/`, all of which use ES module syntax (`import`/`export`). The CommonJS config files (`webpack.config.js`, `eslint.config.js`) are not linted by this command.

---

## Commit 3 — Polish

### `package.json`
- Fix typo: `"Univeristy"` → `"University"`

### `src/index.html`
- Add `<title>DHIS2 Tool</title>` inside `<head>` — generic placeholder for tools to override

### `README.md`
- Update copyright year: `2024` → `2026`

---

## Out of Scope

- jQuery is not added as a dependency — tools that need it add it themselves
- SCSS support is not added — tools that need it add `sass-loader` + `sass` themselves
- Legacy DHIS2 header bar support (< 2.42) is preserved as-is
- `d2PostThenGet` polling logic and retry behavior is kept as-is (only error handling is fixed)
- `d2-manifest` package is kept (still functional despite being unmaintained)
