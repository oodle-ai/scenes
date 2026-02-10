import { t } from '@grafana/i18n';
import { isArray } from 'lodash';
import React, { RefCallback, useEffect, useMemo, useState } from 'react';
import {
  Checkbox,
  InputActionMeta,
  MultiSelect,
  Select,
  ToggleAllState,
  getSelectStyles,
  useStyles2,
  useTheme2,
} from '@grafana/ui';

import { MultiValueVariable, MultiValueVariableState } from '../variants/MultiValueVariable';
import { VariableValue, VariableValueSingle } from '../types';
import { selectors } from '@grafana/e2e-selectors';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { getOptionSearcher } from './getOptionSearcher';
import { ALL_VARIABLE_VALUE } from '../constants';
import { sceneGraph } from '../../core/sceneGraph';
import { VARIABLE_VALUE_CHANGED_INTERACTION } from '../../performance/interactionConstants';
import { CopyValueButton } from './CopyValueButton';

const filterNoOp = () => true;

const filterAll = (v: SelectableValue<VariableValueSingle>) => v.value !== '$__all';

const determineToggleAllState = (
  selectedValues: Array<SelectableValue<VariableValueSingle>>,
  options: Array<SelectableValue<VariableValueSingle>>
) => {
  if (selectedValues.length === options.filter(filterAll).length) {
    return ToggleAllState.allSelected;
  } else if (
    selectedValues.length === 0 ||
    (selectedValues.length === 1 && selectedValues[0] && selectedValues[0].value === '$__all')
  ) {
    return ToggleAllState.noneSelected;
  } else {
    return ToggleAllState.indeterminate;
  }
};

export function toSelectableValue<T>(value: T, label?: string): SelectableValue<T> {
  return {
    value,
    label: label ?? String(value),
  };
}

export function VariableValueSelect({ model, state }: { model: MultiValueVariable; state: MultiValueVariableState }) {
  const { value, text, key, options, includeAll, isReadOnly, allowCustomValue = true } = state;
  const [inputValue, setInputValue] = useState('');
  const [hasCustomValue, setHasCustomValue] = useState(false);
  const selectValue = toSelectableValue(value, String(text));
  const queryController = sceneGraph.getQueryController(model);
  const optionSearcher = useMemo(() => getOptionSearcher(options, includeAll), [options, includeAll]);

  const onInputChange = (value: string, { action }: InputActionMeta) => {
    if (action === 'input-change') {
      setInputValue(value);
      if (model.onSearchChange) {
        model.onSearchChange!(value);
      }
      return value;
    }

    return value;
  };

  const filteredOptions = useMemo(() => {
    const results = optionSearcher(inputValue);
    // If the current value is a custom value not in the options, add it at the top
    if (hasCustomValue && value != null && value !== '' && value !== ALL_VARIABLE_VALUE) {
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
    setInputValue('');
  };

  const copyText = String(text ?? value ?? '');
  const singleValueComponent = useMemo(
    () =>
      function SingleValueWithCopy(props: {
        data: SelectableValue<VariableValue>;
        children: React.ReactNode;
        innerProps?: Record<string, unknown>;
      }) {
        const theme = useTheme2();
        const selectStyles = getSelectStyles(theme);
        const valueText = String(props.data?.label ?? props.data?.value ?? copyText);
        return (
          <div
            className={selectStyles.singleValue}
            {...(props.innerProps ?? {})}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              overflow: 'visible',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{props.children}</span>
            <CopyValueButton text={valueText} />
          </div>
        );
      },
    [copyText]
  );

  return (
    <Select<VariableValue>
      id={key}
      isValidNewOption={(inputValue) => inputValue.trim().length > 0}
      placeholder={t('grafana-scenes.variables.variable-value-select.placeholder-select-value', 'Select value')}
      width="auto"
      disabled={isReadOnly}
      value={selectValue}
      inputValue={inputValue}
      allowCustomValue={allowCustomValue}
      virtualized
      filterOption={filterNoOp}
      tabSelectsValue={false}
      onInputChange={onInputChange}
      onOpenMenu={onOpenMenu}
      onCloseMenu={onCloseMenu}
      options={filteredOptions}
      components={{ SingleValue: singleValueComponent }}
      data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${value}`)}
      onChange={(newValue) => {
        model.changeValueTo(newValue.value!, newValue.label!, true);
        queryController?.startProfile(VARIABLE_VALUE_CHANGED_INTERACTION);

        if (hasCustomValue !== newValue.__isNew__) {
          setHasCustomValue(newValue.__isNew__);
        }
      }}
    />
  );
}

export function VariableValueSelectMulti({
  model,
  state,
}: {
  model: MultiValueVariable;
  state: MultiValueVariableState;
}) {
  const {
    value,
    options,
    key,
    maxVisibleValues,
    includeAll,
    isReadOnly,
    allowCustomValue = true,
  } = state;
  const arrayValue = useMemo(() => (isArray(value) ? value : [value]), [value]);
  // To not trigger queries on every selection we store this state locally here and only update the variable onBlur
  const [uncommittedValue, setUncommittedValue] = useState(arrayValue);
  const [inputValue, setInputValue] = useState('');

  const optionSearcher = useMemo(() => getOptionSearcher(options, includeAll), [options, includeAll]);

  // Detect value changes outside
  useEffect(() => {
    setUncommittedValue(arrayValue);
  }, [arrayValue]);

  const onInputChange = (value: string, { action }: InputActionMeta) => {
    if (action === 'input-change') {
      // Handle pasted comma-separated values: split into individual selections
      if (value.includes(',')) {
        const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
        if (parts.length > 1) {
          const newValues = [...uncommittedValue];
          for (const part of parts) {
            const match = options.find(
              (o) => String(o.label ?? o.value) === part || String(o.value) === part
            );
            const resolved = (match ? match.value! : part) as VariableValueSingle;
            if (!newValues.includes(resolved)) {
              newValues.push(resolved);
            }
          }
          setUncommittedValue(newValues);
          model.changeValueTo(newValues, undefined, true);
          setInputValue('');
          return '';
        }
      }

      setInputValue(value);
      if (model.onSearchChange) {
        model.onSearchChange!(value);
      }
      return value;
    }

    if (action === 'input-blur') {
      setInputValue('');
      return '';
    }

    return inputValue;
  };

  const placeholder = options.length > 0 ? 'Select value' : '';
  const filteredOptions = optionSearcher(inputValue);

  const sortedOptions = useMemo(() => {
    const selectedSet = new Set(arrayValue.map(String));
    const optionValueSet = new Set(filteredOptions.map((o) => String(o.value)));

    // Include custom values (selected values not present in the fetched options) at the top
    const customOptions = arrayValue
      .filter((v) => v !== ALL_VARIABLE_VALUE && !optionValueSet.has(String(v)))
      .map((v) => ({ value: v, label: String(v) }));

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

  const copyText = useMemo(() => {
    const textVal = state.text;
    if (isArray(textVal)) {
      return textVal.map((t) => String(t)).filter((t) => t !== 'All').join(', ');
    }
    return String(textVal ?? '');
  }, [state.text]);

  const wrapperStyles = useStyles2(getMultiSelectWrapperStyles);

  return (
    <div className={wrapperStyles.wrapper}>
      <MultiSelect<VariableValueSingle>
        id={key}
        placeholder={placeholder}
        width="auto"
        inputValue={inputValue}
        disabled={isReadOnly}
        value={uncommittedValue}
        noMultiValueWrap={true}
        maxVisibleValues={maxVisibleValues ?? 5}
        tabSelectsValue={false}
        virtualized
        allowCustomValue={allowCustomValue}
        //@ts-ignore
        toggleAllOptions={{
          enabled: true,
          optionsFilter: filterAll,
          determineToggleAllState: determineToggleAllState,
        }}
        options={sortedOptions}
        closeMenuOnSelect={false}
        components={{ Option: OptionWithCheckbox }}
        isClearable={true}
        hideSelectedOptions={false}
        onInputChange={onInputChange}
        onBlur={() => {
          model.changeValueTo(uncommittedValue, undefined, true);
        }}
        filterOption={filterNoOp}
        data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${uncommittedValue}`)}
        onChange={(newValue, action) => {
          if (action.action === 'clear') {
            model.changeValueTo(['$__all']);
          }
          setUncommittedValue(newValue.map((x) => x.value!));
        }}
      />
      <CopyValueButton text={copyText} className={wrapperStyles.copyButton} />
    </div>
  );
}

interface SelectMenuOptionProps<T> {
  isDisabled: boolean;
  isFocused: boolean;
  isSelected: boolean;
  innerProps: JSX.IntrinsicElements['div'];
  innerRef: RefCallback<HTMLDivElement>;
  renderOptionLabel?: (value: SelectableValue<T>) => JSX.Element;
  data: SelectableValue<T>;
  indeterminate: boolean;
}

export const OptionWithCheckbox = ({
  children,
  data,
  innerProps,
  innerRef,
  isFocused,
  isSelected,
  indeterminate,
  renderOptionLabel,
}: React.PropsWithChildren<SelectMenuOptionProps<unknown>>) => {
  // We are removing onMouseMove and onMouseOver from innerProps because they cause the whole
  // list to re-render everytime the user hovers over an option. This is a performance issue.
  // See https://github.com/JedWatson/react-select/issues/3128#issuecomment-451936743
  const { onMouseMove, onMouseOver, ...rest } = innerProps;
  const theme = useTheme2();
  const selectStyles = getSelectStyles(theme);
  const optionStyles = useStyles2(getOptionStyles);

  return (
    <div
      ref={innerRef}
      className={cx(selectStyles.option, isFocused && selectStyles.optionFocused)}
      {...rest}
      // TODO: use below selector once we update grafana dependencies to ^11.1.0
      // data-testid={selectors.components.Select.option}
      data-testid="data-testid Select option"
      title={data.title}
    >
      <div className={optionStyles.checkbox}>
        <Checkbox indeterminate={indeterminate} value={isSelected} />
      </div>
      <div
        className={selectStyles.optionBody}
        data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts(
          data.label ?? String(data.value)
        )}
      >
        <span>{children}</span>
      </div>
    </div>
  );
};

OptionWithCheckbox.displayName = 'SelectMenuOptions';

const getOptionStyles = (theme: GrafanaTheme2) => ({
  checkbox: css({
    marginRight: theme.spacing(2),
  }),
});

const getMultiSelectWrapperStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    display: 'flex',
    alignItems: 'stretch',
    // Remove right border-radius from the Select so the copy button merges visually
    '& > :first-child': {
      '& > div': {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderRight: 'none',
      },
    },
  }),
  copyButton: css({
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${theme.spacing(0.75)}`,
    margin: 0,
    background: theme.components.input.background,
    border: `1px solid ${theme.components.input.borderColor}`,
    borderLeft: 'none',
    borderRadius: `0 ${theme.shape.radius.default} ${theme.shape.radius.default} 0`,
    cursor: 'pointer',
    color: theme.colors.text.secondary,
    '&:hover': {
      color: theme.colors.text.primary,
      background: theme.components.input.background,
    },
  }),
});

export function MultiOrSingleValueSelect({ model }: { model: MultiValueVariable }) {
  const state = model.useState();

  if (state.isMulti) {
    return <VariableValueSelectMulti model={model} state={state} />;
  } else {
    return <VariableValueSelect model={model} state={state} />;
  }
}
