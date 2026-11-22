# Changelog

All notable changes to `@kidthales/pgmmv-coordinates-plugin` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-21

Modernizes `@kidthales/pgmmv-coordinates-plugin` for PGMMV's SpiderMonkey 33 (ES5.1) runtime with strict `@kidthales/pgmmv-types` JSDoc checking, a canonical `scripts/build.mjs` release bundler, a `node:test` verification suite, CI/publish workflow parity, and self-contained documentation.

### Added

- **Canonical release bundler (`scripts/build.mjs`, `npm run build`) (`#73`, `#76`, `#77`)**: Added `buildPlugin`, `stripComments`, `assertSafeOutputPath`, and `resolveRealPath` to emit Prettier-formatted `dist/pgmmv-coordinates-plugin-v<version>.js` bundles while preserving `/**!` / `/*!` license banners, enforcing `fs.realpathSync` self-overwrite and `dist/` containment guards, preserving ES5.1 §7.3 `LineTerminator` boundaries, and rescanning template literal braces.
- **Automated `node:test` suite (`tests/plugin.test.mjs`, `npm test`) (`#77`)**: Added 23 tests covering `plugin.js` metadata/hooks, editor-mode guards, `window.kt.coordinates` runtime registration, both Action Commands (`Camera to World`, `World to Camera`), all 5 Link Conditions (`In Rectangle`, `On Tile Edge`, `In Tile`, `In Tile (Horizontal)`, `In Tile (Vertical)`), `scripts/build.mjs` symlink/containment/scanner edge cases, ESLint ES5 enforcement, and `tsc --noEmit` negative type checks.
- **Self-contained documentation (`README.md`, `CHANGELOG.md`) (`#77`)**: Removed the nonexistent `kidthales.com/pgmmv/coordinates-plugin/` link and documented standardized badges, GitHub Releases `.js` installation, both Action Commands, all 5 Link Conditions, the `'In Tile'` comparison matrix, the `window.kt.coordinates` script API, npm scripts, and this Keep-a-Changelog history.

### Changed

- **Strict `@kidthales/pgmmv-types` JSDoc typing (`tsconfig.json`, `env.d.ts`, `plugin.js`) (`#73`, `#76`, `#77`, `#78`)**: Upgraded to `@kidthales/pgmmv-types@^0.2.1`, declared `Window.kt` in `env.d.ts`, enabled `allowJs`/`checkJs`/`strict`/`noEmit`, and standardized `plugin.js` JSDoc annotations with `@version 0.2.0`.
- **Toolchain, CI, release workflow, ignore & Dependabot parity (`package.json`, `eslint.config.js`, `.prettierignore`, `.gitignore`, `.github/workflows/{ci,publish}.yml`, `.github/dependabot.yml`, `.github/CODEOWNERS`) (`#73`, `#76`, `#77`)**: Updated `devDependencies` (ESLint 9, Prettier 3, TypeScript 7, `concurrently` 10), ignored `.ci-local` and `**/.tmp-*/**`, wired `npm test` and `npm run build` into CI with least-privilege `contents: read` permissions, hardened `publish.yml` (`cancel-in-progress: false`, tag/package/plugin version parity checks, `npm run lint && npm test`, stripped `.js` + `SHA256SUMS.txt` asset uploads), and configured quarterly non-major Dependabot updates.

## [0.1.2] - 2026-04-03

### Changed

- **Link Condition rename (`plugin.js`) (`#18`)**: Renamed Link Condition `'Is Tile Multiple [PGMMV Coordinates Plugin]'` to `'On Tile Edge [PGMMV Coordinates Plugin]'` and updated `window.kt.coordinates.onTileEdge`.
- **Documentation (`README.md`) (`#17`)**: Updated plugin documentation links.

## [0.1.1] - 2026-03-15

### Added

- **Tile Link Conditions (`plugin.js`) (`#10`, `#11`)**: Added `'Is Tile Multiple'` (later renamed to `'On Tile Edge'`), `'In Tile [PGMMV Coordinates Plugin]'`, `'In Tile (Horizontal) [PGMMV Coordinates Plugin]'`, and `'In Tile (Vertical) [PGMMV Coordinates Plugin]'` Link Conditions and corresponding `window.kt.coordinates` runtime helpers.

## [0.1.0] - 2026-03-03

Initial release of `@kidthales/pgmmv-coordinates-plugin`.

### Added

- **`Camera to World [PGMMV Coordinates Plugin]` and `World to Camera [PGMMV Coordinates Plugin]` Action Commands (`#4`)**: Converts `(X, Y)` coordinate variables between camera space and world space using the current scene's clamped camera viewport rectangle.
- **`In Rectangle [PGMMV Coordinates Plugin]` Link Condition (`#5`)**: Tests whether an object instance's `(X, Y)` position is within a rectangle specified by top-left `X`/`Y`, `Width`, and `Height` variables.
- **`window.kt.coordinates` script API**: Exposes coordinate helpers for PGMMV Execute Script calls.
