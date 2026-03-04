/**!
 * @file PGMMV Coordinates Plugin
 * @author Tristan Bonsor <kidthales@agogpixel.com>
 * @copyright 2026 Tristan Bonsor
 * @license {@link https://opensource.org/licenses/MIT MIT License}
 * @version 0.1.0
 */
// noinspection ES6ConvertVarToLetConst
(function () {
  // noinspection UnnecessaryLocalVariableJS
  /**
   * @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkPlugin}
   */
  var plugin = {
      setLocale: function () {},
      getInfo: function (category) {
        switch (category) {
          case 'name':
            return 'PGMMV Coordinates Plugin';
          case 'description':
            return 'Utilities for working with 2D coordinates.';
          case 'author':
            return 'Tristan Bonsor <kidthales@agogpixel.com>';
          case 'help':
            return '';
          case 'parameter':
            return [];
          case 'internal':
            return null;
          case 'actionCommand':
            return [cameraToWorldActionCommand, worldToCameraActionCommand];
          case 'linkCondition':
            return [inRectLinkCondition];
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
          inRect: inRect
        };
      },
      finalize: function () {},
      setParamValue: function () {},
      setInternal: function () {},
      call: function () {},
      execActionCommand: function (actionCommandIndex, parameter, objectId, instanceId) {
        /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
        var actionCommand = plugin.getInfo('actionCommand')[actionCommandIndex],
          /** @type {Record<number,import("type-fest").JsonValue>} */
          np = normalizeParameters(parameter, actionCommand.parameter);

        switch (actionCommand.id) {
          case cameraToWorldActionCommand.id:
            return cameraToWorld(
              np[actionCommand.parameter[0].id],
              np[actionCommand.parameter[1].id],
              np[actionCommand.parameter[2].id],
              np[actionCommand.parameter[3].id],
              np[actionCommand.parameter[4].id],
              np[actionCommand.parameter[5].id],
              instanceId
            );
          case worldToCameraActionCommand.id:
            return worldToCamera(
              np[actionCommand.parameter[0].id],
              np[actionCommand.parameter[1].id],
              np[actionCommand.parameter[2].id],
              np[actionCommand.parameter[3].id],
              np[actionCommand.parameter[4].id],
              np[actionCommand.parameter[5].id],
              instanceId
            );
          default:
            break;
        }

        return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
      },
      execLinkCondition: function (linkConditionIndex, parameter, objectId, instanceId) {
        /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkLinkCondition} */
        var linkCondition = plugin.getInfo('linkCondition')[linkConditionIndex],
          /** @type {Record<number,import("type-fest").JsonValue>} */
          np = normalizeParameters(parameter, linkCondition.parameter);

        switch (linkCondition.id) {
          case inRectLinkCondition.id:
            return inRect(
              np[linkCondition.parameter[0].id],
              np[linkCondition.parameter[1].id],
              np[linkCondition.parameter[2].id],
              np[linkCondition.parameter[3].id],
              np[linkCondition.parameter[4].id],
              instanceId
            );
          default:
            break;
        }

        return false;
      }
    },
    /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
    cameraToWorldActionCommand = {
      id: 0,
      name: 'Camera to World [PGMMV Coordinates Plugin]',
      description: 'Convert variables from camera to world coordinates.',
      parameter: [
        {
          id: 100,
          name: 'Input Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Input X:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Input Y:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 101,
          name: 'Output Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 2,
          name: 'Output X:',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 3,
          name: 'Output Y:',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
    worldToCameraActionCommand = {
      id: 1,
      name: 'World to Camera [PGMMV Coordinates Plugin]',
      description: 'Convert variables from world to camera coordinates.',
      parameter: [
        {
          id: 100,
          name: 'Input Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Input X:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Input Y:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 101,
          name: 'Output Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 2,
          name: 'Output X:',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 3,
          name: 'Output Y:',
          type: 'VariableId',
          referenceId: 101,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkLinkCondition} */
    inRectLinkCondition = {
      id: 0,
      name: 'In Rectangle [PGMMV Coordinates Plugin]',
      description:
        'Test if object instance position is within rectangle. Rectangle x & y coordinates correspond to top left.',
      parameter: [
        {
          id: 100,
          name: 'Rectangle Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'X:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Y:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 2,
          name: 'Width:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 3,
          name: 'Height:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    /**
     * @param inputVariableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param inputXVariableId {number}
     * @param inputYVariableId {number}
     * @param outputVariableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param outputXVariableId {number}
     * @param outputYVariableId {number}
     * @param instanceId {number}
     * @returns {import("pgmmv-types/lib/agtk/constants/action-commands/command-behavior").AgtkCommandBehavior['CommandBehaviorNext']}
     */
    cameraToWorld = function (
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
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        inputXVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        inputYVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        outputXVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        outputYVariable,
        /** @type {import("pgmmv-types/lib/cc/rect").CCRect} */
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
    },
    /**
     * @param inputVariableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param inputXVariableId {number}
     * @param inputYVariableId {number}
     * @param outputVariableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param outputXVariableId {number}
     * @param outputYVariableId {number}
     * @param instanceId {number}
     * @returns {import("pgmmv-types/lib/agtk/constants/action-commands/command-behavior").AgtkCommandBehavior['CommandBehaviorNext']}
     */
    worldToCamera = function (
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
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        inputXVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        inputYVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        outputXVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        outputYVariable,
        /** @type {import("pgmmv-types/lib/cc/rect").CCRect} */
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
    },
    /**
     * @param variableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param xVariableId {number}
     * @param yVariableId {number}
     * @param widthVariableId {number}
     * @param heightVariableId {number}
     * @param instanceId {number}
     * @returns {boolean}
     */
    inRect = function (variableObjectId, xVariableId, yVariableId, widthVariableId, heightVariableId, instanceId) {
      var source = resolveSwitchVariableObject(variableObjectId, instanceId),
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        xVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        yVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        widthVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        heightVariable,
        /** @type {import("pgmmv-types/lib/agtk/object-instances/object-instance").AgtkObjectInstance} */
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
    },
    /** @type {() => import("pgmmv-types/lib/cc/rect").CCRect} */
    getCameraRect = function () {
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
    },
    /** @type {(string) => void} */
    logWarning = function (msg) {
      if (isEditor()) {
        return;
      }

      Agtk.log('[WARNING][' + plugin.getInfo('name') + '] ' + msg);
    },
    /**
     * @returns {boolean}
     */
    isEditor = function () {
      return !Agtk || typeof Agtk.log !== 'function';
    },
    /**
     * @param paramValue {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkParameterValue[]} Parameter values to normalize.
     * @param defaults {import("pgmmv-types/lib/agtk/plugins/plugin/parameter").AgtkParameter[]} Default parameter values available.
     * @returns {Record<number, import("type-fest").JsonValue>}
     */
    normalizeParameters = function (paramValue, defaults) {
      /** @type {Record<number,import("type-fest").JsonValue>} */
      var normalized = {},
        /** @type {number} */
        len = defaults.length,
        /** @type {number} */
        i = 0,
        /** @type {import("pgmmv-types/lib/agtk/plugins/plugin/parameter").AgtkParameter|import("pgmmv-types/lib/agtk/plugins/plugin").AgtkParameterValue} */
        p;

      for (; i < len; ++i) {
        p = defaults[i];
        normalized[p.id] = p.type === 'Json' ? JSON.stringify(p.defaultValue) : p.defaultValue;
      }

      len = paramValue.length;

      for (i = 0; i < len; ++i) {
        p = paramValue[i];
        normalized[p.id] = p.value;
      }

      return normalized;
    },
    /**
     * @param switchVariableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param instanceId {number}
     * @returns {
     *   import("pgmmv-types/lib/agtk/object-instances/object-instance").AgtkObjectInstance |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/action-commands").AgtkActionCommands['UnsetObject']
     * }
     */
    resolveSwitchVariableObject = function (switchVariableObjectId, instanceId) {
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
