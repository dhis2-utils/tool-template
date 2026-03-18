# tool-template Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all identified quality issues in the tool-template across three logical commits: bug fixes, dependency modernization, and polish.

**Architecture:** Three sequential commits, each independently verifiable via `yarn run lint` and `yarn run build`. No test framework exists in this project — verification is via build and lint CLI commands. Commits must be made in order (1 → 2 → 3) since commit 2 changes deps that affect linting.

**Tech Stack:** Webpack 5, vanilla JS ES modules, ESLint (upgrading 9 → 10), npm/yarn

---

## File Map

| File | Changes |
|---|---|
| `webpack.config.js` | Commit 1: function export, isDevBuild fix, conditional mode, remove jQuery/SCSS. Commit 2: asset modules, contenthash |
| `src/js/d2api.js` | Commit 1: fix handleApiError, fix d2PostThenGet, remove duplicate comment |
| `eslint.config.js` | Commit 2: drop FlatCompat, rewrite as direct flat config |
| `package.json` | Commit 2: remove file-loader/url-loader/@eslint/eslintrc, upgrade major deps. Commit 3: fix typo |
| `src/index.html` | Commit 3: add `<title>` |
| `README.md` | Commit 3: update copyright year |

---

## Commit 1 — Bug Fixes

### Task 1: Fix `webpack.config.js` bugs

**Files:**
- Modify: `webpack.config.js`

- [ ] **Step 1: Read the current file**

Read `webpack.config.js` in full before making changes.

- [ ] **Step 2: Convert to function export**

The current file ends with `module.exports = webpackConfig;` where `webpackConfig` is a `const` defined at module level. Restructure so the entire `webpackConfig` object is built *inside* the exported function.

Things that stay at module level (don't depend on `isDevBuild`):
- `dhisConfig` loading block (reads `d2auth.json`)
- `fetchSessionCookie` and `initialize` functions
- `devServerPort` constant (line 20)

Things that move inside the function (reference `isDevBuild`):
- The entire `webpackConfig` object literal, including:
  - `output.publicPath` — `isDevBuild ? "http://localhost:8081/" : "./"` (already uses `isDevBuild`)
  - `plugins` array — two `DefinePlugin` entries reference `isDevBuild`
  - `mode` — being changed to conditional in Step 3

Remove the old `isDevBuild` line:
```js
// DELETE this line:
const isDevBuild = process.argv[1].indexOf("webpack-dev-server") !== -1;
```

Change the end of the file from:
```js
const webpackConfig = { ... };
module.exports = webpackConfig;
```

To:
```js
module.exports = (env = {}) => {
    const isDevBuild = Boolean(env.WEBPACK_SERVE);
    const webpackConfig = { ... };
    return webpackConfig;
};
```

All existing content of `webpackConfig` moves inside — nothing else changes structurally.

- [ ] **Step 3: Fix `mode` to be conditional**

Inside `webpackConfig`, change:
```js
// Before
mode: "development"

// After
mode: isDevBuild ? "development" : "production"
```

- [ ] **Step 4: Remove the jQuery ProvidePlugin block**

Delete this plugin from the `plugins` array:
```js
new webpack.ProvidePlugin({
    $: "jquery",
    jQuery: "jquery",
    "window.jQuery": "jquery"
}),
```

- [ ] **Step 5: Remove the SCSS rule**

Delete this entry from `module.rules`:
```js
{
    test: /\.scss$/,
    use: ["style-loader", "css-loader", "sass-loader"]
},
```

- [ ] **Step 6: Verify build works**

```bash
yarn run build
```
Expected: exits 0, `build/` directory created with `main-[hash].js` (still old hash format — that changes in commit 2).

---

### Task 2: Fix `src/js/d2api.js` bugs

**Files:**
- Modify: `src/js/d2api.js`

- [ ] **Step 1: Read the current file**

Read `src/js/d2api.js` in full before making changes.

- [ ] **Step 2: Remove duplicate comment**

In `formatEndpoint`, there are two identical consecutive lines:
```js
    // Ensure the final format is /api/...
    // Ensure the final format is /api/...
```
Delete the second one.

- [ ] **Step 3: Fix `handleApiError` to handle non-JSON error responses**

Replace the existing `handleApiError` function:
```js
// Current (crashes on non-JSON responses like 502 HTML pages)
const handleApiError = async (response) => {
    let errorMessage = "Network response was not ok";
    let errorDetail = await response.json();
    errorMessage = errorDetail.message || errorMessage;
    throw new Error(`${response.statusText} - ${errorMessage}`);
};

// Replace with
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

- [ ] **Step 4: Fix `d2PostThenGet` — initial POST response handling**

In `d2PostThenGet`, the first `.then()` currently does:
```js
.then(response => response.json())
.then(() => {
    // ... polling ...
})
```

Change to check `response.ok` before parsing JSON — if not OK, call `handleApiError` which throws, causing the Promise to reject:
```js
.then(async response => {
    if (!response.ok) {
        await handleApiError(response);
    }
    return response.json();
})
.then(() => {
    // ... polling logic unchanged ...
})
```

- [ ] **Step 5: Fix `d2PostThenGet` — polling GET response handling**

Inside `checkForResponse`, the fetch chain currently does:
```js
.then(response => response.json())
.then(getData => { ... })
```

Change to:
```js
.then(async response => {
    if (!response.ok) {
        await handleApiError(response);
    }
    return response.json();
})
.then(getData => { ... })
```

- [ ] **Step 6: Verify lint passes**

```bash
yarn run lint
```
Expected: no errors.

- [ ] **Step 7: Commit bug fixes**

```bash
git add webpack.config.js src/js/d2api.js
git commit -m "fix: correct webpack config and API error handling bugs"
```

---

## Commit 2 — Modernization

### Task 3: Replace deprecated loaders with webpack 5 asset modules

**Files:**
- Modify: `webpack.config.js`

- [ ] **Step 1: Replace PNG rule**

In `module.rules`, replace:
```js
{
    test: /\.png$/,
    use: ["url-loader?limit=100000"]
},
```
With (preserves original 100 KB inline threshold):
```js
{
    test: /\.png$/,
    type: "asset",
    parser: { dataUrlCondition: { maxSize: 100000 } }
},
```

- [ ] **Step 2: Replace woff/woff2 rule**

Replace:
```js
{
    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    use: ["url-loader?limit=10000&mimetype=application/font-woff"]
},
```
With (preserves original 10 KB inline threshold):
```js
{
    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    type: "asset",
    parser: { dataUrlCondition: { maxSize: 10000 } }
},
```

- [ ] **Step 3: Replace font/image file-loader rule**

Replace:
```js
{
    test: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
    use: ["file-loader"]
},
```
With:
```js
{
    test: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
    type: "asset/resource"
},
```

- [ ] **Step 4: Fix deprecated `[hash]` → `[contenthash]` in output**

In `output`, change:
```js
filename: "[name]-[hash].js"
```
To:
```js
filename: "[name]-[contenthash].js"
```

---

### Task 4: Upgrade dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `devDependencies` in package.json**

Replace the entire `devDependencies` block with:
```json
"devDependencies": {
    "@eslint/js": "^10.0.1",
    "copy-webpack-plugin": "^14.0.0",
    "css-loader": "^7.1.2",
    "d2-manifest": "^1.0.0",
    "eslint": "^10.0.3",
    "globals": "^17.0.0",
    "html-loader": "^5.1.0",
    "html-webpack-plugin": "^5.6.4",
    "style-loader": "^4.0.0",
    "webpack": "^5.101.3",
    "webpack-cli": "^7.0.0",
    "webpack-dev-server": "^5.2.2"
}
```

Removed: `@eslint/eslintrc`, `file-loader`, `url-loader`

- [ ] **Step 2: Install updated dependencies**

```bash
yarn install
```
Expected: `yarn.lock` updated, no errors. If you see peer dependency warnings about `copy-webpack-plugin` requiring a different webpack version, check and resolve — otherwise proceed.

---

### Task 5: Rewrite `eslint.config.js` for ESLint v10

**Files:**
- Modify: `eslint.config.js`

- [ ] **Step 1: Rewrite eslint.config.js**

Replace the entire file with:
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

Note: `sourceType: "module"` is correct — the lint command (`eslint src`) only processes `src/` files which all use ES module syntax (`import`/`export`).

- [ ] **Step 2: Verify lint passes**

```bash
yarn run lint
```
Expected: no errors. If you see new lint errors from `js.configs.recommended` catching things the old config missed, fix them in `src/`.

- [ ] **Step 3: Verify build succeeds**

```bash
yarn run build
```
Expected: exits 0. Output bundle filename should now be `main-[contenthash].js` (no more webpack deprecation warning about `[hash]`).

- [ ] **Step 4: Commit modernization**

```bash
git add webpack.config.js package.json yarn.lock eslint.config.js
git commit -m "chore: replace deprecated loaders with asset modules, upgrade major deps"
```

---

## Commit 3 — Polish

### Task 6: Polish fixes

**Files:**
- Modify: `package.json`, `src/index.html`, `README.md`

- [ ] **Step 1: Fix typo in `package.json`**

In the `manifest.webapp.developer` block, change:
```json
"company": "HISP Centre - Univeristy of Oslo"
```
To:
```json
"company": "HISP Centre - University of Oslo"
```

- [ ] **Step 2: Add `<title>` to `src/index.html`**

Add `<title>DHIS2 Tool</title>` inside `<head>`:
```html
<head>
    <meta charset="utf-8" name="viewport" content="width=device-width, initial-scale=1">
    <title>DHIS2 Tool</title>
</head>
```

- [ ] **Step 3: Update README copyright year**

In `README.md`, change:
```
© Copyright University of Oslo 2024
```
To:
```
© Copyright University of Oslo 2026
```

- [ ] **Step 4: Verify lint passes**

```bash
yarn run lint
```
Expected: no errors.

- [ ] **Step 5: Commit polish**

```bash
git add package.json src/index.html README.md
git commit -m "chore: fix typo, add page title, update copyright year"
```
