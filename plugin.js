/**!
 * @file PGMMV Coordinates Plugin
 * @author Tristan Bonsor <kidthales@agogpixel.com>
 * @copyright 2026 Tristan Bonsor
 * @license {@link https://opensource.org/licenses/MIT MIT License}
 * @version 0.2.0
 */
/// <reference types="@kidthales/pgmmv-types/pgmmv.d.ts" />
// noinspection ES6ConvertVarToLetConst
(function () {
  /**
   * @typedef {import("@kidthales/pgmmv-types").AgtkPlugin} AgtkPlugin
   * @typedef {import("@kidthales/pgmmv-types").AgtkActionCommand} AgtkActionCommand
   * @typedef {import("@kidthales/pgmmv-types").AgtkLinkCondition} AgtkLinkCondition
   * @typedef {import("@kidthales/pgmmv-types").AgtkParameter} AgtkParameter
   * @typedef {import("@kidthales/pgmmv-types").AgtkParameterValue} AgtkParameterValue
   * @typedef {import("@kidthales/pgmmv-types").AgtkParameterValue['value']} JsonValue
   * @typedef {import("@kidthales/pgmmv-types").AgtkPluginInfoResult<'actionCommand'>} AgtkActionCommandList
   * @typedef {import("@kidthales/pgmmv-types").AgtkPluginInfoResult<'linkCondition'>} AgtkLinkConditionList
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['switchVariableObjects']['ProjectCommon']} AgtkProjectCommon
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['actionCommands']['commandBehavior']['CommandBehaviorNext']} AgtkCommandBehaviorNext
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['actionCommands']['UnsetObject']} AgtkUnsetObject
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['switchVariableObjects']['ProjectCommon' | 'SelfObject' | 'ParentObject'] | AgtkUnsetObject} SwitchVariableObjectId
   * @typedef {ReturnType<import("@kidthales/pgmmv-types").Agtk['variables']['get']> | ReturnType<ReturnType<import("@kidthales/pgmmv-types").Agtk['objectInstances']['get']>['variables']['get']>} AgtkVariable
   * @typedef {ReturnType<import("@kidthales/pgmmv-types").Agtk['objectInstances']['get']>} AgtkObjectInstance
   * @typedef {ReturnType<import("@kidthales/pgmmv-types").cc['rect']>} CCRect
   */
  // noinspection UnnecessaryLocalVariableJS
  /**
   * @type {AgtkPlugin}
   */
  var plugin = {
    setLocale: function () {},
    getInfo: function (category) {
      switch (category) {
        case 'name':
          return 'PGMMV Coordinates Plugin';
        case 'description':
          return 'Utilities for working with object coordinates.';
        case 'author':
          return 'Tristan Bonsor <kidthales@agogpixel.com>';
        case 'help':
          return (
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
        case 'parameter':
          return [];
        case 'internal':
          return null;
        case 'actionCommand':
          return [cameraToWorldActionCommand, worldToCameraActionCommand];
        case 'linkCondition':
          return [
            inRectLinkCondition,
            onTileEdgeLinkCondition,
            inTileLinkCondition,
            inTileHorizontalLinkCondition,
            inTileVerticalLinkCondition
          ];
        default:
          break;
      }
    },
    initialize: function () {
      if (isEditor()) {
        return;
      }

      if (!window.kt) {
        window.kt = {};
      }

      window.kt.coordinates = {
        cameraToWorld: cameraToWorld,
        worldToCamera: worldToCamera,
        inRect: inRect,
        onTileEdge: onTileEdge,
        inTile: inTile,
        inTileHorizontal: inTileHorizontal,
        inTileVertical: inTileVertical
      };
    },
    finalize: function () {},
    setParamValue: function () {},
    setInternal: function () {},
    call: function () {},
    execActionCommand: function (actionCommandIndex, parameter, objectId, instanceId) {
      /** @type {AgtkActionCommand | undefined} */
      var actionCommand = /** @type {AgtkActionCommandList} */ (plugin.getInfo('actionCommand'))[actionCommandIndex],
        /** @type {Record<number, JsonValue>} */
        np;

      if (!actionCommand) {
        return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
      }

      np = normalizeParameters(parameter, actionCommand.parameter);

      switch (actionCommand.id) {
        case cameraToWorldActionCommand.id:
          return cameraToWorld(
            toSwitchVariableObjectId(np[actionCommand.parameter[0].id]),
            toNumber(np[actionCommand.parameter[1].id]),
            toNumber(np[actionCommand.parameter[2].id]),
            toSwitchVariableObjectId(np[actionCommand.parameter[3].id]),
            toNumber(np[actionCommand.parameter[4].id]),
            toNumber(np[actionCommand.parameter[5].id]),
            instanceId
          );
        case worldToCameraActionCommand.id:
          return worldToCamera(
            toSwitchVariableObjectId(np[actionCommand.parameter[0].id]),
            toNumber(np[actionCommand.parameter[1].id]),
            toNumber(np[actionCommand.parameter[2].id]),
            toSwitchVariableObjectId(np[actionCommand.parameter[3].id]),
            toNumber(np[actionCommand.parameter[4].id]),
            toNumber(np[actionCommand.parameter[5].id]),
            instanceId
          );
        default:
          break;
      }

      return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
    },
    execLinkCondition: function (linkConditionIndex, parameter, objectId, instanceId) {
      /** @type {AgtkLinkCondition | undefined} */
      var linkCondition = /** @type {AgtkLinkConditionList} */ (plugin.getInfo('linkCondition'))[linkConditionIndex],
        /** @type {Record<number, JsonValue>} */
        np;

      if (!linkCondition) {
        return false;
      }

      np = normalizeParameters(parameter, linkCondition.parameter);

      switch (linkCondition.id) {
        case inRectLinkCondition.id:
          return inRect(
            toSwitchVariableObjectId(np[linkCondition.parameter[0].id]),
            toNumber(np[linkCondition.parameter[1].id]),
            toNumber(np[linkCondition.parameter[2].id]),
            toNumber(np[linkCondition.parameter[3].id]),
            toNumber(np[linkCondition.parameter[4].id]),
            instanceId
          );
        case onTileEdgeLinkCondition.id:
          return onTileEdge(toNumber(np[linkCondition.parameter[0].id]), instanceId);
        case inTileLinkCondition.id:
          return inTile(
            toSwitchVariableObjectId(np[linkCondition.parameter[0].id]),
            toNumber(np[linkCondition.parameter[1].id]),
            toNumber(np[linkCondition.parameter[2].id]),
            toNumber(np[linkCondition.parameter[3].id]),
            toNumber(np[linkCondition.parameter[4].id]),
            instanceId
          );
        case inTileHorizontalLinkCondition.id:
          return inTileHorizontal(
            toSwitchVariableObjectId(np[linkCondition.parameter[0].id]),
            toNumber(np[linkCondition.parameter[1].id]),
            toNumber(np[linkCondition.parameter[2].id]),
            instanceId
          );
        case inTileVerticalLinkCondition.id:
          return inTileVertical(
            toSwitchVariableObjectId(np[linkCondition.parameter[0].id]),
            toNumber(np[linkCondition.parameter[1].id]),
            toNumber(np[linkCondition.parameter[2].id]),
            instanceId
          );
        default:
          break;
      }

      return false;
    }
  };

  /** @const */
  var kAxisX = 0,
    /** @const */
    kAxisY = 1,
    /** @const */
    kAxisBoth = 2,
    /** @const */
    kLt = 0,
    /** @const */
    kLte = 1,
    /** @const */
    kEq = 2,
    /** @const */
    kGte = 3,
    /** @const */
    kGt = 4,
    /** @const */
    kNot = 5;

  /** @type {AgtkActionCommand} */
  var cameraToWorldActionCommand = {
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
    /** @type {AgtkActionCommand} */
    worldToCameraActionCommand = {
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
    },
    /** @type {AgtkLinkCondition} */
    inRectLinkCondition = {
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
    /** @type {AgtkLinkCondition} */
    onTileEdgeLinkCondition = {
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
            { id: kAxisX, name: 'X' },
            { id: kAxisY, name: 'Y' },
            { id: kAxisBoth, name: 'Both' }
          ],
          defaultValue: -1
        }
      ]
    },
    /** @type {AgtkLinkCondition} */
    inTileLinkCondition = {
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
            { id: kLt, name: '<' },
            { id: kLte, name: '<=' },
            { id: kEq, name: '=' },
            { id: kGte, name: '>=' },
            { id: kGt, name: '>' },
            { id: kNot, name: '!=' }
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
            { id: kLt, name: '<' },
            { id: kLte, name: '<=' },
            { id: kEq, name: '=' },
            { id: kGte, name: '>=' },
            { id: kGt, name: '>' },
            { id: kNot, name: '!=' }
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
    /** @type {AgtkLinkCondition} */
    inTileHorizontalLinkCondition = {
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
            { id: kLt, name: '<' },
            { id: kLte, name: '<=' },
            { id: kEq, name: '=' },
            { id: kGte, name: '>=' },
            { id: kGt, name: '>' },
            { id: kNot, name: '!=' }
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
    /** @type {AgtkLinkCondition} */
    inTileVerticalLinkCondition = {
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
            { id: kLt, name: '<' },
            { id: kLte, name: '<=' },
            { id: kEq, name: '=' },
            { id: kGte, name: '>=' },
            { id: kGt, name: '>' },
            { id: kNot, name: '!=' }
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
    };

  /**
   * @param {SwitchVariableObjectId} inputVariableObjectId
   * @param {number} inputXVariableId
   * @param {number} inputYVariableId
   * @param {SwitchVariableObjectId} outputVariableObjectId
   * @param {number} outputXVariableId
   * @param {number} outputYVariableId
   * @param {number} instanceId
   * @returns {AgtkCommandBehaviorNext}
   */
  var cameraToWorld = function (
    inputVariableObjectId,
    inputXVariableId,
    inputYVariableId,
    outputVariableObjectId,
    outputXVariableId,
    outputYVariableId,
    instanceId
  ) {
    var projectCommon = Agtk.constants.switchVariableObjects.ProjectCommon,
      inputSource = resolveSwitchVariableObject(inputVariableObjectId, instanceId),
      outputSource = resolveSwitchVariableObject(outputVariableObjectId, instanceId),
      /** @type {AgtkVariable} */
      inputXVariable,
      /** @type {AgtkVariable} */
      inputYVariable,
      /** @type {AgtkVariable} */
      outputXVariable,
      /** @type {AgtkVariable} */
      outputYVariable,
      /** @type {CCRect} */
      cameraRect;

    if (inputSource === Agtk.constants.actionCommands.UnsetObject) {
      logWarning('camera to world: unset input variable source');
    } else if (inputXVariableId < 1) {
      logWarning('camera to world: invalid input x variable ID');
    } else if (inputYVariableId < 1) {
      logWarning('camera to world: invalid input y variable ID');
    } else if (outputSource === Agtk.constants.actionCommands.UnsetObject) {
      logWarning('camera to world: unset output variable source');
    } else if (outputXVariableId < 1) {
      logWarning('camera to world: invalid output x variable ID');
    } else if (outputYVariableId < 1) {
      logWarning('camera to world: invalid output y variable ID');
    } else {
      if (inputSource === projectCommon) {
        inputXVariable = Agtk.variables.get(inputXVariableId);
        inputYVariable = Agtk.variables.get(inputYVariableId);
      } else {
        inputXVariable = inputSource.variables.get(inputXVariableId);
        inputYVariable = inputSource.variables.get(inputYVariableId);
      }

      if (outputSource === projectCommon) {
        outputXVariable = Agtk.variables.get(outputXVariableId);
        outputYVariable = Agtk.variables.get(outputYVariableId);
      } else {
        outputXVariable = outputSource.variables.get(outputXVariableId);
        outputYVariable = outputSource.variables.get(outputYVariableId);
      }

      if (!inputXVariable) {
        logWarning('camera to world: input x variable not found');
      } else if (!inputYVariable) {
        logWarning('camera to world: input y variable not found');
      } else if (!outputXVariable) {
        logWarning('camera to world: output x variable not found');
      } else if (!outputYVariable) {
        logWarning('camera to world: output y variable not found');
      } else {
        cameraRect = getCameraRect();
        outputXVariable.setValue(cameraRect.x + inputXVariable.getValue());
        outputYVariable.setValue(cameraRect.y + inputYVariable.getValue());
      }
    }

    return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
  };

  /**
   * @param {SwitchVariableObjectId} inputVariableObjectId
   * @param {number} inputXVariableId
   * @param {number} inputYVariableId
   * @param {SwitchVariableObjectId} outputVariableObjectId
   * @param {number} outputXVariableId
   * @param {number} outputYVariableId
   * @param {number} instanceId
   * @returns {AgtkCommandBehaviorNext}
   */
  var worldToCamera = function (
    inputVariableObjectId,
    inputXVariableId,
    inputYVariableId,
    outputVariableObjectId,
    outputXVariableId,
    outputYVariableId,
    instanceId
  ) {
    var projectCommon = Agtk.constants.switchVariableObjects.ProjectCommon,
      inputSource = resolveSwitchVariableObject(inputVariableObjectId, instanceId),
      outputSource = resolveSwitchVariableObject(outputVariableObjectId, instanceId),
      /** @type {AgtkVariable} */
      inputXVariable,
      /** @type {AgtkVariable} */
      inputYVariable,
      /** @type {AgtkVariable} */
      outputXVariable,
      /** @type {AgtkVariable} */
      outputYVariable,
      /** @type {CCRect} */
      cameraRect;

    if (inputSource === Agtk.constants.actionCommands.UnsetObject) {
      logWarning('world to camera: unset input variable source');
    } else if (inputXVariableId < 1) {
      logWarning('world to camera: invalid input x variable ID');
    } else if (inputYVariableId < 1) {
      logWarning('world to camera: invalid input y variable ID');
    } else if (outputSource === Agtk.constants.actionCommands.UnsetObject) {
      logWarning('world to camera: unset output variable source');
    } else if (outputXVariableId < 1) {
      logWarning('world to camera: invalid output x variable ID');
    } else if (outputYVariableId < 1) {
      logWarning('world to camera: invalid output y variable ID');
    } else {
      if (inputSource === projectCommon) {
        inputXVariable = Agtk.variables.get(inputXVariableId);
        inputYVariable = Agtk.variables.get(inputYVariableId);
      } else {
        inputXVariable = inputSource.variables.get(inputXVariableId);
        inputYVariable = inputSource.variables.get(inputYVariableId);
      }

      if (outputSource === projectCommon) {
        outputXVariable = Agtk.variables.get(outputXVariableId);
        outputYVariable = Agtk.variables.get(outputYVariableId);
      } else {
        outputXVariable = outputSource.variables.get(outputXVariableId);
        outputYVariable = outputSource.variables.get(outputYVariableId);
      }

      if (!inputXVariable) {
        logWarning('world to camera: input x variable not found');
      } else if (!inputYVariable) {
        logWarning('world to camera: input y variable not found');
      } else if (!outputXVariable) {
        logWarning('world to camera: output x variable not found');
      } else if (!outputYVariable) {
        logWarning('world to camera: output y variable not found');
      } else {
        cameraRect = getCameraRect();
        outputXVariable.setValue(inputXVariable.getValue() - cameraRect.x);
        outputYVariable.setValue(inputYVariable.getValue() - cameraRect.y);
      }
    }

    return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} xVariableId
   * @param {number} yVariableId
   * @param {number} widthVariableId
   * @param {number} heightVariableId
   * @param {number} instanceId
   * @returns {boolean}
   */
  var inRect = function (variableObjectId, xVariableId, yVariableId, widthVariableId, heightVariableId, instanceId) {
    var source = resolveSwitchVariableObject(variableObjectId, instanceId),
      /** @type {AgtkVariable} */
      xVariable,
      /** @type {AgtkVariable} */
      yVariable,
      /** @type {AgtkVariable} */
      widthVariable,
      /** @type {AgtkVariable} */
      heightVariable,
      /** @type {AgtkObjectInstance} */
      objectInstance;

    if (source === Agtk.constants.actionCommands.UnsetObject) {
      logWarning('in rectangle: unset variable source');
    } else if (xVariableId < 1) {
      logWarning('in rectangle: invalid x variable ID');
    } else if (yVariableId < 1) {
      logWarning('in rectangle: invalid y variable ID');
    } else if (widthVariableId < 1) {
      logWarning('in rectangle: invalid width variable ID');
    } else if (heightVariableId < 1) {
      logWarning('in rectangle: invalid height variable ID');
    } else {
      if (source === Agtk.constants.switchVariableObjects.ProjectCommon) {
        xVariable = Agtk.variables.get(xVariableId);
        yVariable = Agtk.variables.get(yVariableId);
        widthVariable = Agtk.variables.get(widthVariableId);
        heightVariable = Agtk.variables.get(heightVariableId);
      } else {
        xVariable = source.variables.get(xVariableId);
        yVariable = source.variables.get(yVariableId);
        widthVariable = source.variables.get(widthVariableId);
        heightVariable = source.variables.get(heightVariableId);
      }

      if (!xVariable) {
        logWarning('in rectangle: x variable not found');
      } else if (!yVariable) {
        logWarning('in rectangle: y variable not found');
      } else if (!widthVariable) {
        logWarning('in rectangle: width variable not found');
      } else if (!heightVariable) {
        logWarning('in rectangle: height variable not found');
      } else {
        objectInstance = Agtk.objectInstances.get(instanceId);

        return cc.rectContainsPoint(
          cc.rect(xVariable.getValue(), yVariable.getValue(), widthVariable.getValue(), heightVariable.getValue()),
          cc.p(
            objectInstance.variables.get(Agtk.constants.objects.variables.XId).getValue(),
            objectInstance.variables.get(Agtk.constants.objects.variables.YId).getValue()
          )
        );
      }
    }

    return false;
  };

  /**
   * @param {number} axisCustomId
   * @param {number} instanceId
   * @returns {boolean}
   */
  var onTileEdge = function (axisCustomId, instanceId) {
    var objectInstance = Agtk.objectInstances.get(instanceId);

    switch (axisCustomId) {
      case kAxisX:
        return (
          objectInstance.variables.get(Agtk.constants.objects.variables.XId).getValue() % Agtk.settings.tileWidth === 0
        );
      case kAxisY:
        return (
          objectInstance.variables.get(Agtk.constants.objects.variables.YId).getValue() % Agtk.settings.tileHeight === 0
        );
      case kAxisBoth:
      default:
        break;
    }

    return (
      objectInstance.variables.get(Agtk.constants.objects.variables.XId).getValue() % Agtk.settings.tileWidth === 0 &&
      objectInstance.variables.get(Agtk.constants.objects.variables.YId).getValue() % Agtk.settings.tileHeight === 0
    );
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} comparisonXCustomId
   * @param {number} originXVariableId
   * @param {number} comparisonYCustomId
   * @param {number} originYVariableId
   * @param {number} instanceId
   * @returns {boolean}
   */
  var inTile = function (
    variableObjectId,
    comparisonXCustomId,
    originXVariableId,
    comparisonYCustomId,
    originYVariableId,
    instanceId
  ) {
    var source = resolveSwitchVariableObject(variableObjectId, instanceId),
      originX = resolveTileOrigin(source, originXVariableId),
      /** @type {number} */
      originY,
      objectInstance = Agtk.objectInstances.get(instanceId),
      x = objectInstance.variables.get(Agtk.constants.objects.variables.XId).getValue(),
      /** @type {number} */
      y,
      tileWidth = Agtk.settings.tileWidth,
      /** @type {number} */
      tileHeight,
      compareX = Math.floor(x / tileWidth) * tileWidth + originX * tileWidth,
      /** @type {number} */
      compareY,
      /** @type {boolean} */
      testX;

    switch (comparisonXCustomId) {
      case kLt:
        testX = x < compareX;
        break;
      case kLte:
        testX = x <= compareX;
        break;
      case kGte:
        testX = x >= compareX;
        break;
      case kGt:
        testX = x > compareX;
        break;
      case kNot:
        testX = x !== compareX;
        break;
      case kEq:
      default:
        testX = x === compareX;
        break;
    }

    if (!testX) {
      return false;
    }

    originY = resolveTileOrigin(source, originYVariableId);
    y = objectInstance.variables.get(Agtk.constants.objects.variables.YId).getValue();
    tileHeight = Agtk.settings.tileHeight;
    compareY = Math.floor(y / tileHeight) * tileHeight + originY * tileHeight;

    switch (comparisonYCustomId) {
      case kLt:
        return y < compareY;
      case kLte:
        return y <= compareY;
      case kGte:
        return y >= compareY;
      case kGt:
        return y > compareY;
      case kNot:
        return y !== compareY;
      case kEq:
      default:
        break;
    }

    return y === compareY;
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} comparisonXCustomId
   * @param {number} originXVariableId
   * @param {number} instanceId
   * @returns {boolean}
   */
  var inTileHorizontal = function (variableObjectId, comparisonXCustomId, originXVariableId, instanceId) {
    var source = resolveSwitchVariableObject(variableObjectId, instanceId),
      originX = resolveTileOrigin(source, originXVariableId),
      x = Agtk.objectInstances.get(instanceId).variables.get(Agtk.constants.objects.variables.XId).getValue(),
      tileWidth = Agtk.settings.tileWidth,
      compareX = Math.floor(x / tileWidth) * tileWidth + originX * tileWidth;

    switch (comparisonXCustomId) {
      case kLt:
        return x < compareX;
      case kLte:
        return x <= compareX;
      case kGte:
        return x >= compareX;
      case kGt:
        return x > compareX;
      case kNot:
        return x !== compareX;
      case kEq:
      default:
        break;
    }

    return x === compareX;
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} comparisonYCustomId
   * @param {number} originYVariableId
   * @param {number} instanceId
   * @returns {boolean}
   */
  var inTileVertical = function (variableObjectId, comparisonYCustomId, originYVariableId, instanceId) {
    var source = resolveSwitchVariableObject(variableObjectId, instanceId),
      originY = resolveTileOrigin(source, originYVariableId),
      y = Agtk.objectInstances.get(instanceId).variables.get(Agtk.constants.objects.variables.YId).getValue(),
      tileHeight = Agtk.settings.tileHeight,
      compareY = Math.floor(y / tileHeight) * tileHeight + originY * tileHeight;

    switch (comparisonYCustomId) {
      case kLt:
        return y < compareY;
      case kLte:
        return y <= compareY;
      case kGte:
        return y >= compareY;
      case kGt:
        return y > compareY;
      case kNot:
        return y !== compareY;
      case kEq:
      default:
        break;
    }

    return y === compareY;
  };

  /** @type {() => CCRect} */
  var getCameraRect = function () {
    var scene = Agtk.sceneInstances.getCurrent(),
      layer = scene.getLayerByIndex(0),
      cameraTargetPosition = scene.getCurrentCameraTargetPos(),
      cameraScale = scene.getCurrentCameraDisplayScale(),
      cameraScaledWidth = Math.floor(Agtk.settings.screenWidth / cameraScale.x),
      cameraScaledHeight = Math.floor(Agtk.settings.screenHeight / cameraScale.y),
      /** @type {number} */
      cameraLeft,
      /** @type {number} */
      cameraTop;

    if (cameraScaledWidth > layer.width) {
      cameraLeft = Math.floor((layer.width - cameraScaledWidth) / 2);
    } else {
      cameraLeft = cameraTargetPosition.x - Math.floor(cameraScaledWidth / 2);

      if (cameraLeft < 0) {
        cameraLeft = 0;
      } else if (cameraLeft > layer.width - cameraScaledWidth) {
        cameraLeft = layer.width - cameraScaledWidth;
      }
    }

    if (cameraScaledHeight > layer.height) {
      cameraTop = Math.floor((layer.height - cameraScaledHeight) / 2);
    } else {
      cameraTop = cameraTargetPosition.y - Math.floor(cameraScaledHeight / 2);

      if (cameraTop < 0) {
        cameraTop = 0;
      } else if (cameraTop > layer.height - cameraScaledHeight) {
        cameraTop = layer.height - cameraScaledHeight;
      }
    }

    return cc.rect(cameraLeft, cameraTop, cameraScaledWidth, cameraScaledHeight);
  };

  /** @type {(msg: string) => void} */
  var logWarning = function (msg) {
    if (isEditor()) {
      return;
    }

    Agtk.log('[WARNING][' + plugin.getInfo('name') + '] ' + msg);
  };

  /**
   * @returns {boolean}
   */
  var isEditor = function () {
    return typeof Agtk === 'undefined' || !Agtk || typeof Agtk.log !== 'function';
  };

  /**
   * @param {JsonValue} value
   * @returns {SwitchVariableObjectId}
   */
  var toSwitchVariableObjectId = function (value) {
    if (
      value === Agtk.constants.switchVariableObjects.ProjectCommon ||
      value === Agtk.constants.switchVariableObjects.SelfObject ||
      value === Agtk.constants.switchVariableObjects.ParentObject
    ) {
      return value;
    }

    return Agtk.constants.actionCommands.UnsetObject;
  };

  /**
   * @param {JsonValue} value
   * @returns {number}
   */
  var toNumber = function (value) {
    return typeof value === 'number' ? value : -1;
  };

  /**
   * @param {AgtkObjectInstance | AgtkProjectCommon | AgtkUnsetObject} source
   * @param {number} originVariableId
   * @returns {number}
   */
  var resolveTileOrigin = function (source, originVariableId) {
    /** @type {AgtkVariable} */
    var originVariable;

    if (source === Agtk.constants.actionCommands.UnsetObject || originVariableId < 1) {
      return 0.5;
    }

    originVariable = (source === Agtk.constants.switchVariableObjects.ProjectCommon ? Agtk : source).variables.get(
      originVariableId
    );

    return !originVariable ? 0.5 : cc.clampf(originVariable.getValue(), 0, 1);
  };

  /**
   * @param {AgtkParameterValue[]} paramValue Parameter values to normalize.
   * @param {AgtkParameter[]} defaults Default parameter values available.
   * @returns {Record<number, JsonValue>}
   */
  var normalizeParameters = function (paramValue, defaults) {
    /** @type {Record<number, JsonValue>} */
    var normalized = {},
      /** @type {number} */
      len = defaults.length,
      /** @type {number} */
      i = 0,
      /** @type {AgtkParameter} */
      d,
      /** @type {AgtkParameterValue} */
      pv;

    for (; i < len; ++i) {
      d = defaults[i];
      normalized[d.id] = d.type === 'Json' ? JSON.stringify(d.defaultValue) : /** @type {JsonValue} */ (d.defaultValue);
    }

    len = paramValue.length;

    for (i = 0; i < len; ++i) {
      pv = paramValue[i];
      normalized[pv.id] = pv.value;
    }

    return normalized;
  };

  /**
   * @param {SwitchVariableObjectId} switchVariableObjectId
   * @param {number} instanceId
   * @returns {AgtkObjectInstance | AgtkProjectCommon | AgtkUnsetObject}
   */
  var resolveSwitchVariableObject = function (switchVariableObjectId, instanceId) {
    var instance = Agtk.objectInstances.get(instanceId),
      pId;

    switch (switchVariableObjectId) {
      case Agtk.constants.switchVariableObjects.ProjectCommon:
        return switchVariableObjectId;
      case Agtk.constants.switchVariableObjects.SelfObject:
        return instance;
      case Agtk.constants.switchVariableObjects.ParentObject:
        pId = instance.variables.get(Agtk.constants.objects.variables.ParentObjectInstanceIDId).getValue();

        if (pId !== Agtk.constants.actionCommands.UnsetObject) {
          return Agtk.objectInstances.get(pId);
        }

        break;
      default:
        break;
    }

    return Agtk.constants.actionCommands.UnsetObject;
  };

  return plugin;
})();
