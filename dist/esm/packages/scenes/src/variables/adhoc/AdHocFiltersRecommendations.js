import React from 'react';
import { store } from '@grafana/data';
import { sceneGraph } from '../../core/sceneGraph/index.js';
import { getEnrichedDataRequest } from '../../querying/getEnrichedDataRequest.js';
import { getQueriesForVariables } from '../utils.js';
import { getDataSource } from '../../utils/getDataSource.js';
import { DrilldownRecommendations } from '../components/DrilldownRecommendations.js';
import { ScopesVariable } from '../variants/ScopesVariable.js';
import { SCOPES_VARIABLE_NAME } from '../constants.js';
import { AdHocFiltersVariable } from './AdHocFiltersVariable.js';
import { SceneObjectBase } from '../../core/SceneObjectBase.js';
import { wrapInSafeSerializableSceneObject } from '../../utils/wrapInSafeSerializableSceneObject.js';

const getRecentFiltersKey = (datasourceUid) => `grafana.filters.recent.${datasourceUid != null ? datasourceUid : "default"}`;
class AdHocFiltersRecommendations extends SceneObjectBase {
  constructor(state = {}) {
    super(state);
    this._activationHandler = () => {
      const json = store.get(this._getStorageKey());
      const storedFilters = json ? JSON.parse(json) : [];
      if (storedFilters.length > 0) {
        this._verifyRecentFiltersApplicability(storedFilters);
      } else {
        this.setState({ recentFilters: [] });
      }
      this._fetchRecommendedDrilldowns();
      const scopesVariable = sceneGraph.lookupVariable(SCOPES_VARIABLE_NAME, this._adHocFilter);
      let scopesSubscription;
      if (scopesVariable instanceof ScopesVariable) {
        this._subs.add(
          scopesSubscription = scopesVariable.subscribeToState((newState, prevState) => {
            if (newState.scopes !== prevState.scopes) {
              const json2 = store.get(this._getStorageKey());
              const storedFilters2 = json2 ? JSON.parse(json2) : [];
              if (storedFilters2.length > 0) {
                this._verifyRecentFiltersApplicability(storedFilters2);
              }
              this._fetchRecommendedDrilldowns();
            }
          })
        );
      }
      return () => {
        scopesSubscription == null ? void 0 : scopesSubscription.unsubscribe();
      };
    };
    this.addActivationHandler(this._activationHandler);
  }
  get _adHocFilter() {
    if (!(this.parent instanceof AdHocFiltersVariable)) {
      throw new Error("AdHocFiltersRecommendations must be a child of AdHocFiltersVariable");
    }
    return this.parent;
  }
  get _scopedVars() {
    return { __sceneObject: wrapInSafeSerializableSceneObject(this._adHocFilter) };
  }
  _getStorageKey() {
    var _a;
    return getRecentFiltersKey((_a = this._adHocFilter.state.datasource) == null ? void 0 : _a.uid);
  }
  async _fetchRecommendedDrilldowns() {
    var _a;
    const adhoc = this._adHocFilter;
    const ds = await getDataSource(adhoc.state.datasource, this._scopedVars);
    if (!ds || !ds.getRecommendedDrilldowns) {
      return;
    }
    const queries = adhoc.state.useQueriesAsFilterForOptions ? getQueriesForVariables(adhoc) : void 0;
    const timeRange = sceneGraph.getTimeRange(adhoc).state.value;
    const scopes = sceneGraph.getScopes(adhoc);
    const filters = [...(_a = adhoc.state.originFilters) != null ? _a : [], ...adhoc.state.filters];
    const enrichedRequest = getEnrichedDataRequest(adhoc);
    const dashboardUid = enrichedRequest == null ? void 0 : enrichedRequest.dashboardUID;
    try {
      const recommendedDrilldowns = await ds.getRecommendedDrilldowns({
        timeRange,
        dashboardUid,
        queries: queries != null ? queries : [],
        filters,
        scopes
      });
      if (recommendedDrilldowns == null ? void 0 : recommendedDrilldowns.filters) {
        this.setState({ recommendedFilters: recommendedDrilldowns.filters });
      }
    } catch (error) {
      console.error("Failed to fetch recommended drilldowns:", error);
    }
  }
  async _verifyRecentFiltersApplicability(storedFilters) {
    const adhoc = this._adHocFilter;
    const queries = adhoc.state.useQueriesAsFilterForOptions ? getQueriesForVariables(adhoc) : void 0;
    const response = await adhoc.getFiltersApplicabilityForQueries(storedFilters, queries != null ? queries : []);
    if (!response) {
      this.setState({ recentFilters: storedFilters.slice(-3) });
      return;
    }
    const applicabilityMap = /* @__PURE__ */ new Map();
    response.forEach((item) => {
      applicabilityMap.set(item.key, item.applicable !== false);
    });
    const applicableFilters = storedFilters.filter((f) => {
      const isApplicable = applicabilityMap.get(f.key);
      return isApplicable === void 0 || isApplicable === true;
    }).slice(-3);
    this.setState({ recentFilters: applicableFilters });
  }
  /**
   * Stores a recent filter in localStorage and updates state.
   * Should be called by the parent variable when a filter is added/updated.
   */
  storeRecentFilter(filter) {
    const key = this._getStorageKey();
    const storedFilters = store.get(key);
    const allRecentFilters = storedFilters ? JSON.parse(storedFilters) : [];
    const updatedStoredFilters = [...allRecentFilters, filter].slice(-10);
    store.set(key, JSON.stringify(updatedStoredFilters));
    const adhoc = this._adHocFilter;
    const existingFilter = adhoc.state.filters.find((f) => f.key === filter.key && !Boolean(f.nonApplicable));
    if (existingFilter && !Boolean(existingFilter.nonApplicable)) {
      this.setState({ recentFilters: updatedStoredFilters.slice(-3) });
    }
  }
  addFilterToParent(filter) {
    this._adHocFilter.updateFilters([...this._adHocFilter.state.filters, filter]);
  }
}
AdHocFiltersRecommendations.Component = AdHocFiltersRecommendationsRenderer;
function AdHocFiltersRecommendationsRenderer({ model }) {
  const { recentFilters, recommendedFilters } = model.useState();
  const { filters } = model._adHocFilter.useState();
  const recentDrilldowns = recentFilters == null ? void 0 : recentFilters.map((filter) => ({
    label: `${filter.key} ${filter.operator} ${filter.value}`,
    onClick: () => {
      const exists = filters.some((f) => f.key === filter.key && f.value === filter.value);
      if (!exists) {
        model.addFilterToParent(filter);
      }
    }
  }));
  const recommendedDrilldowns = recommendedFilters == null ? void 0 : recommendedFilters.map((filter) => ({
    label: `${filter.key} ${filter.operator} ${filter.value}`,
    onClick: () => {
      const exists = filters.some((f) => f.key === filter.key && f.value === filter.value);
      if (!exists) {
        model.addFilterToParent(filter);
      }
    }
  }));
  return /* @__PURE__ */ React.createElement(DrilldownRecommendations, { recentDrilldowns, recommendedDrilldowns });
}

export { AdHocFiltersRecommendations, getRecentFiltersKey };
//# sourceMappingURL=AdHocFiltersRecommendations.js.map
