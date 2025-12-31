import { t } from '@grafana/i18n';
import React, { useMemo, useState, useEffect } from 'react';
import { allActiveGroupByVariables } from './findActiveGroupByVariablesByUid.js';
import { sceneGraph } from '../../core/sceneGraph/index.js';
import { SceneVariableValueChangedEvent } from '../types.js';
import { MultiValueVariable } from '../variants/MultiValueVariable.js';
import { lastValueFrom, map, of, from, mergeMap, tap, take } from 'rxjs';
import { getDataSource } from '../../utils/getDataSource.js';
import { MultiSelect, Select } from '@grafana/ui';
import { isArray, isEqual } from 'lodash';
import { handleOptionGroups, dataFromResponse, getQueriesForVariables, responseHasError } from '../utils.js';
import { OptionWithCheckbox } from '../components/VariableValueSelect.js';
import { GroupByVariableUrlSyncHandler } from './GroupByVariableUrlSyncHandler.js';
import { getOptionSearcher } from '../components/getOptionSearcher.js';
import { getEnrichedFiltersRequest } from '../getEnrichedFiltersRequest.js';
import { wrapInSafeSerializableSceneObject } from '../../utils/wrapInSafeSerializableSceneObject.js';
import { DefaultGroupByCustomIndicatorContainer } from './DefaultGroupByCustomIndicatorContainer.js';
import { GroupByValueContainer } from './GroupByValueContainer.js';
import { getInteractionTracker } from '../../core/sceneGraph/getInteractionTracker.js';
import { GROUPBY_DIMENSIONS_INTERACTION } from '../../performance/interactionConstants.js';

class GroupByVariable extends MultiValueVariable {
  constructor(initialState) {
    super({
      isMulti: true,
      name: "",
      value: [],
      text: [],
      options: [],
      datasource: null,
      baseFilters: [],
      applyMode: "auto",
      layout: "horizontal",
      type: "groupby",
      ...initialState,
      noValueOnClear: true
    });
    this.isLazy = true;
    this._urlSync = new GroupByVariableUrlSyncHandler(this);
    this._activationHandler = () => {
      this._verifyApplicability();
      if (this.state.defaultValue) {
        if (this.checkIfRestorable(this.state.value)) {
          this.setState({ restorable: true });
        }
      }
      return () => {
        if (this.state.defaultValue) {
          this.restoreDefaultValues();
        }
      };
    };
    /**
     * Get possible keys given current filters. Do not call from plugins directly
     */
    this._getKeys = async (ds) => {
      var _a, _b, _c;
      const override = await ((_b = (_a = this.state).getTagKeysProvider) == null ? void 0 : _b.call(_a, this, null));
      if (override && override.replace) {
        return override.values;
      }
      if (this.state.defaultOptions) {
        return this.state.defaultOptions.concat(dataFromResponse((_c = override == null ? void 0 : override.values) != null ? _c : []));
      }
      if (!ds.getTagKeys) {
        return [];
      }
      const queries = getQueriesForVariables(this);
      const otherFilters = this.state.baseFilters || [];
      const timeRange = sceneGraph.getTimeRange(this).state.value;
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
      return keys;
    };
    if (this.state.defaultValue) {
      this.changeValueTo(this.state.defaultValue.value, this.state.defaultValue.text, false);
    }
    if (this.state.applyMode === "auto") {
      this.addActivationHandler(() => {
        allActiveGroupByVariables.add(this);
        return () => allActiveGroupByVariables.delete(this);
      });
    }
    this.addActivationHandler(this._activationHandler);
  }
  validateAndUpdate() {
    return this.getValueOptions({}).pipe(
      map((options) => {
        this._updateValueGivenNewOptions(options);
        return {};
      })
    );
  }
  _updateValueGivenNewOptions(options) {
    const { value: currentValue, text: currentText } = this.state;
    const stateUpdate = {
      options,
      loading: false,
      value: currentValue != null ? currentValue : [],
      text: currentText != null ? currentText : []
    };
    this.setState(stateUpdate);
  }
  getValueOptions(args) {
    if (this.state.defaultOptions) {
      return of(
        this.state.defaultOptions.map((o) => ({
          label: o.text,
          value: String(o.value),
          group: o.group
        }))
      );
    }
    this.setState({ loading: true, error: null });
    return from(
      getDataSource(this.state.datasource, {
        __sceneObject: wrapInSafeSerializableSceneObject(this)
      })
    ).pipe(
      mergeMap((ds) => {
        return from(this._getKeys(ds)).pipe(
          tap((response) => {
            if (responseHasError(response)) {
              this.setState({ error: response.error.message });
            }
          }),
          map((response) => dataFromResponse(response)),
          take(1),
          mergeMap((data) => {
            const a = data.map((i) => {
              return {
                label: i.text,
                value: i.value ? String(i.value) : i.text,
                group: i.group
              };
            });
            return of(a);
          })
        );
      })
    );
  }
  getApplicableKeys() {
    const { value, keysApplicability } = this.state;
    const valueArray = isArray(value) ? value : value ? [value] : [];
    if (!keysApplicability || keysApplicability.length === 0) {
      return valueArray;
    }
    const applicableValues = valueArray.filter((val) => {
      const applicability = keysApplicability.find((item) => item.key === val);
      return !applicability || applicability.applicable !== false;
    });
    return applicableValues;
  }
  async _verifyApplicability() {
    const ds = await getDataSource(this.state.datasource, {
      __sceneObject: wrapInSafeSerializableSceneObject(this)
    });
    if (!ds.getDrilldownsApplicability) {
      return;
    }
    const queries = getQueriesForVariables(this);
    const timeRange = sceneGraph.getTimeRange(this).state.value;
    const value = this.state.value;
    const response = await ds.getDrilldownsApplicability({
      groupByKeys: Array.isArray(value) ? value.map((v) => String(v)) : value ? [String(value)] : [],
      queries,
      timeRange,
      scopes: sceneGraph.getScopes(this),
      ...getEnrichedFiltersRequest(this)
    });
    if (!isEqual(response, this.state.keysApplicability)) {
      this.setState({ keysApplicability: response != null ? response : void 0 });
      this.publishEvent(new SceneVariableValueChangedEvent(this), true);
    }
  }
  // This method is related to the defaultValue property. We check if the current value
  // is different from the default value. If it is, the groupBy will show a button
  // allowing the user to restore the default values.
  checkIfRestorable(values) {
    var _a, _b, _c, _d;
    const originalValues = isArray((_a = this.state.defaultValue) == null ? void 0 : _a.value) ? (_b = this.state.defaultValue) == null ? void 0 : _b.value : ((_c = this.state.defaultValue) == null ? void 0 : _c.value) ? [(_d = this.state.defaultValue) == null ? void 0 : _d.value] : [];
    const vals = isArray(values) ? values : [values];
    if (vals.length !== originalValues.length) {
      return true;
    }
    return !isEqual(vals, originalValues);
  }
  restoreDefaultValues() {
    this.setState({ restorable: false });
    if (!this.state.defaultValue) {
      return;
    }
    this.changeValueTo(this.state.defaultValue.value, this.state.defaultValue.text, true);
  }
  /**
   * Allows clearing the value of the variable to an empty value. Overrides default behavior of a MultiValueVariable
   */
  getDefaultMultiState(options) {
    return { value: [], text: [] };
  }
}
GroupByVariable.Component = GroupByVariableRenderer;
function GroupByVariableRenderer({ model }) {
  const {
    value,
    text,
    key,
    isMulti = true,
    maxVisibleValues,
    noValueOnClear,
    options,
    includeAll,
    allowCustomValue = true,
    defaultValue,
    keysApplicability
  } = model.useState();
  const values = useMemo(() => {
    const arrayValue = isArray(value) ? value : [value];
    const arrayText = isArray(text) ? text : [text];
    return arrayValue.map((value2, idx) => {
      var _a;
      return {
        value: value2,
        label: String((_a = arrayText[idx]) != null ? _a : value2)
      };
    });
  }, [value, text]);
  const [isFetchingOptions, setIsFetchingOptions] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [uncommittedValue, setUncommittedValue] = useState(values);
  const optionSearcher = useMemo(() => getOptionSearcher(options, includeAll), [options, includeAll]);
  const hasDefaultValue = defaultValue !== void 0;
  useEffect(() => {
    setUncommittedValue(values);
  }, [values]);
  const onInputChange = (value2, { action }) => {
    if (action === "input-change") {
      setInputValue(value2);
      if (model.onSearchChange) {
        model.onSearchChange(value2);
      }
      return value2;
    }
    if (action === "input-blur") {
      setInputValue("");
      return "";
    }
    return inputValue;
  };
  const filteredOptions = useMemo(
    () => handleOptionGroups(optionSearcher(inputValue).map(toSelectableValue)),
    [optionSearcher, inputValue]
  );
  return isMulti ? /* @__PURE__ */ React.createElement(
    MultiSelect,
    {
      "aria-label": t(
        "grafana-scenes.variables.group-by-variable-renderer.aria-label-group-by-selector",
        "Group by selector"
      ),
      "data-testid": `GroupBySelect-${key}`,
      id: key,
      placeholder: t(
        "grafana-scenes.variables.group-by-variable-renderer.placeholder-group-by-label",
        "Group by label"
      ),
      width: "auto",
      allowCustomValue,
      inputValue,
      value: uncommittedValue,
      noMultiValueWrap: true,
      maxVisibleValues: maxVisibleValues != null ? maxVisibleValues : 5,
      tabSelectsValue: false,
      virtualized: true,
      options: filteredOptions,
      filterOption: filterNoOp,
      closeMenuOnSelect: false,
      isOpen: isOptionsOpen,
      isClearable: true,
      hideSelectedOptions: false,
      isLoading: isFetchingOptions,
      components: {
        Option: OptionWithCheckbox,
        ...hasDefaultValue ? {
          IndicatorsContainer: () => /* @__PURE__ */ React.createElement(DefaultGroupByCustomIndicatorContainer, { model })
        } : {},
        MultiValueContainer: ({ innerProps, children }) => /* @__PURE__ */ React.createElement(GroupByValueContainer, { innerProps, keysApplicability }, children)
      },
      onInputChange,
      onBlur: () => {
        model.changeValueTo(
          uncommittedValue.map((x) => x.value),
          uncommittedValue.map((x) => x.label),
          true
        );
        const restorable = model.checkIfRestorable(uncommittedValue.map((v) => v.value));
        if (restorable !== model.state.restorable) {
          model.setState({ restorable });
        }
        model._verifyApplicability();
      },
      onChange: (newValue, action) => {
        if (action.action === "clear" && noValueOnClear) {
          model.changeValueTo([], void 0, true);
        }
        setUncommittedValue(newValue);
      },
      onOpenMenu: async () => {
        const profiler = getInteractionTracker(model);
        profiler == null ? void 0 : profiler.startInteraction(GROUPBY_DIMENSIONS_INTERACTION);
        setIsFetchingOptions(true);
        await lastValueFrom(model.validateAndUpdate());
        setIsFetchingOptions(false);
        setIsOptionsOpen(true);
        profiler == null ? void 0 : profiler.stopInteraction();
      },
      onCloseMenu: () => {
        setIsOptionsOpen(false);
      }
    }
  ) : /* @__PURE__ */ React.createElement(
    Select,
    {
      "aria-label": t(
        "grafana-scenes.variables.group-by-variable-renderer.aria-label-group-by-selector",
        "Group by selector"
      ),
      "data-testid": `GroupBySelect-${key}`,
      id: key,
      placeholder: t(
        "grafana-scenes.variables.group-by-variable-renderer.placeholder-group-by-label",
        "Group by label"
      ),
      width: "auto",
      inputValue,
      value: uncommittedValue && uncommittedValue.length > 0 ? uncommittedValue : null,
      allowCustomValue,
      createOptionPosition: "first",
      noMultiValueWrap: true,
      maxVisibleValues: maxVisibleValues != null ? maxVisibleValues : 5,
      tabSelectsValue: false,
      virtualized: true,
      options: filteredOptions,
      filterOption: filterNoOp,
      closeMenuOnSelect: true,
      isOpen: isOptionsOpen,
      isClearable: true,
      hideSelectedOptions: false,
      noValueOnClear: true,
      isLoading: isFetchingOptions,
      onInputChange,
      onChange: (newValue, action) => {
        if (action.action === "clear") {
          setUncommittedValue([]);
          if (noValueOnClear) {
            model.changeValueTo([]);
          }
          return;
        }
        if (newValue == null ? void 0 : newValue.value) {
          setUncommittedValue([newValue]);
          model.changeValueTo([newValue.value], newValue.label ? [newValue.label] : void 0);
        }
      },
      onOpenMenu: async () => {
        const profiler = getInteractionTracker(model);
        profiler == null ? void 0 : profiler.startInteraction(GROUPBY_DIMENSIONS_INTERACTION);
        setIsFetchingOptions(true);
        await lastValueFrom(model.validateAndUpdate());
        setIsFetchingOptions(false);
        setIsOptionsOpen(true);
        profiler == null ? void 0 : profiler.stopInteraction();
      },
      onCloseMenu: () => {
        setIsOptionsOpen(false);
      }
    }
  );
}
const filterNoOp = () => true;
function toSelectableValue(input) {
  const { label, value, group } = input;
  const result = {
    label,
    value
  };
  if (group) {
    result.group = group;
  }
  return result;
}

export { GroupByVariable, GroupByVariableRenderer };
//# sourceMappingURL=GroupByVariable.js.map
