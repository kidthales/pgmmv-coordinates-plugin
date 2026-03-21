# PGMMV Coordinates Plugin

[![CI](https://github.com/kidthales/pgmmv-coordinates-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/kidthales/pgmmv-coordinates-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Utilities for working with 2D coordinates in [PGMMV](https://rpgmakerofficial.com/product/act/en/manual/01_01.html).

| Action Command  | Description                                         |
| --------------- | --------------------------------------------------- |
| Camera to World | Convert variables from camera to world coordinates. |
| World to Camera | Convert variables from world to camera coordinates. |

| Link Condition       | Description                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In Rectangle         | Test if object instance position is within rectangle. Rectangle x & y coordinates correspond to top left.                                                      |
| Is Tile Multiple     | Test if object instance position is located at a multiple of the tile width or height (default is both).                                                       |
| In Tile              | Test object position in current tile. Tile origin (0,0) is top left, (1,1) is bottom right, and (0.5, 0.5) is center (default). The default comparator is `=`. |
| In Tile (Horizontal) | Test object position horizontally in current tile. Tile origin 0 is left, 1 is right, and 0.5 is center (default). The default comparator is `=`.              |
| In Tile (Vertical)   | Test object position vertically in current tile. Tile origin 0 is top, 1 is bottom, and 0.5 is center (default). The default comparator is `=`.                |
