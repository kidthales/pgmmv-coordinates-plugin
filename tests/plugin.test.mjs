import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { assertSafeOutputPath, buildPlugin, resolveRealPath, stripComments } from '../scripts/build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const pluginPath = path.join(ROOT, 'plugin.js');
const pluginSource = fs.readFileSync(pluginPath, 'utf8');
const buildScript = path.join(ROOT, 'scripts', 'build.mjs');
const eslintBin = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const AGTK_CONSTANTS = {
  switchVariableObjects: {
    ProjectCommon: 0,
    SelfObject: -2,
    ParentObject: -7
  },
  actionCommands: {
    UnsetObject: -1,
    commandBehavior: {
      CommandBehaviorNext: 0
    }
  },
  objects: {
    variables: {
      XId: 1,
      YId: 2,
      ParentObjectInstanceIDId: 14
    }
  }
};

function loadPlugin(context = {}) {
  return vm.runInNewContext(pluginSource, context, { filename: 'plugin.js' });
}

function createMockRuntime({
  tileWidth = 16,
  tileHeight = 16,
  screenWidth = 320,
  screenHeight = 180,
  layerWidth = 640,
  layerHeight = 360,
  cameraTargetPos = { x: 160, y: 90 },
  cameraDisplayScale = { x: 1, y: 1 },
  projectVariables = {},
  instances = {}
} = {}) {
  const logs = [];

  function makeVariableStore(vars = {}) {
    return {
      get(id) {
        if (!(id in vars) || vars[id] === null || vars[id] === undefined) {
          return null;
        }
        return {
          getValue() {
            return vars[id];
          },
          setValue(value) {
            vars[id] = value;
          }
        };
      }
    };
  }

  const Agtk = {
    constants: AGTK_CONSTANTS,
    settings: {
      tileWidth,
      tileHeight,
      screenWidth,
      screenHeight
    },
    log(message) {
      logs.push(message);
    },
    variables: makeVariableStore(projectVariables),
    objectInstances: {
      get(instanceId) {
        const spec = instances[instanceId];
        if (!spec) {
          throw new Error(`Unexpected object instance lookup: ${instanceId}`);
        }
        return {
          variables: makeVariableStore(spec.variables)
        };
      }
    },
    sceneInstances: {
      getCurrent() {
        return {
          getLayerByIndex(index) {
            assert.equal(index, 0);
            return {
              width: layerWidth,
              height: layerHeight
            };
          },
          getCurrentCameraTargetPos() {
            return { ...cameraTargetPos };
          },
          getCurrentCameraDisplayScale() {
            return { ...cameraDisplayScale };
          }
        };
      }
    }
  };

  const cc = {
    p(x, y) {
      return { x, y };
    },
    rect(x, y, width, height) {
      return { x, y, width, height };
    },
    rectContainsPoint(rect, point) {
      return (
        point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
      );
    },
    clampf(value, minLimit, maxLimit) {
      return Math.min(Math.max(value, minLimit), maxLimit);
    }
  };

  return { Agtk, cc, logs };
}

test('plugin.js evaluates to an object exposing all PGMMV plugin hooks', () => {
  const plugin = loadPlugin({});
  assert.equal(typeof plugin, 'object');
  assert.notEqual(plugin, null);

  for (const method of [
    'setLocale',
    'getInfo',
    'initialize',
    'finalize',
    'setParamValue',
    'setInternal',
    'call',
    'execActionCommand',
    'execLinkCondition'
  ]) {
    assert.equal(typeof plugin[method], 'function', `Expected ${method} to be a function`);
  }
});

test('getInfo returns expected metadata, actionCommand, and linkCondition schemas for all categories', () => {
  const plugin = loadPlugin({});

  assert.equal(plugin.getInfo('name'), 'PGMMV Coordinates Plugin');
  assert.equal(plugin.getInfo('description'), 'Utilities for working with object coordinates.');
  assert.equal(plugin.getInfo('author'), 'Tristan Bonsor <kidthales@agogpixel.com>');
  assert.equal(
    plugin.getInfo('help'),
    'This plugin provides utilities for working with 2D coordinates. Convert x and y\n' +
      'values to/from camera space and world space; test an object for positioning\n' +
      'within a tile or rectangle.\n' +
      '\n' +
      "'In Tile' link condition quick reference:\n" +
      '|--------------|------------|------------|------------|------------|\n' +
      '|   Location   | X-Axis Cmp | X-Axis Val | Y-Axis Cmp | Y-Axis Val |\n' +
      '|--------------|------------|------------|------------|------------|\n' +
      '| Top Left     |     <      |    0.5     |     <      |    0.5     |\n' +
      '| Top          |    n/a     |    n/a     |     <      |    0.5     |\n' +
      '| Top Right    |     >      |    0.5     |     <      |    0.5     |\n' +
      '| Right        |     >      |    0.5     |    n/a     |    n/a     |\n' +
      '| Bottom Right |     >      |    0.5     |     >      |    0.5     |\n' +
      '| Bottom       |    n/a     |    n/a     |     >      |    0.5     |\n' +
      '| Bottom Left  |     <      |    0.5     |     >      |    0.5     |\n' +
      '| Left         |     <      |    0.5     |    n/a     |    n/a     |\n'
  );
  assert.deepEqual(JSON.parse(JSON.stringify(plugin.getInfo('parameter'))), []);
  assert.equal(plugin.getInfo('internal'), null);
  assert.equal(plugin.getInfo('invalid'), undefined);
  assert.equal(plugin.getInfo(''), undefined);

  const actionCommands = JSON.parse(JSON.stringify(plugin.getInfo('actionCommand')));
  assert.deepEqual(actionCommands, [
    {
      id: 0,
      name: 'Camera to World [PGMMV Coordinates Plugin]',
      description: 'Convert variables from camera to world coordinates.',
      parameter: [
        {
          id: 100,
          name: 'Input Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Input X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Input Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 101,
          name: 'Output Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 2,
          name: 'Output X',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 3,
          name: 'Output Y',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    {
      id: 1,
      name: 'World to Camera [PGMMV Coordinates Plugin]',
      description: 'Convert variables from world to camera coordinates.',
      parameter: [
        {
          id: 100,
          name: 'Input Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Input X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Input Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 101,
          name: 'Output Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 2,
          name: 'Output X',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 3,
          name: 'Output Y',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    }
  ]);

  const linkConditions = JSON.parse(JSON.stringify(plugin.getInfo('linkCondition')));
  assert.deepEqual(linkConditions, [
    {
      id: 0,
      name: 'In Rectangle [PGMMV Coordinates Plugin]',
      description:
        'Test if object instance position is within rectangle. Rectangle x & y coordinates correspond to top left.',
      parameter: [
        {
          id: 100,
          name: 'Rect Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 2,
          name: 'Width',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 3,
          name: 'Height',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    {
      id: 1,
      name: 'On Tile Edge [PGMMV Coordinates Plugin]',
      description:
        'Test if object instance position is located at a tile edge, along the x or y axis (default is both).',
      parameter: [
        {
          id: 0,
          name: 'Axis',
          type: 'CustomId',
          customParam: [
            { id: 0, name: 'X' },
            { id: 1, name: 'Y' },
            { id: 2, name: 'Both' }
          ],
          defaultValue: -1
        }
      ]
    },
    {
      id: 2,
      name: 'In Tile [PGMMV Coordinates Plugin]',
      description:
        "Test object position in current tile. Tile origin (0,0) is top left, (1,1) is bottom right, and (0.5, 0.5) is center (default). The default comparator is '='.",
      parameter: [
        {
          id: 100,
          name: 'Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 10,
          name: 'Comparison X',
          type: 'CustomId',
          customParam: [
            { id: 0, name: '<' },
            { id: 1, name: '<=' },
            { id: 2, name: '=' },
            { id: 3, name: '>=' },
            { id: 4, name: '>' },
            { id: 5, name: '!=' }
          ],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 11,
          name: 'Comparison Y',
          type: 'CustomId',
          customParam: [
            { id: 0, name: '<' },
            { id: 1, name: '<=' },
            { id: 2, name: '=' },
            { id: 3, name: '>=' },
            { id: 4, name: '>' },
            { id: 5, name: '!=' }
          ],
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Origin Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    {
      id: 3,
      name: 'In Tile (Horizontal) [PGMMV Coordinates Plugin]',
      description:
        "Test object position horizontally in current tile. Tile origin 0 is left, 1 is right, and 0.5 is center (default). The default comparator is '='.",
      parameter: [
        {
          id: 100,
          name: 'Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 10,
          name: 'Comparison X',
          type: 'CustomId',
          customParam: [
            { id: 0, name: '<' },
            { id: 1, name: '<=' },
            { id: 2, name: '=' },
            { id: 3, name: '>=' },
            { id: 4, name: '>' },
            { id: 5, name: '!=' }
          ],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    {
      id: 4,
      name: 'In Tile (Vertical) [PGMMV Coordinates Plugin]',
      description:
        "Test object position vertically in current tile. Tile origin 0 is top, 1 is bottom, and 0.5 is center (default). The default comparator is '='.",
      parameter: [
        {
          id: 100,
          name: 'Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 10,
          name: 'Comparison Y',
          type: 'CustomId',
          customParam: [
            { id: 0, name: '<' },
            { id: 1, name: '<=' },
            { id: 2, name: '=' },
            { id: 3, name: '>=' },
            { id: 4, name: '>' },
            { id: 5, name: '!=' }
          ],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    }
  ]);
});

test('no-op hooks complete without throwing', () => {
  const plugin = loadPlugin({});

  assert.doesNotThrow(() => {
    plugin.setLocale('en');
    plugin.setParamValue([]);
    plugin.setInternal(null);
    plugin.call();
    plugin.finalize();
  });
});

test('initialize skips registering window.kt.coordinates in editor mode', () => {
  for (const agtkCandidate of [null, undefined, {}, { log: 'not-a-function' }]) {
    const windowObj = {};
    const plugin = loadPlugin({ Agtk: agtkCandidate, window: windowObj });
    assert.doesNotThrow(() => {
      plugin.initialize();
    });
    assert.equal('kt' in windowObj, false);
  }
});

test('initialize registers window.kt.coordinates outside editor and preserves existing window.kt keys', () => {
  const { Agtk, cc } = createMockRuntime();
  const freshWindow = {};
  const pluginFresh = loadPlugin({ Agtk, cc, window: freshWindow });
  pluginFresh.initialize();

  assert.equal(typeof freshWindow.kt, 'object');
  assert.equal(typeof freshWindow.kt.coordinates, 'object');
  for (const fn of [
    'cameraToWorld',
    'worldToCamera',
    'inRect',
    'onTileEdge',
    'inTile',
    'inTileHorizontal',
    'inTileVertical'
  ]) {
    assert.equal(typeof freshWindow.kt.coordinates[fn], 'function', `Expected window.kt.coordinates.${fn}`);
  }

  const existingWindow = { kt: { otherPlugin: { ready: true } } };
  const pluginExisting = loadPlugin({ Agtk, cc, window: existingWindow });
  pluginExisting.initialize();

  assert.deepEqual(existingWindow.kt.otherPlugin, { ready: true });
  assert.equal(typeof existingWindow.kt.coordinates.cameraToWorld, 'function');
});

test('Camera to World and World to Camera convert coordinates across variable sources, camera clamping, and scaling', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { commandBehavior } = AGTK_CONSTANTS.actionCommands;
  const { ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  // Center camera: screen 320x180, scale 2x2 => scaled 160x90, target (300, 200) => left=220, top=155
  const instances = {
    1: {
      variables: {
        [ParentObjectInstanceIDId]: 2,
        10: 15,
        11: 25,
        12: 0,
        13: 0
      }
    },
    2: {
      variables: {
        20: 0,
        21: 0,
        22: 260,
        23: 195
      }
    }
  };
  const projectVariables = {
    5: 0,
    6: 0,
    7: 300,
    8: 210
  };

  const { Agtk, cc, logs } = createMockRuntime({
    screenWidth: 320,
    screenHeight: 180,
    layerWidth: 640,
    layerHeight: 360,
    cameraTargetPos: { x: 300, y: 200 },
    cameraDisplayScale: { x: 2, y: 2 },
    projectVariables,
    instances
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // Camera to World: SelfObject (15, 25) -> ParentObject (220+15=235, 155+25=180)
  assert.equal(
    plugin.execActionCommand(
      0,
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: ParentObject },
        { id: 2, value: 20 },
        { id: 3, value: 21 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[2].variables[20], 235);
  assert.equal(instances[2].variables[21], 180);

  // World to Camera: ParentObject (260, 195) -> ProjectCommon (260-220=40, 195-155=40)
  assert.equal(
    plugin.execActionCommand(
      1,
      [
        { id: 100, value: ParentObject },
        { id: 0, value: 22 },
        { id: 1, value: 23 },
        { id: 101, value: ProjectCommon },
        { id: 2, value: 5 },
        { id: 3, value: 6 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(projectVariables[5], 40);
  assert.equal(projectVariables[6], 40);

  // Runtime script API parity (ProjectCommon -> SelfObject)
  assert.equal(
    windowObj.kt.coordinates.worldToCamera(ProjectCommon, 7, 8, SelfObject, 12, 13, 1),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[12], 80);
  assert.equal(instances[1].variables[13], 55);

  assert.equal(
    windowObj.kt.coordinates.cameraToWorld(SelfObject, 12, 13, ProjectCommon, 5, 6, 1),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(projectVariables[5], 300);
  assert.equal(projectVariables[6], 210);
  assert.deepEqual(logs, []);

  // Camera clamped at top-left (target (10, 10) -> left=0, top=0)
  const topLeftRuntime = createMockRuntime({
    screenWidth: 320,
    screenHeight: 180,
    layerWidth: 640,
    layerHeight: 360,
    cameraTargetPos: { x: 10, y: 10 },
    instances: { 1: { variables: { 10: 5, 11: 8, 12: 0, 13: 0 } } }
  });
  const topLeftWindow = {};
  const topLeftPlugin = loadPlugin({ Agtk: topLeftRuntime.Agtk, cc: topLeftRuntime.cc, window: topLeftWindow });
  topLeftPlugin.initialize();
  topLeftWindow.kt.coordinates.cameraToWorld(SelfObject, 10, 11, SelfObject, 12, 13, 1);
  assert.equal(topLeftRuntime.Agtk.objectInstances.get(1).variables.get(12).getValue(), 5);
  assert.equal(topLeftRuntime.Agtk.objectInstances.get(1).variables.get(13).getValue(), 8);

  // Camera clamped at bottom-right (target (635, 355) -> left=320, top=180)
  const bottomRightRuntime = createMockRuntime({
    screenWidth: 320,
    screenHeight: 180,
    layerWidth: 640,
    layerHeight: 360,
    cameraTargetPos: { x: 635, y: 355 },
    instances: { 1: { variables: { 10: 350, 11: 200, 12: 0, 13: 0 } } }
  });
  const bottomRightWindow = {};
  const bottomRightPlugin = loadPlugin({
    Agtk: bottomRightRuntime.Agtk,
    cc: bottomRightRuntime.cc,
    window: bottomRightWindow
  });
  bottomRightPlugin.initialize();
  bottomRightWindow.kt.coordinates.worldToCamera(SelfObject, 10, 11, SelfObject, 12, 13, 1);
  assert.equal(bottomRightRuntime.Agtk.objectInstances.get(1).variables.get(12).getValue(), 30);
  assert.equal(bottomRightRuntime.Agtk.objectInstances.get(1).variables.get(13).getValue(), 20);

  // Camera scaled larger than layer (screen 320x180, scale 0.5 => scaled 640x360; layer 400x200 -> left=-120, top=-80)
  const oversizedRuntime = createMockRuntime({
    screenWidth: 320,
    screenHeight: 180,
    layerWidth: 400,
    layerHeight: 200,
    cameraTargetPos: { x: 200, y: 100 },
    cameraDisplayScale: { x: 0.5, y: 0.5 },
    instances: { 1: { variables: { 10: 20, 11: 30, 12: 0, 13: 0 } } }
  });
  const oversizedWindow = {};
  const oversizedPlugin = loadPlugin({
    Agtk: oversizedRuntime.Agtk,
    cc: oversizedRuntime.cc,
    window: oversizedWindow
  });
  oversizedPlugin.initialize();
  oversizedWindow.kt.coordinates.cameraToWorld(SelfObject, 10, 11, SelfObject, 12, 13, 1);
  assert.equal(oversizedRuntime.Agtk.objectInstances.get(1).variables.get(12).getValue(), -100);
  assert.equal(oversizedRuntime.Agtk.objectInstances.get(1).variables.get(13).getValue(), -50);
});

test('execActionCommand logs warnings and returns CommandBehaviorNext for invalid action index and inputs', () => {
  const { SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { UnsetObject, commandBehavior } = AGTK_CONSTANTS.actionCommands;
  const { ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  const { Agtk, cc, logs } = createMockRuntime({
    instances: {
      1: {
        variables: {
          [ParentObjectInstanceIDId]: UnsetObject,
          10: 1,
          11: 2
        }
      }
    }
  });
  const plugin = loadPlugin({ Agtk, cc, window: {} });

  // Unknown actionCommandIndex returns CommandBehaviorNext with no warning
  assert.equal(plugin.execActionCommand(99, [], 10, 1), commandBehavior.CommandBehaviorNext);
  assert.deepEqual(logs, []);

  // Exercise all validation guard branches on both cameraToWorld (0) and worldToCamera (1)
  const expectedWarnings = [
    [[], 'unset input variable source'],
    [
      [
        { id: 100, value: ParentObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 11 }
      ],
      'unset input variable source'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 0 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 11 }
      ],
      'invalid input x variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: -1 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 11 }
      ],
      'invalid input y variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: UnsetObject },
        { id: 2, value: 10 },
        { id: 3, value: 11 }
      ],
      'unset output variable source'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 0 },
        { id: 3, value: 11 }
      ],
      'invalid output x variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 0 }
      ],
      'invalid output y variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 999 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 11 }
      ],
      'input x variable not found'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 999 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 11 }
      ],
      'input y variable not found'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 999 },
        { id: 3, value: 11 }
      ],
      'output x variable not found'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 101, value: SelfObject },
        { id: 2, value: 10 },
        { id: 3, value: 999 }
      ],
      'output y variable not found'
    ]
  ];

  for (const [actionIndex, label] of [
    [0, 'camera to world'],
    [1, 'world to camera']
  ]) {
    for (const [params, message] of expectedWarnings) {
      logs.length = 0;
      assert.equal(plugin.execActionCommand(actionIndex, params, 10, 1), commandBehavior.CommandBehaviorNext);
      assert.deepEqual(logs, [`[WARNING][PGMMV Coordinates Plugin] ${label}: ${message}`]);
    }
  }
});

test('In Rectangle tests point containment across variable sources, boundaries, and invalid input warnings', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { XId, YId, ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  const { Agtk, cc, logs } = createMockRuntime({
    projectVariables: { 5: 50, 6: 50, 7: 10, 8: 10 },
    instances: {
      1: {
        variables: {
          [XId]: 15,
          [YId]: 25,
          [ParentObjectInstanceIDId]: 2,
          10: 10,
          11: 20,
          12: 20,
          13: 30
        }
      },
      2: {
        variables: {
          [XId]: 15,
          [YId]: 50,
          20: 15,
          21: 25,
          22: 0,
          23: 0
        }
      }
    }
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // Unknown linkConditionIndex returns false
  assert.equal(plugin.execLinkCondition(99, [], 10, 1), false);

  // SelfObject rect (10, 20, 20, 30) contains (15, 25)
  assert.equal(
    plugin.execLinkCondition(
      0,
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 2, value: 12 },
        { id: 3, value: 13 }
      ],
      10,
      1
    ),
    true
  );

  // ParentObject zero-size rect at exact position (15, 25, 0, 0) contains (15, 25)
  assert.equal(
    plugin.execLinkCondition(
      0,
      [
        { id: 100, value: ParentObject },
        { id: 0, value: 20 },
        { id: 1, value: 21 },
        { id: 2, value: 22 },
        { id: 3, value: 23 }
      ],
      10,
      1
    ),
    true
  );

  // ProjectCommon rect (50, 50, 10, 10) excludes instance 1 at (15, 25)
  assert.equal(windowObj.kt.coordinates.inRect(ProjectCommon, 5, 6, 7, 8, 1), false);
  assert.deepEqual(logs, []);

  // Validation guards return false with warnings
  for (const [params, expected] of [
    [[], 'unset variable source'],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 0 },
        { id: 1, value: 11 },
        { id: 2, value: 12 },
        { id: 3, value: 13 }
      ],
      'invalid x variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 0 },
        { id: 2, value: 12 },
        { id: 3, value: 13 }
      ],
      'invalid y variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 2, value: 0 },
        { id: 3, value: 13 }
      ],
      'invalid width variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 2, value: 12 },
        { id: 3, value: 0 }
      ],
      'invalid height variable ID'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 999 },
        { id: 1, value: 11 },
        { id: 2, value: 12 },
        { id: 3, value: 13 }
      ],
      'x variable not found'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 999 },
        { id: 2, value: 12 },
        { id: 3, value: 13 }
      ],
      'y variable not found'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 2, value: 999 },
        { id: 3, value: 13 }
      ],
      'width variable not found'
    ],
    [
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 },
        { id: 2, value: 12 },
        { id: 3, value: 999 }
      ],
      'height variable not found'
    ]
  ]) {
    logs.length = 0;
    assert.equal(plugin.execLinkCondition(0, params, 10, 1), false);
    assert.deepEqual(logs, [`[WARNING][PGMMV Coordinates Plugin] in rectangle: ${expected}`]);
  }
});

test('On Tile Edge tests X, Y, Both, and default axis selection', () => {
  const { XId, YId } = AGTK_CONSTANTS.objects.variables;

  const { Agtk, cc } = createMockRuntime({
    tileWidth: 32,
    tileHeight: 16,
    instances: {
      1: { variables: { [XId]: 64, [YId]: 5 } },
      2: { variables: { [XId]: 5, [YId]: 32 } },
      3: { variables: { [XId]: -64, [YId]: 48 } }
    }
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // X edge only (instance 1: x=64 % 32 === 0, y=5 % 16 !== 0)
  assert.equal(plugin.execLinkCondition(1, [{ id: 0, value: 0 }], 10, 1), true);
  assert.equal(plugin.execLinkCondition(1, [{ id: 0, value: 1 }], 10, 1), false);
  assert.equal(plugin.execLinkCondition(1, [{ id: 0, value: 2 }], 10, 1), false);

  // Y edge only (instance 2: x=5 % 32 !== 0, y=32 % 16 === 0)
  assert.equal(plugin.execLinkCondition(1, [{ id: 0, value: 0 }], 10, 2), false);
  assert.equal(plugin.execLinkCondition(1, [{ id: 0, value: 1 }], 10, 2), true);
  assert.equal(plugin.execLinkCondition(1, [], 10, 2), false);

  // Both edges + negative coordinate + default (-1) + runtime API
  assert.equal(plugin.execLinkCondition(1, [{ id: 0, value: 2 }], 10, 3), true);
  assert.equal(plugin.execLinkCondition(1, [], 10, 3), true);
  assert.equal(windowObj.kt.coordinates.onTileEdge(0, 1), true);
  assert.equal(windowObj.kt.coordinates.onTileEdge(1, 2), true);
  assert.equal(windowObj.kt.coordinates.onTileEdge(2, 3), true);
});

test('In Tile evaluates all comparators, variable sources, clamping, and default center origin', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { XId, YId, ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  // tile 32x16: instance 1 at (40, 20) -> tile starts at (32, 16); center is (48, 24);
  // origin (0.25, 0.25) -> compare (40, 20); clamped (-1, 2) -> (0, 1) -> compare (32, 32)
  const { Agtk, cc } = createMockRuntime({
    tileWidth: 32,
    tileHeight: 16,
    projectVariables: { 5: 0.25, 6: 0.25 },
    instances: {
      1: {
        variables: {
          [XId]: 40,
          [YId]: 20,
          [ParentObjectInstanceIDId]: 2,
          10: 0.25,
          11: 0.25
        }
      },
      2: {
        variables: {
          [XId]: 48,
          [YId]: 24,
          20: -1,
          21: 2
        }
      }
    }
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // Exact match (40 === 40, 20 === 20) for =, <=, >=, and false for <, >, !=
  for (const [cmpX, cmpY, expected] of [
    [2, 2, true],
    [1, 3, true],
    [3, 1, true],
    [0, 2, false],
    [4, 2, false],
    [5, 2, false],
    [2, 0, false],
    [2, 4, false],
    [2, 5, false]
  ]) {
    assert.equal(
      plugin.execLinkCondition(
        2,
        [
          { id: 100, value: SelfObject },
          { id: 10, value: cmpX },
          { id: 0, value: 10 },
          { id: 11, value: cmpY },
          { id: 1, value: 11 }
        ],
        10,
        1
      ),
      expected
    );
  }

  // Strict inequality (< on X, > on Y) with ParentObject clamped origin (0, 1) -> compare (32, 32), pos (40, 20)
  assert.equal(
    plugin.execLinkCondition(
      2,
      [
        { id: 100, value: ParentObject },
        { id: 10, value: 4 }, // > 32
        { id: 0, value: 20 },
        { id: 11, value: 0 }, // < 32
        { id: 1, value: 21 }
      ],
      10,
      1
    ),
    true
  );
  assert.equal(
    plugin.execLinkCondition(
      2,
      [
        { id: 100, value: ParentObject },
        { id: 10, value: 5 }, // != 32
        { id: 0, value: 20 },
        { id: 11, value: 5 }, // != 32
        { id: 1, value: 21 }
      ],
      10,
      1
    ),
    true
  );

  // Default origin (0.5, 0.5) and default comparator (=) on instance 2 at (48, 24)
  assert.equal(plugin.execLinkCondition(2, [], 10, 2), true);
  assert.equal(windowObj.kt.coordinates.inTile(ProjectCommon, 2, 5, 2, 6, 1), true);
  assert.equal(windowObj.kt.coordinates.inTile(SelfObject, 0, 999, 0, 999, 1), true);
});

test('In Tile (Horizontal) and In Tile (Vertical) evaluate single-axis comparators, clamping, and defaults', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { XId, YId, ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  // tile 32x16: instance 1 at (-24, 24) -> tileX = -32 (center -16), tileY = 16 (center 24)
  const { Agtk, cc } = createMockRuntime({
    tileWidth: 32,
    tileHeight: 16,
    projectVariables: { 5: 0.25 },
    instances: {
      1: {
        variables: {
          [XId]: -24,
          [YId]: 24,
          [ParentObjectInstanceIDId]: 2,
          10: 0.25,
          11: 0.5
        }
      },
      2: {
        variables: {
          [XId]: 16,
          [YId]: 8,
          20: 2
        }
      }
    }
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // Horizontal: SelfObject origin 0.25 -> -32 + 8 = -24
  for (const [cmp, expected] of [
    [0, false],
    [1, true],
    [2, true],
    [3, true],
    [4, false],
    [5, false]
  ]) {
    assert.equal(
      plugin.execLinkCondition(
        3,
        [
          { id: 100, value: SelfObject },
          { id: 10, value: cmp },
          { id: 0, value: 10 }
        ],
        10,
        1
      ),
      expected
    );
  }
  // Horizontal ParentObject clamped to 1 -> -32 + 32 = 0, -24 < 0
  assert.equal(
    plugin.execLinkCondition(
      3,
      [
        { id: 100, value: ParentObject },
        { id: 10, value: 0 },
        { id: 0, value: 20 }
      ],
      10,
      1
    ),
    true
  );
  // Horizontal defaults & ProjectCommon runtime hook
  assert.equal(plugin.execLinkCondition(3, [], 10, 2), true);
  assert.equal(windowObj.kt.coordinates.inTileHorizontal(ProjectCommon, 2, 5, 1), true);
  assert.equal(windowObj.kt.coordinates.inTileHorizontal(SelfObject, 5, 999, 1), true);

  // Vertical: SelfObject origin 0.5 -> 16 + 8 = 24
  for (const [cmp, expected] of [
    [0, false],
    [1, true],
    [2, true],
    [3, true],
    [4, false],
    [5, false]
  ]) {
    assert.equal(
      plugin.execLinkCondition(
        4,
        [
          { id: 100, value: SelfObject },
          { id: 10, value: cmp },
          { id: 0, value: 11 }
        ],
        10,
        1
      ),
      expected
    );
  }
  // Vertical ParentObject clamped to 1 -> 16 + 16 = 32, 24 != 32
  assert.equal(
    plugin.execLinkCondition(
      4,
      [
        { id: 100, value: ParentObject },
        { id: 10, value: 5 },
        { id: 0, value: 20 }
      ],
      10,
      1
    ),
    true
  );
  // Vertical defaults & ProjectCommon runtime hook (0.25 -> 16 + 4 = 20, 24 > 20)
  assert.equal(plugin.execLinkCondition(4, [], 10, 2), true);
  assert.equal(windowObj.kt.coordinates.inTileVertical(ProjectCommon, 4, 5, 1), true);
});

test('scripts/build.mjs builds plugin.js preserving /**! banner and stripping JSDoc/line comments', () => {
  const distDir = path.join(ROOT, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const distTmpDir = fs.mkdtempSync(path.join(distDir, '.tmp-build-out-'));
  try {
    const outFile = path.join(distTmpDir, 'bundle.js');
    const result = spawnSync(process.execPath, [buildScript, outFile], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const built = fs.readFileSync(outFile, 'utf8');
    assert.match(built, /^\/\*\*![\s\S]*@version 0\.2\.0[\s\S]*\*\//);
    assert.doesNotMatch(built, /\/\/\/ <reference/);
    assert.doesNotMatch(built, /noinspection/);
    assert.doesNotMatch(built, /@param/);

    const { Agtk, cc } = createMockRuntime({
      instances: { 1: { variables: { 1: 32, 2: 16 } } }
    });
    const windowObj = {};
    const plugin = vm.runInNewContext(built, { Agtk, cc, window: windowObj }, { filename: 'bundle.js' });
    plugin.initialize();
    assert.equal(plugin.getInfo('name'), 'PGMMV Coordinates Plugin');
    assert.equal(plugin.execLinkCondition(1, [], 1, 1), true);
    assert.equal(typeof windowObj.kt.coordinates.cameraToWorld, 'function');
  } finally {
    fs.rmSync(distTmpDir, { recursive: true, force: true });
  }
});

test('buildPlugin emits default unscoped dist filename from package.json metadata', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-fixture-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/sample-plugin', version: '1.2.3' }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tempRoot, 'plugin.js'),
      '/**!\n * @license MIT\n */\n// strip me\n(function () { return {}; })();\n',
      'utf8'
    );

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    assert.equal(path.basename(outPath), 'sample-plugin-v1.2.3.js');
    assert.equal(path.dirname(outPath), path.join(tempRoot, 'dist'));

    const built = fs.readFileSync(outPath, 'utf8');
    assert.match(built, /@license MIT/);
    assert.doesNotMatch(built, /strip me/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('scripts/build.mjs enforces self-overwrite and dist/ containment guards including symlinks', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-guards-'));
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-outside-'));
  try {
    const inputPath = path.join(tempRoot, 'plugin.js');
    const distDir = path.join(tempRoot, 'dist');
    fs.writeFileSync(inputPath, 'var x = 1;\n', 'utf8');
    fs.mkdirSync(distDir, { recursive: true });

    for (const target of [inputPath, path.join(distDir, '..', 'plugin.js')]) {
      assert.throws(
        () => assertSafeOutputPath({ rootDir: tempRoot, inputPath, distDir, outputPath: target }),
        /Refusing to overwrite input file/
      );
    }

    for (const target of [
      distDir,
      path.join(distDir, '.'),
      path.join(tempRoot, 'outside.js'),
      path.join(outsideDir, 'escape.js'),
      path.join(distDir, '..', 'outside.js')
    ]) {
      assert.throws(
        () => assertSafeOutputPath({ rootDir: tempRoot, inputPath, distDir, outputPath: target }),
        /Refusing to write outside dist directory/
      );
    }

    const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
    const rootAliasInDist = path.join(distDir, 'root-alias');
    fs.symlinkSync(tempRoot, rootAliasInDist, symlinkType);
    assert.throws(
      () =>
        assertSafeOutputPath({
          rootDir: tempRoot,
          inputPath,
          distDir,
          outputPath: path.join(rootAliasInDist, 'plugin.js')
        }),
      /Refusing to overwrite input file/
    );

    const escapeLinkInDist = path.join(distDir, 'escape-link');
    fs.symlinkSync(outsideDir, escapeLinkInDist, symlinkType);
    assert.throws(
      () =>
        assertSafeOutputPath({
          rootDir: tempRoot,
          inputPath,
          distDir,
          outputPath: path.join(escapeLinkInDist, 'out.js')
        }),
      /Refusing to write outside dist directory/
    );

    const cliFail = spawnSync(process.execPath, [buildScript, '../outside.js'], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    assert.notEqual(cliFail.status, 0);
    assert.match(cliFail.stderr + cliFail.stdout, /Refusing to write outside dist directory/);

    const danglingLink = path.join(distDir, 'dangling-dir');
    fs.symlinkSync(path.join(outsideDir, 'missing-target'), danglingLink, symlinkType);
    assert.throws(() => resolveRealPath(danglingLink), { code: 'ENOENT' });
    assert.throws(() => resolveRealPath(path.join(danglingLink, 'nested', 'out.js')), { code: 'ENOENT' });
    assert.throws(
      () =>
        assertSafeOutputPath({
          rootDir: tempRoot,
          inputPath,
          distDir,
          outputPath: path.join(danglingLink, 'out.js')
        }),
      { code: 'ENOENT' }
    );

    const symlinkDistRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-symdist-'));
    try {
      const symDistInput = path.join(symlinkDistRoot, 'plugin.js');
      const symDistDir = path.join(symlinkDistRoot, 'dist');
      fs.writeFileSync(symDistInput, 'var x = 1;\n', 'utf8');
      fs.symlinkSync(outsideDir, symDistDir, symlinkType);

      assert.throws(
        () =>
          assertSafeOutputPath({
            rootDir: symlinkDistRoot,
            inputPath: symDistInput,
            distDir: symDistDir,
            outputPath: path.join(symDistDir, 'out.js')
          }),
        /Refusing to write through non-canonical dist directory/
      );
    } finally {
      fs.rmSync(symlinkDistRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('stripComments preserves ES5.1 §7.3 LineTerminator boundaries across CR, LS, and PS', () => {
  assert.equal(stripComments('return/*\r*/1;'), 'return\n1;');
  assert.equal(stripComments('return/*\u2028*/1;'), 'return\n1;');
  assert.equal(stripComments('return/*\u2029*/1;'), 'return\n1;');
  assert.equal(stripComments('var a/*inline*/=1;'), 'var a =1;');
  assert.equal(stripComments('var a = 1; // c\u2028var b = 2;'), 'var a = 1; \u2028var b = 2;');
  assert.equal(stripComments('var a = 1;\u2029'), 'var a = 1;\u2029');
});

test('stripComments rescans template literal braces and regex literals without stripping content', () => {
  const input = [
    'var a = `head ${ { k: 1 /* strip */ } } /* keep */ // keep`;',
    'var b = `m1 ${1} /* keep1 */ ${ `nested ${2} /* keep2 */` } // keep3`;',
    'var c = `div ${1}` / 2; // strip',
    'var r = /foo\\/\\*bar\\*\\/baz/g; /* strip */'
  ].join('\n');

  const output = stripComments(input);
  assert.match(output, /\/\* keep \*\/ \/\/ keep`/);
  assert.match(output, /\/\* keep1 \*\//);
  assert.match(output, /\/\* keep2 \*\//);
  assert.match(output, /\/\/ keep3`/);
  assert.match(output, /var c = `div \$\{1\}` \/ 2;/);
  assert.match(output, /var r = \/foo\\\/\\\*bar\\\*\\\/baz\/g;/);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.doesNotMatch(output, /\/\/ strip/);
});

test('stripComments and buildPlugin handle division after contextual/future-reserved identifiers and member keywords', async () => {
  const snippet = [
    '/**! @license MIT */',
    'var type = 10, out = 20, from = 4, set = 6, get = 8, of = 12, await = 14, yield = 16;',
    'var cfg = { default: 8, return: 10, await: 12 };',
    "var half = type / 2; // don't clip",
    "out /= 2; // don't break",
    "var mid = cfg.default / 2; // don't expose midpoint",
    "var opt = cfg?.return / 2; // don't break optional chaining",
    "var optAwait = cfg?.await / 2; // don't break member await",
    "var ratio = from / 2 + set / 2 + get / 2 + of / 2 + await / 2 + yield / 2; // don't leak",
    "var undef = undefined / 2; // don't break undefined",
    "for (var i = of / 2; i < 1; i++) {} // don't break for-init of"
  ].join('\n');

  const stripped = stripComments(snippet);
  assert.doesNotMatch(stripped, /don't/);
  assert.match(stripped, /var half = type \/ 2;/);
  assert.match(stripped, /out \/= 2;/);
  assert.match(stripped, /var mid = cfg\.default \/ 2;/);
  assert.match(stripped, /var opt = cfg\?\.return \/ 2;/);

  const es5BuildSnippet = [
    '/**! @license MIT */',
    'var type = 10, out = 20, from = 4, of = 12, await = 14, yield = 16;',
    'var cfg = { default: 8, return: 10 };',
    "var half = type / 2; // don't clip",
    "out /= 2; // don't break",
    "var mid = cfg.default / 2; // don't expose midpoint",
    "var ratio = from / 2 + of / 2 + await / 2 + yield / 2; // don't leak",
    "var ret = cfg.return / 2; // don't fail"
  ].join('\n');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-div-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/div-plugin', version: '0.2.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'plugin.js'), es5BuildSnippet, 'utf8');

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    const built = fs.readFileSync(outPath, 'utf8');
    assert.doesNotMatch(built, /don't/);
    assert.match(built, /type \/ 2/);
    assert.match(built, /out \/= 2/);
    assert.match(built, /cfg\.default \/ 2/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('stripComments still rescans regex literals after for-of, async await, and generator yield', () => {
  const input = [
    'for (var x of /a\\/\\*keep\\*\\//g) {} /* strip */',
    'async function f() { return await /b\\/\\*keep\\*\\//g; /* strip */ }',
    'const g = async (x) => await /c\\/\\*keep\\*\\//g; /* strip */',
    'function* gen() { yield /d\\/\\*keep\\*\\//g; /* strip */ }',
    'async function outer() {',
    '  function inner() {',
    '    var await = 10;',
    "    return await / 2; // don't leak",
    '  }',
    '  return inner() && (await /e\\/\\*keep\\*\\//g); /* strip */',
    '}'
  ].join('\n');

  const output = stripComments(input);
  assert.match(output, /\/a\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/b\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/c\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/d\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/e\\\/\\\*keep\\\*\\\/\/g/);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.doesNotMatch(output, /don't leak/);
});

test('stripComments and buildPlugin handle statement-header regexes, prefix/postfix ++/--, and expression braces', async () => {
  const input = [
    'if (cond) /[//]/.test(s);',
    'var x = 1;',
    'if (cond) /[/*]/.test(s) && /[*/]/.test(s);',
    'while (cond) /[//]/.test(s);',
    'for (var i = 0; i < 1; i++) /[/*]/.test(s) && /[*/]/.test(s);',
    'with (obj) /[//]/.test(s);',
    'var callDiv = obj.if(cond) / 2; /* strip */',
    'var optCallDiv = obj?.while(cond) / 2; /* strip */',
    'var n = ++/[//]/.lastIndex;',
    'var y = 1;',
    'var sum = ++/[/*]/.lastIndex + --/[*/]/.lastIndex;',
    'a',
    '++/[//]/.lastIndex;',
    'a /*',
    '*/ --/[//]/.lastIndex;',
    '{ foo(); } ++/[//]/.lastIndex;',
    'if (cond) ++/[//]/.lastIndex;',
    'var postA = a++ / 2; /* strip */',
    'var postB = arr[i]-- / 2; /* strip */',
    'var postC = obj.default++ / 2; /* strip */',
    'var objDiv = { a: 1 } / 2; /* strip */',
    'var fnDiv = function () {} / 2; /* strip */',
    'var asyncFnDiv = async function () {} / 2; /* strip */',
    'var clsDiv = class {} / 2; /* strip */',
    'var ternDiv = cond ? { a: 1 } : { b: 2 } / 2; /* strip */',
    'var nestedObjDiv = { a: { b: 1 } / 2 }; /* strip */',
    'if (cond) { foo(); } /[//]/.test(s);',
    'function decl() {} /[/*]/.test(s) && /[*/]/.test(s);',
    'class Decl {} /[//]/.test(s);',
    'lbl: { foo(); } /[//]/.test(s);',
    'switch (v) { case 1: { foo(); } /[//]/.test(s); }',
    'const arrowBlock = () => {}',
    '/[//]/.test(s);'
  ].join('\n');

  const output = stripComments(input);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.match(output, /if \(cond\) \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /if \(cond\) \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /while \(cond\) \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /for \(var i = 0; i < 1; i\+\+\) \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /with \(obj\) \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /var n = \+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /var sum = \+\+\/\[\/\*\]\/\.lastIndex \+ --\/\[(\*\/)\]\/\.lastIndex;/);
  assert.match(output, /a\n\+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /--\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /\{ foo\(\); \} \+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /if \(cond\) \+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /var objDiv = \{ a: 1 \} \/ 2;/);
  assert.match(output, /var fnDiv = function \(\) \{\} \/ 2;/);
  assert.match(output, /if \(cond\) \{ foo\(\); \} \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /function decl\(\) \{\} \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /class Decl \{\} \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /lbl: \{ foo\(\); \} \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /switch \(v\) \{ case 1: \{ foo\(\); \} \/\[\/\/\]\/\.test\(s\); \}/);
  assert.match(output, /const arrowBlock = \(\) => \{\}\n\/\[\/\/\]\/\.test\(s\);/);

  const es5BuildSnippet = [
    '/**! @license MIT */',
    'if (cond) /[//]/.test(s);',
    'var x = 1;',
    'if (cond) /[/*]/.test(s) && /[*/]/.test(s);',
    'var n = ++/[//]/.lastIndex;',
    'var y = 1;',
    'var objDiv = { a: 1 } / 2; /* strip */',
    'var fnDiv = function () {} / 2; /* strip */'
  ].join('\n');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-f1-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/f1-plugin', version: '0.2.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'plugin.js'), es5BuildSnippet, 'utf8');

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    const built = fs.readFileSync(outPath, 'utf8');
    assert.doesNotMatch(built, /\/\* strip \*\//);
    assert.match(built, /if \(cond\) \/\[\/\/\]\/\.test\(s\);/);
    assert.match(built, /if \(cond\) \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
    assert.match(built, /var n = \+\+\/\[\/\/\]\/\.lastIndex;/);
    assert.match(built, /var objDiv = \{ a: 1 \} \/ 2;/);
    assert.match(built, /var fnDiv = function \(\) \{\} \/ 2;/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('stripComments handles member-keyword for-of LHS, ASI-terminated concise async arrows, and object methods', () => {
  const input = [
    'for (obj.default of /[/*]/.exec(s) || []) {} /* strip */',
    'for (obj.of of /[/*]/.exec(s) || []) {} /* strip */',
    'const f = async (x) => x',
    'var y = await / 2; /* strip */',
    'async function outer() {',
    '  var o = {',
    '    m() {',
    '      var await = 10;',
    '      return await / 2; /* strip */',
    '    }',
    '  };',
    '  return o;',
    '}'
  ].join('\n');

  const output = stripComments(input);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.match(output, /for \(obj\.default of \/\[\/\*\]\/\.exec\(s\) \|\| \[\]\)/);
  assert.match(output, /for \(obj\.of of \/\[\/\*\]\/\.exec\(s\) \|\| \[\]\)/);
  assert.match(output, /var y = await \/ 2;/);
  assert.match(output, /return await \/ 2;/);
});

test('stripComments and buildPlugin preserve regexes and divisions across nested for-headers, async blocks, template interpolations, and adjacent JSDoc banners', async () => {
  const input = [
    '/**!',
    ' * @license MIT',
    ' *//**',
    ' * @description strip me',
    ' */',
    'for (var f = function () { s = "a"; { s = "b"; } /[/*]/.test(s) && /[*/]/.test(s); }; false; ) {}',
    'for (var g = function () { s = "a"; { s = "b"; } /[//]/.test(s);',
    'var z = 1; }; false; ) {}',
    'for (let [x = function () { a(); }()] of /[/*]/.exec(s) && /[*/]/.exec(s)) {}',
    'async function outer() {',
    '  var async = function () {};',
    '  async()',
    '  { return await /[/*]/.test(s) && /[*/]/.test(s); }',
    '}',
    'var await = 10;',
    "var x = `${async () => 1}` && await / 2; // don't crash"
  ].join('\n');

  const output = stripComments(input);
  assert.match(output, /@license MIT/);
  assert.doesNotMatch(output, /@description strip me/);
  assert.doesNotMatch(output, /don't crash/);
  assert.match(output, /\{ s = "b"; \} \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /\{ s = "b"; \} \/\[\/\/\]\/\.test\(s\);\nvar z = 1;/);
  assert.match(output, /of \/\[\/\*\]\/\.exec\(s\) && \/\[(\*\/)\]\/\.exec\(s\)/);
  assert.match(output, /\{ return await \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\); \}/);
  assert.match(output, /var x = `\$\{async \(\) => 1\}` && await \/ 2;/);

  const es5BuildSnippet = [
    '/**!',
    ' * @license MIT',
    ' *//**',
    ' * @description strip me',
    ' */',
    'for (var f = function () { s = "a"; { s = "b"; } /[/*]/.test(s) && /[*/]/.test(s); }; false; ) {}',
    'for (var g = function () { s = "a"; { s = "b"; } /[//]/.test(s);',
    'var z = 1; }; false; ) {}'
  ].join('\n');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-vectors-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/vectors-plugin', version: '0.2.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'plugin.js'), es5BuildSnippet, 'utf8');

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    const built = fs.readFileSync(outPath, 'utf8');
    assert.match(built, /@license MIT/);
    assert.doesNotMatch(built, /@description strip me/);
    assert.match(built, /\/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\)/);
    assert.match(built, /\/\[\/\/\]\/\.test\(s\);/);
    assert.match(built, /var z = 1;/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('eslint rejects non-ES5 syntax in plugin.js', () => {
  const result = spawnSync(process.execPath, [eslintBin, '--stdin', '--stdin-filename', 'plugin.js'], {
    cwd: ROOT,
    input: 'const x = () => 1;\n',
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0, 'ESLint must reject ES6+ syntax under ecmaVersion: 5');
  assert.match(result.stdout + result.stderr, /Parsing error/i);
});

test('tsc --noEmit rejects invalid @kidthales/pgmmv-types usage under checkJs', () => {
  const tempDir = fs.mkdtempSync(path.join(ROOT, '.tmp-tsc-probe-'));
  try {
    const probePath = path.join(tempDir, 'probe.js');
    fs.writeFileSync(
      probePath,
      [
        '/// <reference types="@kidthales/pgmmv-types/pgmmv.d.ts" />',
        '(function () {',
        '  /** @type {import("@kidthales/pgmmv-types").AgtkPlugin} */',
        '  var invalidPlugin = {',
        '    setLocale: function () {},',
        '    getInfo: function () {},',
        '    initialize: function () {',
        '      Agtk.nonexistent();',
        '    },',
        '    finalize: function () {},',
        '    setParamValue: function () {},',
        '    setInternal: function () {},',
        '    call: function () {},',
        '    execLinkCondition: function () {',
        "      return 'not-a-boolean';",
        '    }',
        '  };',
        '  return invalidPlugin;',
        '})();'
      ].join('\n'),
      'utf8'
    );

    const tsconfigPath = path.join(tempDir, 'tsconfig.json');
    fs.writeFileSync(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: 'es2020',
            lib: ['es2020', 'dom'],
            module: 'nodenext',
            moduleResolution: 'nodenext',
            allowJs: true,
            checkJs: true,
            noEmit: true,
            strict: true,
            types: ['@kidthales/pgmmv-types']
          },
          include: ['probe.js']
        },
        null,
        2
      ),
      'utf8'
    );

    const result = spawnSync(process.execPath, [tscBin, '-p', tsconfigPath, '--noEmit'], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0, 'tsc --noEmit must reject invalid Agtk API and return types');
    const output = result.stdout + result.stderr;
    assert.match(output, /TS2339/);
    assert.match(output, /TS2322/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
