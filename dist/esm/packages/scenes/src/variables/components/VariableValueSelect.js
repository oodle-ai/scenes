import { t } from '@grafana/i18n';
import { isArray } from 'lodash';
import React, { useMemo, useState, useEffect } from 'react';
import { useTheme2, getSelectStyles, useStyles2, Checkbox, MultiSelect, Select, ToggleAllState } from '@grafana/ui';
import { selectors } from '@grafana/e2e-selectors';
import { css, cx } from '@emotion/css';
import { getOptionSearcher } from './getOptionSearcher.js';
import { ALL_VARIABLE_VALUE } from '../constants.js';
import { sceneGraph } from '../../core/sceneGraph/index.js';
import { VARIABLE_VALUE_CHANGED_INTERACTION } from '../../performance/interactionConstants.js';

const filterNoOp = () => true;
const filterAll = (v) => v.value !== "$__all";
const determineToggleAllState = (selectedValues, options) => {
  if (selectedValues.length === options.filter(filterAll).length) {
    return ToggleAllState.allSelected;
  } else if (selectedValues.length === 0 || selectedValues.length === 1 && selectedValues[0] && selectedValues[0].value === "$__all") {
    return ToggleAllState.noneSelected;
  } else {
    return ToggleAllState.indeterminate;
  }
};
function toSelectableValue(value, label) {
  return {
    value,
    label: label != null ? label : String(value)
  };
}
function VariableValueSelect({ model, state }) {
  const { value, text, key, options, includeAll, isReadOnly, allowCustomValue = true } = state;
  const [inputValue, setInputValue] = useState("");
  const [hasCustomValue, setHasCustomValue] = useState(false);
  const selectValue = toSelectableValue(value, String(text));
  const queryController = sceneGraph.getQueryController(model);
  const optionSearcher = useMemo(() => getOptionSearcher(options, includeAll), [options, includeAll]);
  const onInputChange = (value2, { action }) => {
    if (action === "input-change") {
      setInputValue(value2);
      if (model.onSearchChange) {
        model.onSearchChange(value2);
      }
      return value2;
    }
    return value2;
  };
  const filteredOptions = useMemo(() => {
    const results = optionSearcher(inputValue);
    if (hasCustomValue && value != null && value !== "" && value !== ALL_VARIABLE_VALUE) {
      const exists = results.some((o) => String(o.value) === String(value));
      if (!exists) {
        return [{ value, label: String(text) }, ...results];
      }
    }
    return results;
  }, [optionSearcher, inputValue, hasCustomValue, value, text]);
  const onOpenMenu = () => {
    if (hasCustomValue) {
      setInputValue(String(text));
    }
  };
  const onCloseMenu = () => {
    setInputValue("");
  };
  return /* @__PURE__ */ React.createElement(
    Select,
    {
      id: key,
      isValidNewOption: (inputValue2) => inputValue2.trim().length > 0,
      placeholder: t("grafana-scenes.variables.variable-value-select.placeholder-select-value", "Select value"),
      width: "auto",
      disabled: isReadOnly,
      value: selectValue,
      inputValue,
      allowCustomValue,
      virtualized: true,
      filterOption: filterNoOp,
      tabSelectsValue: false,
      onInputChange,
      onOpenMenu,
      onCloseMenu,
      options: filteredOptions,
      "data-testid": selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${value}`),
      onChange: (newValue) => {
        model.changeValueTo(newValue.value, newValue.label, true);
        queryController == null ? void 0 : queryController.startProfile(VARIABLE_VALUE_CHANGED_INTERACTION);
        if (hasCustomValue !== newValue.__isNew__) {
          setHasCustomValue(newValue.__isNew__);
        }
      }
    }
  );
}
function VariableValueSelectMulti({
  model,
  state
}) {
  const {
    value,
    options,
    key,
    maxVisibleValues,
    includeAll,
    isReadOnly,
    allowCustomValue = true
  } = state;
  const arrayValue = useMemo(() => isArray(value) ? value : [value], [value]);
  const [uncommittedValue, setUncommittedValue] = useState(arrayValue);
  const [inputValue, setInputValue] = useState("");
  const optionSearcher = useMemo(() => getOptionSearcher(options, includeAll), [options, includeAll]);
  useEffect(() => {
    setUncommittedValue(arrayValue);
  }, [arrayValue]);
  const onInputChange = (value2, { action }) => {
    if (action === "input-change") {
      if (value2.includes(",")) {
        const parts = value2.split(",").map((v) => v.trim()).filter(Boolean);
        if (parts.length > 1) {
          const newValues = [...uncommittedValue];
          for (const part of parts) {
            const match = options.find(
              (o) => {
                var _a;
                return String((_a = o.label) != null ? _a : o.value) === part || String(o.value) === part;
              }
            );
            const resolved = match ? match.value : part;
            if (!newValues.includes(resolved)) {
              newValues.push(resolved);
            }
          }
          setUncommittedValue(newValues);
          model.changeValueTo(newValues, void 0, true);
          setInputValue("");
          return "";
        }
      }
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
  const placeholder = options.length > 0 ? "Select value" : "";
  const filteredOptions = useMemo(
    () => optionSearcher(inputValue),
    [optionSearcher, inputValue]
  );
  const sortedOptions = useMemo(() => {
    const selectedSet = new Set(arrayValue.map(String));
    const optionValueSet = new Set(filteredOptions.map((o) => String(o.value)));
    const customOptions = arrayValue.filter((v) => v !== ALL_VARIABLE_VALUE && !optionValueSet.has(String(v))).map((v) => ({ value: v, label: String(v) }));
    const allOption = filteredOptions.filter(
      (o) => o.value === ALL_VARIABLE_VALUE
    );
    const selected = filteredOptions.filter(
      (o) => o.value !== ALL_VARIABLE_VALUE && selectedSet.has(String(o.value))
    );
    const unselected = filteredOptions.filter(
      (o) => o.value !== ALL_VARIABLE_VALUE && !selectedSet.has(String(o.value))
    );
    return [...allOption, ...customOptions, ...selected, ...unselected];
  }, [filteredOptions, arrayValue]);
  return /* @__PURE__ */ React.createElement(
    MultiSelect,
    {
      id: key,
      placeholder,
      width: "auto",
      inputValue,
      disabled: isReadOnly,
      value: uncommittedValue,
      noMultiValueWrap: true,
      maxVisibleValues: maxVisibleValues != null ? maxVisibleValues : 5,
      tabSelectsValue: false,
      virtualized: true,
      allowCustomValue,
      toggleAllOptions: {
        enabled: true,
        optionsFilter: filterAll,
        determineToggleAllState
      },
      options: sortedOptions,
      closeMenuOnSelect: false,
      components: { Option: OptionWithCheckbox },
      isClearable: true,
      hideSelectedOptions: false,
      onInputChange,
      onBlur: () => {
        model.changeValueTo(uncommittedValue, void 0, true);
      },
      filterOption: filterNoOp,
      "data-testid": selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${uncommittedValue}`),
      onChange: (newValue, action) => {
        if (action.action === "clear") {
          model.changeValueTo(["$__all"]);
        }
        setUncommittedValue(newValue.map((x) => x.value));
      }
    }
  );
}
const OptionWithCheckbox = ({
  children,
  data,
  innerProps,
  innerRef,
  isFocused,
  isSelected,
  indeterminate,
  renderOptionLabel
}) => {
  var _a;
  const { onMouseMove, onMouseOver, ...rest } = innerProps;
  const theme = useTheme2();
  const selectStyles = getSelectStyles(theme);
  const optionStyles = useStyles2(getOptionStyles);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: innerRef,
      className: cx(selectStyles.option, isFocused && selectStyles.optionFocused),
      ...rest,
      "data-testid": "data-testid Select option",
      title: data.title
    },
    /* @__PURE__ */ React.createElement("div", { className: optionStyles.checkbox }, /* @__PURE__ */ React.createElement(Checkbox, { indeterminate, value: isSelected })),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: selectStyles.optionBody,
        "data-testid": selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts(
          (_a = data.label) != null ? _a : String(data.value)
        )
      },
      /* @__PURE__ */ React.createElement("span", null, children)
    )
  );
};
OptionWithCheckbox.displayName = "SelectMenuOptions";
const getOptionStyles = (theme) => ({
  checkbox: css({
    marginRight: theme.spacing(2)
  })
});
function MultiOrSingleValueSelect({ model }) {
  const state = model.useState();
  if (state.isMulti) {
    return /* @__PURE__ */ React.createElement(VariableValueSelectMulti, { model, state });
  } else {
    return /* @__PURE__ */ React.createElement(VariableValueSelect, { model, state });
  }
}

export { MultiOrSingleValueSelect, OptionWithCheckbox, VariableValueSelect, VariableValueSelectMulti, toSelectableValue };
//# sourceMappingURL=VariableValueSelect.js.map
