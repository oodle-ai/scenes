import { SceneObjectBase } from '../../core/SceneObjectBase.js';
import { sceneGraph } from '../../core/sceneGraph/index.js';

class LocalValueVariable extends SceneObjectBase {
  constructor(initialState) {
    super({
      type: "system",
      value: "",
      text: "",
      name: "",
      ...initialState,
      skipUrlSync: true
    });
  }
  getValue() {
    return this.state.value;
  }
  getValueText() {
    return this.state.text.toString();
  }
  /**
   * Checks the ancestor of our parent SceneVariableSet for loading state of a variable with the same name
   * This function is unit tested from SceneVariableSet tests.
   */
  isAncestorLoading() {
    var _a, _b;
    const ancestorScope = (_b = (_a = this.parent) == null ? void 0 : _a.parent) == null ? void 0 : _b.parent;
    if (!ancestorScope) {
      throw new Error("LocalValueVariable requires a parent SceneVariableSet that has an ancestor SceneVariableSet");
    }
    const set = sceneGraph.getVariables(ancestorScope);
    const parentVar = sceneGraph.lookupVariable(this.state.name, ancestorScope);
    if (set && parentVar) {
      return set.isVariableLoadingOrWaitingToUpdate(parentVar);
    }
    return false;
  }
}

export { LocalValueVariable };
//# sourceMappingURL=LocalValueVariable.js.map
