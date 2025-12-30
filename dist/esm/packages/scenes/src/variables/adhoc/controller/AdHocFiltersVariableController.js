import { getQueryController } from '../../../core/sceneGraph/getQueryController.js';
import { getInteractionTracker } from '../../../core/sceneGraph/getInteractionTracker.js';

class AdHocFiltersVariableController {
  constructor(model) {
    this.model = model;
  }
  useState() {
    const state = this.model.useState();
    return {
      filters: state.filters,
      originFilters: state.originFilters,
      readOnly: state.readOnly,
      allowCustomValue: state.allowCustomValue,
      supportsMultiValueOperators: state.supportsMultiValueOperators,
      onAddCustomValue: state.onAddCustomValue,
      wip: state._wip,
      collapsible: state.collapsible,
      valueRecommendations: this.model.getRecommendations(),
      drilldownRecommendationsEnabled: state.drilldownRecommendationsEnabled
    };
  }
  async getKeys(currentKey) {
    return this.model._getKeys(currentKey);
  }
  async getValuesFor(filter) {
    return this.model._getValuesFor(filter);
  }
  getOperators() {
    return this.model._getOperators();
  }
  updateFilter(filter, update) {
    this.model._updateFilter(filter, update);
  }
  updateFilters(filters, options) {
    this.model.updateFilters(filters, options);
  }
  updateToMatchAll(filter) {
    this.model.updateToMatchAll(filter);
  }
  removeFilter(filter) {
    this.model._removeFilter(filter);
  }
  removeLastFilter() {
    this.model._removeLastFilter();
  }
  handleComboboxBackspace(filter) {
    this.model._handleComboboxBackspace(filter);
  }
  addWip() {
    this.model._addWip();
  }
  restoreOriginalFilter(filter) {
    this.model.restoreOriginalFilter(filter);
  }
  clearAll() {
    this.model.clearAll();
  }
  startProfile(name) {
    const queryController = getQueryController(this.model);
    queryController == null ? void 0 : queryController.startProfile(name);
  }
  startInteraction(name) {
    const interactionTracker = getInteractionTracker(this.model);
    interactionTracker == null ? void 0 : interactionTracker.startInteraction(name);
  }
  stopInteraction() {
    const interactionTracker = getInteractionTracker(this.model);
    interactionTracker == null ? void 0 : interactionTracker.stopInteraction();
  }
}

export { AdHocFiltersVariableController };
//# sourceMappingURL=AdHocFiltersVariableController.js.map
