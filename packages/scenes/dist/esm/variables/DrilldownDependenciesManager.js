import { findActiveAdHocFilterVariableByUid } from './adhoc/patchGetAdhocFilters.js';
import { findActiveGroupByVariablesByUid } from './groupby/findActiveGroupByVariablesByUid.js';
import { isFilterComplete, isFilterApplicable } from './adhoc/AdHocFiltersVariable.js';

class DrilldownDependenciesManager {
  constructor(variableDependency) {
    this._variableDependency = variableDependency;
  }
  /**
   * Walk up scene graph and find the closest filterset with matching data source
   */
  findAndSubscribeToDrilldowns(interpolatedUid) {
    const filtersVar = findActiveAdHocFilterVariableByUid(interpolatedUid);
    const groupByVar = findActiveGroupByVariablesByUid(interpolatedUid);
    let hasChanges = false;
    if (this._adhocFiltersVar !== filtersVar) {
      this._adhocFiltersVar = filtersVar;
      hasChanges = true;
    }
    if (this._groupByVar !== groupByVar) {
      this._groupByVar = groupByVar;
      hasChanges = true;
    }
    if (hasChanges) {
      this._updateExplicitDrilldownVariableDependencies();
    }
  }
  _updateExplicitDrilldownVariableDependencies() {
    const explicitDependencies = [];
    if (this._adhocFiltersVar) {
      explicitDependencies.push(this._adhocFiltersVar.state.name);
    }
    if (this._groupByVar) {
      explicitDependencies.push(this._groupByVar.state.name);
    }
    this._variableDependency.setVariableNames(explicitDependencies);
  }
  get adHocFiltersVar() {
    return this._adhocFiltersVar;
  }
  get groupByVar() {
    return this._groupByVar;
  }
  getFilters() {
    var _a;
    return this._adhocFiltersVar ? [...(_a = this._adhocFiltersVar.state.originFilters) != null ? _a : [], ...this._adhocFiltersVar.state.filters].filter(
      (f) => isFilterComplete(f) && isFilterApplicable(f)
    ) : void 0;
  }
  getGroupByKeys() {
    return this._groupByVar ? this._groupByVar.getApplicableKeys() : void 0;
  }
  cleanup() {
    this._adhocFiltersVar = void 0;
    this._groupByVar = void 0;
  }
}

export { DrilldownDependenciesManager };
//# sourceMappingURL=DrilldownDependenciesManager.js.map
