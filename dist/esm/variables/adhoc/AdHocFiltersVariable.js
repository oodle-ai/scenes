import React, { useMemo } from 'react';
import { SceneObjectBase } from '../../core/SceneObjectBase.js';
import { SceneVariableValueChangedEvent } from '../types.js';
import { getQueriesForVariables, dataFromResponse, responseHasError, renderPrometheusLabelFilters } from '../utils.js';
import { patchGetAdhocFilters } from './patchGetAdhocFilters.js';
import { useStyles2 } from '@grafana/ui';
import { sceneGraph } from '../../core/sceneGraph/index.js';
import { AdHocFilterBuilder } from './AdHocFilterBuilder.js';
import { AdHocFilterRenderer } from './AdHocFilterRenderer.js';
import { getDataSourceSrv } from '@grafana/runtime';
import { AdHocFiltersVariableUrlSyncHandler } from './AdHocFiltersVariableUrlSyncHandler.js';
import { css } from '@emotion/css';
import { getEnrichedFiltersRequest } from '../getEnrichedFiltersRequest.js';
import { AdHocFiltersComboboxRenderer } from './AdHocFiltersCombobox/AdHocFiltersComboboxRenderer.js';
import { wrapInSafeSerializableSceneObject } from '../../utils/wrapInSafeSerializableSceneObject.js';
import { debounce, isEqual } from 'lodash';
import { getAdHocFiltersFromScopes } from './getAdHocFiltersFromScopes.js';
import { VariableDependencyConfig } from '../VariableDependencyConfig.js';
import { getQueryController } from '../../core/sceneGraph/getQueryController.js';
import { FILTER_RESTORED_INTERACTION, FILTER_REMOVED_INTERACTION } from '../../performance/interactionConstants.js';
import { AdHocFiltersVariableController } from './controller/AdHocFiltersVariableController.js';

const OPERATORS = [
  {
    value: "=",
    description: "Equals"
  },
  {
    value: "!=",
    description: "Not equal"
  },
  {
    value: "=|",
    description: "One of. Use to filter on multiple values.",
    isMulti: true
  },
  {
    value: "!=|",
    description: "Not one of. Use to exclude multiple values.",
    isMulti: true
  },
  {
    value: "=~",
    description: "Matches regex",
    isRegex: true
  },
  {
    value: "!~",
    description: "Does not match regex",
    isRegex: true
  },
  {
    value: "<",
    description: "Less than"
  },
  {
    value: "<=",
    description: "Less than or equal to"
  },
  {
    value: ">",
    description: "Greater than"
  },
  {
    value: ">=",
    description: "Greater than or equal to"
  }
];
class AdHocFiltersVariable extends SceneObjectBase {
  constructor(state) {
    var _a, _b, _c, _d, _e;
    super({
      type: "adhoc",
      name: (_a = state.name) != null ? _a : "Filters",
      filters: [],
      datasource: null,
      applyMode: "auto",
      filterExpression: (_d = state.filterExpression) != null ? _d : renderExpression(state.expressionBuilder, [...(_b = state.originFilters) != null ? _b : [], ...(_c = state.filters) != null ? _c : []]),
      ...state
    });
    this._scopedVars = { __sceneObject: wrapInSafeSerializableSceneObject(this) };
    this._dataSourceSrv = getDataSourceSrv();
    // holds the originalValues of all baseFilters in a map. The values
    // are set on construct and used to restore a baseFilter with an origin
    // to its original value if edited at some point
    this._originalValues = /* @__PURE__ */ new Map();
    this._prevScopes = [];
    /** Needed for scopes dependency */
    this._variableDependency = new VariableDependencyConfig(this, {
      dependsOnScopes: true,
      onReferencedVariableValueChanged: () => this._updateScopesFilters()
    });
    this._urlSync = new AdHocFiltersVariableUrlSyncHandler(this);
    this._debouncedVerifyApplicability = debounce(this._verifyApplicability, 100);
    this._activationHandler = () => {
      this._debouncedVerifyApplicability();
      return () => {
        var _a;
        (_a = this.state.originFilters) == null ? void 0 : _a.forEach((filter) => {
          if (filter.restorable) {
            this.restoreOriginalFilter(filter);
          }
        });
      };
    };
    if (this.state.applyMode === "auto") {
      patchGetAdhocFilters(this);
    }
    (_e = this.state.originFilters) == null ? void 0 : _e.forEach((filter) => {
      var _a2;
      this._originalValues.set(`${filter.key}-${filter.origin}`, {
        operator: filter.operator,
        value: (_a2 = filter.values) != null ? _a2 : [filter.value]
      });
    });
    this.addActivationHandler(this._activationHandler);
  }
  _updateScopesFilters() {
    var _a, _b;
    const scopes = sceneGraph.getScopes(this);
    if (!scopes || !scopes.length) {
      this.setState({
        originFilters: (_a = this.state.originFilters) == null ? void 0 : _a.filter((filter) => filter.origin !== "scope")
      });
      return;
    }
    const scopeFilters = getAdHocFiltersFromScopes(scopes);
    if (!scopeFilters.length) {
      return;
    }
    let finalFilters = scopeFilters;
    const scopeInjectedFilters = [];
    const remainingFilters = [];
    finalFilters.forEach((scopeFilter) => {
      var _a2;
      this._originalValues.set(`${scopeFilter.key}-${scopeFilter.origin}`, {
        value: (_a2 = scopeFilter.values) != null ? _a2 : [scopeFilter.value],
        operator: scopeFilter.operator
      });
    });
    (_b = this.state.originFilters) == null ? void 0 : _b.forEach((filter) => {
      if (filter.origin === "scope") {
        scopeInjectedFilters.push(filter);
      } else {
        remainingFilters.push(filter);
      }
    });
    if (this._prevScopes.length) {
      this.setState({ originFilters: [...finalFilters, ...remainingFilters] });
      this._prevScopes = scopes;
      this._debouncedVerifyApplicability();
      return;
    }
    const editedScopeFilters = scopeInjectedFilters.filter((filter) => filter.restorable);
    const editedScopeFilterKeys = editedScopeFilters.map((filter) => filter.key);
    const scopeFilterKeys = scopeFilters.map((filter) => filter.key);
    finalFilters = [
      ...editedScopeFilters.filter((filter) => scopeFilterKeys.includes(filter.key)),
      ...scopeFilters.filter((filter) => !editedScopeFilterKeys.includes(filter.key))
    ];
    this.setState({ originFilters: [...finalFilters, ...remainingFilters] });
    this._prevScopes = scopes;
    this._debouncedVerifyApplicability();
  }
  setState(update) {
    var _a, _b;
    let filterExpressionChanged = false;
    if ((update.filters && update.filters !== this.state.filters || update.originFilters && update.originFilters !== this.state.originFilters) && !update.filterExpression) {
      const filters = (_a = update.filters) != null ? _a : this.state.filters;
      const originFilters = (_b = update.originFilters) != null ? _b : this.state.originFilters;
      update.filterExpression = renderExpression(this.state.expressionBuilder, [...originFilters != null ? originFilters : [], ...filters]);
      filterExpressionChanged = update.filterExpression !== this.state.filterExpression;
    }
    super.setState(update);
    if (filterExpressionChanged) {
      this.publishEvent(new SceneVariableValueChangedEvent(this), true);
    }
  }
  /**
   * Updates the variable's `filters` and `filterExpression` state.
   * If `skipPublish` option is true, this will not emit the `SceneVariableValueChangedEvent`,
   * allowing consumers to update the filters without triggering dependent data providers.
   */
  updateFilters(filters, options) {
    var _a;
    let filterExpressionChanged = false;
    let filterExpression = void 0;
    if (filters && filters !== this.state.filters) {
      filterExpression = renderExpression(this.state.expressionBuilder, [
        ...(_a = this.state.originFilters) != null ? _a : [],
        ...filters
      ]);
      filterExpressionChanged = filterExpression !== this.state.filterExpression;
    }
    super.setState({
      filters,
      filterExpression
    });
    if (filterExpressionChanged && (options == null ? void 0 : options.skipPublish) !== true || (options == null ? void 0 : options.forcePublish)) {
      this.publishEvent(new SceneVariableValueChangedEvent(this), true);
    }
  }
  restoreOriginalFilter(filter) {
    const original = {
      matchAllFilter: false,
      restorable: false
    };
    if (filter.restorable) {
      const originalFilter = this._originalValues.get(`${filter.key}-${filter.origin}`);
      if (!originalFilter) {
        return;
      }
      original.value = originalFilter == null ? void 0 : originalFilter.value[0];
      original.values = originalFilter == null ? void 0 : originalFilter.value;
      original.valueLabels = originalFilter == null ? void 0 : originalFilter.value;
      original.operator = originalFilter == null ? void 0 : originalFilter.operator;
      original.nonApplicable = originalFilter == null ? void 0 : originalFilter.nonApplicable;
      const queryController = getQueryController(this);
      queryController == null ? void 0 : queryController.startProfile(FILTER_RESTORED_INTERACTION);
      this._updateFilter(filter, original);
    }
  }
  getValue() {
    return this.state.filterExpression;
  }
  _updateFilter(filter, update) {
    var _a;
    const { originFilters, filters, _wip } = this.state;
    if (filter.origin) {
      const originalValues = this._originalValues.get(`${filter.key}-${filter.origin}`);
      const updateValues = update.values || (update.value ? [update.value] : void 0);
      if (updateValues && !isEqual(updateValues, originalValues == null ? void 0 : originalValues.value) || update.operator && update.operator !== (originalValues == null ? void 0 : originalValues.operator)) {
        update.restorable = true;
      } else if (updateValues && isEqual(updateValues, originalValues == null ? void 0 : originalValues.value)) {
        update.restorable = false;
      }
      const updatedFilters2 = (_a = originFilters == null ? void 0 : originFilters.map((f) => {
        return f === filter ? { ...f, ...update } : f;
      })) != null ? _a : [];
      this.setState({ originFilters: updatedFilters2 });
      return;
    }
    if (filter === _wip) {
      if ("value" in update && update["value"] !== "") {
        this.setState({ filters: [...filters, { ..._wip, ...update }], _wip: void 0 });
        this._debouncedVerifyApplicability();
      } else {
        this.setState({ _wip: { ...filter, ...update } });
      }
      return;
    }
    const updatedFilters = this.state.filters.map((f) => {
      return f === filter ? { ...f, ...update } : f;
    });
    this.setState({ filters: updatedFilters });
  }
  updateToMatchAll(filter) {
    this._updateFilter(filter, {
      operator: "=~",
      value: ".*",
      values: [".*"],
      valueLabels: ["All"],
      matchAllFilter: true,
      nonApplicable: false,
      restorable: true
    });
  }
  _removeFilter(filter) {
    if (filter === this.state._wip) {
      this.setState({ _wip: void 0 });
      return;
    }
    const queryController = getQueryController(this);
    queryController == null ? void 0 : queryController.startProfile(FILTER_REMOVED_INTERACTION);
    this.setState({ filters: this.state.filters.filter((f) => f !== filter) });
    this._debouncedVerifyApplicability();
  }
  _removeLastFilter() {
    const filterToRemove = this.state.filters.at(-1);
    if (filterToRemove) {
      this._removeFilter(filterToRemove);
    }
  }
  _handleComboboxBackspace(filter) {
    var _a;
    if (this.state.filters.length) {
      let filterToForceIndex = this.state.filters.length - 1;
      if (filter !== this.state._wip) {
        filterToForceIndex = -1;
      }
      this.setState({
        filters: this.state.filters.reduce((acc, f, index) => {
          if (index === filterToForceIndex && !f.readOnly) {
            return [
              ...acc,
              {
                ...f,
                forceEdit: true
              }
            ];
          }
          if (f === filter) {
            return acc;
          }
          return [...acc, f];
        }, [])
      });
    } else if ((_a = this.state.originFilters) == null ? void 0 : _a.length) {
      let filterToForceIndex = this.state.originFilters.length - 1;
      if (filter !== this.state._wip) {
        filterToForceIndex = -1;
      }
      this.setState({
        originFilters: this.state.originFilters.reduce((acc, f, index) => {
          if (index === filterToForceIndex && !f.readOnly) {
            return [
              ...acc,
              {
                ...f,
                forceEdit: true
              }
            ];
          }
          if (f === filter) {
            return acc;
          }
          return [...acc, f];
        }, [])
      });
    }
  }
  async _verifyApplicability() {
    var _a, _b, _c;
    const filters = [...this.state.filters, ...(_a = this.state.originFilters) != null ? _a : []];
    const ds = await this._dataSourceSrv.get(this.state.datasource, this._scopedVars);
    if (!ds || !ds.getDrilldownsApplicability) {
      return;
    }
    if (!filters) {
      return;
    }
    const timeRange = sceneGraph.getTimeRange(this).state.value;
    const queries = this.state.useQueriesAsFilterForOptions ? getQueriesForVariables(this) : void 0;
    const response = await ds.getDrilldownsApplicability({
      filters,
      queries,
      timeRange,
      scopes: sceneGraph.getScopes(this),
      ...getEnrichedFiltersRequest(this)
    });
    const responseMap = /* @__PURE__ */ new Map();
    response.forEach((filter) => {
      responseMap.set(`${filter.key}${filter.origin ? `-${filter.origin}` : ""}`, filter);
    });
    const update = {
      filters: [...this.state.filters],
      originFilters: [...(_b = this.state.originFilters) != null ? _b : []]
    };
    update.filters.forEach((f) => {
      const filter = responseMap.get(f.key);
      if (filter) {
        f.nonApplicable = !filter.applicable;
        f.nonApplicableReason = filter.reason;
      }
    });
    (_c = update.originFilters) == null ? void 0 : _c.forEach((f) => {
      const filter = responseMap.get(`${f.key}-${f.origin}`);
      if (filter) {
        if (!f.matchAllFilter) {
          f.nonApplicable = !filter.applicable;
          f.nonApplicableReason = filter.reason;
        }
        const originalValue = this._originalValues.get(`${f.key}-${f.origin}`);
        if (originalValue) {
          originalValue.nonApplicable = !filter.applicable;
          originalValue.nonApplicableReason = filter == null ? void 0 : filter.reason;
        }
      }
    });
    this.setState(update);
  }
  /**
   * Get possible keys given current filters. Do not call from plugins directly
   */
  async _getKeys(currentKey) {
    var _a, _b, _c, _d, _e;
    const override = await ((_b = (_a = this.state).getTagKeysProvider) == null ? void 0 : _b.call(_a, this, currentKey));
    if (override && override.replace) {
      return dataFromResponse(override.values).map(toSelectableValue);
    }
    if (this.state.defaultKeys) {
      return this.state.defaultKeys.map(toSelectableValue);
    }
    const ds = await this._dataSourceSrv.get(this.state.datasource, this._scopedVars);
    if (!ds || !ds.getTagKeys) {
      return [];
    }
    const applicableOriginFilters = (_d = (_c = this.state.originFilters) == null ? void 0 : _c.filter((f) => !f.nonApplicable)) != null ? _d : [];
    const otherFilters = this.state.filters.filter((f) => f.key !== currentKey && !f.nonApplicable).concat((_e = this.state.baseFilters) != null ? _e : []).concat(applicableOriginFilters);
    const timeRange = sceneGraph.getTimeRange(this).state.value;
    const queries = this.state.useQueriesAsFilterForOptions ? getQueriesForVariables(this) : void 0;
    const response = await ds.getTagKeys({
      filters: otherFilters,
      queries,
      timeRange,
      scopes: sceneGraph.getScopes(this),
      ...getEnrichedFiltersRequest(this)
    });
    if (responseHasError(response)) {
      this.setState({ error: response.error.message });
    }
    let keys = dataFromResponse(response);
    if (override) {
      keys = keys.concat(dataFromResponse(override.values));
    }
    const tagKeyRegexFilter = this.state.tagKeyRegexFilter;
    if (tagKeyRegexFilter) {
      keys = keys.filter((f) => f.text.match(tagKeyRegexFilter));
    }
    return keys.map(toSelectableValue);
  }
  /**
   * Get possible key values for a specific key given current filters. Do not call from plugins directly
   */
  async _getValuesFor(filter) {
    var _a, _b, _c, _d;
    const override = await ((_b = (_a = this.state).getTagValuesProvider) == null ? void 0 : _b.call(_a, this, filter));
    if (override && override.replace) {
      return dataFromResponse(override.values).map(toSelectableValue);
    }
    const ds = await this._dataSourceSrv.get(this.state.datasource, this._scopedVars);
    if (!ds || !ds.getTagValues) {
      return [];
    }
    const originFilters = (_d = (_c = this.state.originFilters) == null ? void 0 : _c.filter((f) => f.key !== filter.key)) != null ? _d : [];
    const otherFilters = this.state.filters.filter((f) => f.key !== filter.key).concat(originFilters);
    const timeRange = sceneGraph.getTimeRange(this).state.value;
    const queries = this.state.useQueriesAsFilterForOptions ? getQueriesForVariables(this) : void 0;
    let scopes = sceneGraph.getScopes(this);
    if (filter.origin === "scope") {
      scopes = scopes == null ? void 0 : scopes.map((scope) => {
        return {
          ...scope,
          spec: {
            ...scope.spec,
            filters: scope.spec.filters.filter((f) => f.key !== filter.key)
          }
        };
      });
    }
    const response = await ds.getTagValues({
      key: filter.key,
      filters: otherFilters,
      timeRange,
      queries,
      scopes,
      ...getEnrichedFiltersRequest(this)
    });
    if (responseHasError(response)) {
      this.setState({ error: response.error.message });
    }
    let values = dataFromResponse(response);
    if (override) {
      values = values.concat(dataFromResponse(override.values));
    }
    return values.map(toSelectableValue);
  }
  _addWip() {
    this.setState({
      _wip: { key: "", value: "", operator: "=", condition: "" }
    });
  }
  _getOperators() {
    const { supportsMultiValueOperators, allowCustomValue = true } = this.state;
    return OPERATORS.filter(({ isMulti, isRegex }) => {
      if (!supportsMultiValueOperators && isMulti) {
        return false;
      }
      if (!allowCustomValue && isRegex) {
        return false;
      }
      return true;
    }).map(({ value, description }) => ({
      label: value,
      value,
      description
    }));
  }
}
AdHocFiltersVariable.Component = AdHocFiltersVariableRenderer;
function renderExpression(builder, filters) {
  var _a;
  return (builder != null ? builder : renderPrometheusLabelFilters)((_a = filters == null ? void 0 : filters.filter((f) => isFilterApplicable(f))) != null ? _a : []);
}
function AdHocFiltersVariableRenderer({ model }) {
  const { filters, readOnly, addFilterButtonText } = model.useState();
  const styles = useStyles2(getStyles);
  const controller = useMemo(
    () => model.state.layout === "combobox" ? new AdHocFiltersVariableController(model) : void 0,
    [model]
  );
  if (controller) {
    return /* @__PURE__ */ React.createElement(AdHocFiltersComboboxRenderer, { controller });
  }
  return /* @__PURE__ */ React.createElement("div", { className: styles.wrapper }, filters.filter((filter) => !filter.hidden).map((filter, index) => /* @__PURE__ */ React.createElement(React.Fragment, { key: index }, /* @__PURE__ */ React.createElement(AdHocFilterRenderer, { filter, model }))), !readOnly && /* @__PURE__ */ React.createElement(AdHocFilterBuilder, { model, key: "'builder", addFilterButtonText }));
}
const getStyles = (theme) => ({
  wrapper: css({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    columnGap: theme.spacing(2),
    rowGap: theme.spacing(1)
  })
});
function toSelectableValue(input) {
  const { text, value } = input;
  const result = {
    // converting text to string due to some edge cases where it can be a number
    // TODO: remove once https://github.com/grafana/grafana/issues/99021 is closed
    label: String(text),
    value: String(value != null ? value : text)
  };
  if ("group" in input) {
    result.group = input.group;
  }
  if ("meta" in input) {
    result.meta = input.meta;
  }
  return result;
}
function isMatchAllFilter(filter) {
  return filter.operator === "=~" && filter.value === ".*";
}
function isFilterComplete(filter) {
  return filter.key !== "" && filter.operator !== "" && filter.value !== "";
}
function isFilterApplicable(filter) {
  return !filter.nonApplicable;
}
function isMultiValueOperator(operatorValue) {
  const operator = OPERATORS.find((o) => o.value === operatorValue);
  if (!operator) {
    return false;
  }
  return Boolean(operator.isMulti);
}

export { AdHocFiltersVariable, AdHocFiltersVariableRenderer, OPERATORS, isFilterApplicable, isFilterComplete, isMatchAllFilter, isMultiValueOperator, toSelectableValue };
//# sourceMappingURL=AdHocFiltersVariable.js.map
