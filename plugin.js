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
            return [cameraToWorldActionCommand];
          case 'linkCondition':
            return [];
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
          cameraToWorld: cameraToWorld
        };
      },
      finalize: function () {},
      setParamValue: function () {},
      setInternal: function () {},
      call: function () {},
      execActionCommand: function (
        actionCommandIndex,
        parameter,
        objectId,
        instanceId,
        actionId,
        commandId,
        commonActionStatus,
        sceneId
      ) {
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
          default:
            break;
        }

        return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
      },
      execLinkCondition: function (
        linkConditionIndex,
        parameter,
        objectId,
        instanceId,
        actionLinkId,
        commonActionStatus
      ) {}
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
