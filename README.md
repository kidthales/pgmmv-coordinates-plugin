# PGMMV Coordinates Plugin

[![CI](https://github.com/kidthales/pgmmv-coordinates-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/kidthales/pgmmv-coordinates-plugin/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/kidthales/pgmmv-coordinates-plugin.svg)](https://github.com/kidthales/pgmmv-coordinates-plugin/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![ES5 / PGMMV 1.0.6+](https://img.shields.io/badge/ES5-PGMMV%201.0.6%2B-brightgreen.svg)](https://rpgmakerofficial.com/product/act/en/manual/01_01.html)

Utilities for working with [Pixel Game Maker MV (PGMMV)](https://rpgmakerofficial.com/product/act/en/manual/01_01.html) 2D object coordinates, providing camera/world coordinate conversion Action Commands, tile and rectangle Link Conditions, and a `window.kt.coordinates` runtime script API.

## Installation (PGMMV Editor)

1. Download the latest `pgmmv-coordinates-plugin-v<version>.js` asset (and optionally verify it against `SHA256SUMS.txt`) from [GitHub Releases](https://github.com/kidthales/pgmmv-coordinates-plugin/releases).
    - Alternatively, build the stripped release bundle locally from source with `npm run build` (outputs `dist/pgmmv-coordinates-plugin-v0.2.0.js`).
2. In PGMMV, open **Plugins** -> **Add** and select the downloaded `.js` file.
3. Enable the plugin in your project's plugin list.

> Compatible with **PGMMV 1.0.6+** (SpiderMonkey 33 / ECMAScript 5.1).

## Action Commands

Both Action Commands appear under an object state's **Action Command** menu in PGMMV and convert `(X, Y)` coordinate pairs between camera space and world space using the current scene's clamped camera viewport rectangle on layer `0` (accounting for camera scale and layer bounds).

If either variable source resolves to unset (`-1` or an unset `ParentObject`), any variable ID is `< 1`, or any referenced variable is missing, the command logs a warning via `Agtk.log` and leaves the output variables unchanged.

### `Camera to World [PGMMV Coordinates Plugin]`

Converts camera-space coordinate variables to world-space coordinates (`worldX = cameraRect.x + inputX`, `worldY = cameraRect.y + inputY`).

| Parameter                | Type                     | Default      | Description                                                                                                      |
| :----------------------- | :----------------------- | :----------- | :--------------------------------------------------------------------------------------------------------------- |
| `Input Variable Source`  | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the input camera-space coordinates.   |
| `Input X`                | `VariableId`             | `-1` (Unset) | Variable holding the camera-space X coordinate.                                                                  |
| `Input Y`                | `VariableId`             | `-1` (Unset) | Variable holding the camera-space Y coordinate.                                                                  |
| `Output Variable Source` | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) receiving the output world-space coordinates. |
| `Output X`               | `VariableId`             | `-1` (Unset) | Variable where the converted world-space X coordinate is written.                                                |
| `Output Y`               | `VariableId`             | `-1` (Unset) | Variable where the converted world-space Y coordinate is written.                                                |

### `World to Camera [PGMMV Coordinates Plugin]`

Converts world-space coordinate variables to camera-space coordinates (`cameraX = inputX - cameraRect.x`, `cameraY = inputY - cameraRect.y`).

| Parameter                | Type                     | Default      | Description                                                                                                       |
| :----------------------- | :----------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------- |
| `Input Variable Source`  | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the input world-space coordinates.     |
| `Input X`                | `VariableId`             | `-1` (Unset) | Variable holding the world-space X coordinate.                                                                    |
| `Input Y`                | `VariableId`             | `-1` (Unset) | Variable holding the world-space Y coordinate.                                                                    |
| `Output Variable Source` | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) receiving the output camera-space coordinates. |
| `Output X`               | `VariableId`             | `-1` (Unset) | Variable where the converted camera-space X coordinate is written.                                                |
| `Output Y`               | `VariableId`             | `-1` (Unset) | Variable where the converted camera-space Y coordinate is written.                                                |

## Link Conditions

All five Link Conditions appear under the object transition **Link Condition** menu in PGMMV:

### `In Rectangle [PGMMV Coordinates Plugin]`

Tests whether the object instance's `(X, Y)` position is within a rectangle (`cc.rectContainsPoint`). Rectangle `X` and `Y` coordinates correspond to the top-left corner.

| Parameter              | Type                     | Default      | Description                                                                                         |
| :--------------------- | :----------------------- | :----------- | :-------------------------------------------------------------------------------------------------- |
| `Rect Variable Source` | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the rectangle variables. |
| `X`                    | `VariableId`             | `-1` (Unset) | Variable specifying the rectangle's top-left X coordinate.                                          |
| `Y`                    | `VariableId`             | `-1` (Unset) | Variable specifying the rectangle's top-left Y coordinate.                                          |
| `Width`                | `VariableId`             | `-1` (Unset) | Variable specifying the rectangle width.                                                            |
| `Height`               | `VariableId`             | `-1` (Unset) | Variable specifying the rectangle height.                                                           |

If `Rect Variable Source` resolves to unset, any variable ID is `< 1`, or any variable is missing, a warning is logged and the condition returns `false`.

### `On Tile Edge [PGMMV Coordinates Plugin]`

Tests whether the object instance's `(X, Y)` position lies on a tile boundary (`x % tileWidth === 0` and/or `y % tileHeight === 0`).

| Parameter | Type       | Default               | Description                                                                  |
| :-------- | :--------- | :-------------------- | :--------------------------------------------------------------------------- |
| `Axis`    | `CustomId` | `-1` (Unset / `Both`) | Tile edge axis to test: `0` (`X`), `1` (`Y`), or `2` (`Both`, also default). |

### `In Tile [PGMMV Coordinates Plugin]`

Tests the object instance's `(X, Y)` position against normalized `[0, 1]` tile origin coordinates within its current tile (`Math.floor(pos / tileSize) * tileSize + origin * tileSize`).

Tile origin values are clamped with `cc.clampf(value, 0, 1)`: `(0, 0)` is top-left, `(1, 1)` is bottom-right, and `(0.5, 0.5)` is center (default). Leaving `Variable Source` unset (`-1`), resolving an unset `ParentObject`, or specifying an origin variable ID `< 1` (or missing) defaults that axis's origin to `0.5`.

| Parameter         | Type                     | Default            | Description                                                                                        |
| :---------------- | :----------------------- | :----------------- | :------------------------------------------------------------------------------------------------- |
| `Variable Source` | `SwitchVariableObjectId` | `-1` (Unset)       | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the origin variables.   |
| `Comparison X`    | `CustomId`               | `-1` (Unset / `=`) | Comparator for `X`: `0` (`<`), `1` (`<=`), `2` (`=`), `3` (`>=`), `4` (`>`), or `5` (`!=`).        |
| `Origin X`        | `VariableId`             | `-1` (Unset)       | Variable whose value specifies the normalized `[0, 1]` horizontal tile origin (defaults to `0.5`). |
| `Comparison Y`    | `CustomId`               | `-1` (Unset / `=`) | Comparator for `Y`: `0` (`<`), `1` (`<=`), `2` (`=`), `3` (`>=`), `4` (`>`), or `5` (`!=`).        |
| `Origin Y`        | `VariableId`             | `-1` (Unset)       | Variable whose value specifies the normalized `[0, 1]` vertical tile origin (defaults to `0.5`).   |

#### `'In Tile'` Comparison Quick Reference

| Location     | X-Axis Cmp | X-Axis Val | Y-Axis Cmp | Y-Axis Val |
| :----------- | :--------- | :--------- | :--------- | :--------- |
| Top Left     | `<`        | `0.5`      | `<`        | `0.5`      |
| Top          | `n/a`      | `n/a`      | `<`        | `0.5`      |
| Top Right    | `>`        | `0.5`      | `<`        | `0.5`      |
| Right        | `>`        | `0.5`      | `n/a`      | `n/a`      |
| Bottom Right | `>`        | `0.5`      | `>`        | `0.5`      |
| Bottom       | `n/a`      | `n/a`      | `>`        | `0.5`      |
| Bottom Left  | `<`        | `0.5`      | `>`        | `0.5`      |
| Left         | `<`        | `0.5`      | `n/a`      | `n/a`      |

> Entries marked `n/a` only constrain one axis; use [`In Tile (Horizontal)`](#in-tile-horizontal-pgmmv-coordinates-plugin) or [`In Tile (Vertical)`](#in-tile-vertical-pgmmv-coordinates-plugin) for single-axis checks.

### `In Tile (Horizontal) [PGMMV Coordinates Plugin]`

Tests only the `X` coordinate of the object instance within its current tile. Tile origin `0` is left, `1` is right, and `0.5` is center (default).

| Parameter         | Type                     | Default            | Description                                                                                         |
| :---------------- | :----------------------- | :----------------- | :-------------------------------------------------------------------------------------------------- |
| `Variable Source` | `SwitchVariableObjectId` | `-1` (Unset)       | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the `Origin X` variable. |
| `Comparison X`    | `CustomId`               | `-1` (Unset / `=`) | Comparator for `X`: `0` (`<`), `1` (`<=`), `2` (`=`), `3` (`>=`), `4` (`>`), or `5` (`!=`).         |
| `Origin X`        | `VariableId`             | `-1` (Unset)       | Variable whose value specifies the normalized `[0, 1]` horizontal tile origin (defaults to `0.5`).  |

### `In Tile (Vertical) [PGMMV Coordinates Plugin]`

Tests only the `Y` coordinate of the object instance within its current tile. Tile origin `0` is top, `1` is bottom, and `0.5` is center (default).

| Parameter         | Type                     | Default            | Description                                                                                         |
| :---------------- | :----------------------- | :----------------- | :-------------------------------------------------------------------------------------------------- |
| `Variable Source` | `SwitchVariableObjectId` | `-1` (Unset)       | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the `Origin Y` variable. |
| `Comparison Y`    | `CustomId`               | `-1` (Unset / `=`) | Comparator for `Y`: `0` (`<`), `1` (`<=`), `2` (`=`), `3` (`>=`), `4` (`>`), or `5` (`!=`).         |
| `Origin Y`        | `VariableId`             | `-1` (Unset)       | Variable whose value specifies the normalized `[0, 1]` vertical tile origin (defaults to `0.5`).    |

## Script API (`window.kt.coordinates`)

Outside the PGMMV editor, `initialize()` registers the coordinate helper functions on `window.kt.coordinates`:

- `window.kt.coordinates.cameraToWorld(inputVariableObjectId, inputXVariableId, inputYVariableId, outputVariableObjectId, outputXVariableId, outputYVariableId, instanceId)` -> `CommandBehaviorNext`
- `window.kt.coordinates.worldToCamera(inputVariableObjectId, inputXVariableId, inputYVariableId, outputVariableObjectId, outputXVariableId, outputYVariableId, instanceId)` -> `CommandBehaviorNext`
- `window.kt.coordinates.inRect(variableObjectId, xVariableId, yVariableId, widthVariableId, heightVariableId, instanceId)` -> `boolean`
- `window.kt.coordinates.onTileEdge(axisCustomId, instanceId)` -> `boolean`
- `window.kt.coordinates.inTile(variableObjectId, comparisonXCustomId, originXVariableId, comparisonYCustomId, originYVariableId, instanceId)` -> `boolean`
- `window.kt.coordinates.inTileHorizontal(variableObjectId, comparisonXCustomId, originXVariableId, instanceId)` -> `boolean`
- `window.kt.coordinates.inTileVertical(variableObjectId, comparisonYCustomId, originYVariableId, instanceId)` -> `boolean`

Parameters:

- `variableObjectId` / `inputVariableObjectId` / `outputVariableObjectId`: `Agtk.constants.switchVariableObjects.ProjectCommon` (`0`), `SelfObject` (`-2`), `ParentObject` (`-7`), or `Agtk.constants.actionCommands.UnsetObject` (`-1`).
- `axisCustomId`: `0` (`X`), `1` (`Y`), or `2` (`Both`; any other value defaults to `Both`).
- `comparisonXCustomId` / `comparisonYCustomId`: `0` (`<`), `1` (`<=`), `2` (`=`), `3` (`>=`), `4` (`>`), or `5` (`!=`; any other value defaults to `=`).
- `originXVariableId` / `originYVariableId`: Variable ID holding the normalized `[0, 1]` tile origin (`< 1`, missing variables, or an unset `variableObjectId` fall back to `0.5`).
- `instanceId`: Target object instance ID.

Example (ES5 inside a PGMMV **Execute Script** action or condition):

```js
// Convert SelfObject camera coordinates (vars 2001, 2002) to ProjectCommon world coordinates (vars 1001, 1002).
window.kt.coordinates.cameraToWorld(
    Agtk.constants.switchVariableObjects.SelfObject,
    2001,
    2002,
    Agtk.constants.switchVariableObjects.ProjectCommon,
    1001,
    1002,
    instanceId
);

// Check if object is in the top half (Y < tile center 0.5) and aligned to a vertical tile edge on X.
var inTopHalf = window.kt.coordinates.inTileVertical(Agtk.constants.actionCommands.UnsetObject, 0, -1, instanceId);
var onVerticalEdge = window.kt.coordinates.onTileEdge(0, instanceId);
```

## Development

### Requirements

- Any current [Node.js](https://nodejs.org/en/download) LTS (Long-Term Support) version.
- A [Git](https://git-scm.com/) client.

### Setup

```bash
git clone https://github.com/kidthales/pgmmv-coordinates-plugin.git
cd pgmmv-coordinates-plugin
npm install
```

### SpiderMonkey 33 & ES5 Constraints

PGMMV embeds **SpiderMonkey 33**, which executes plugins in an [ECMAScript 5.1](https://262.ecma-international.org/5.1/) script environment. `eslint.config.js` enforces `ecmaVersion: 5` and `sourceType: 'script'` on `plugin.js` with `Agtk`, `cc`, and `jsb` declared as read-only globals, while `tsconfig.json` runs strict JSDoc type-checking against `@kidthales/pgmmv-types` without emitting ES6+ syntax.

### Scripts Reference

| Script             | Command                                                | Purpose                                                                                                                                                                                                                                                    |
| :----------------- | :----------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`     | `eslint --cache .`, `prettier --check`, `tsc --noEmit` | Verify ES5 compliance (`plugin.js`), ESM syntax (`scripts/**/*.mjs`, `tests/**/*.mjs`), Markdown/JSON/YAML formatting, and strict JSDoc types.                                                                                                             |
| `npm run lint-fix` | `eslint --cache --fix .`, `prettier --write`           | Auto-fix ESLint and Prettier formatting issues across source and documentation files.                                                                                                                                                                      |
| `npm test`         | `node --test`                                          | Run `tests/plugin.test.mjs` covering `plugin.js` hooks, editor-mode guards, both Action Commands, all 5 Link Conditions, `window.kt.coordinates`, `scripts/build.mjs` path-containment and comment-stripping invariants, and negative ESLint/`tsc` checks. |
| `npm run build`    | `node scripts/build.mjs`                               | Strip non-banner comments from `plugin.js`, format with Prettier, and emit `dist/pgmmv-coordinates-plugin-v<version>.js` (accepts an optional output path strictly inside `dist/`).                                                                        |

## References & License

- [Changelog](./CHANGELOG.md)
- [MIT License](./LICENSE)
- [@kidthales/pgmmv-types](https://github.com/kidthales/pgmmv-types)
- [PGMMV Plug-in Specifications](https://rpgmakerofficial.com/product/act/en/manual/Plug-in_Spec_en.pdf)
