import { css, cx } from '@emotion/css';
import { useStyles2, Tooltip, IconButton, Icon } from '@grafana/ui';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AdHocCombobox } from './AdHocFiltersCombobox.js';
import { isMatchAllFilter } from '../AdHocFiltersVariable.js';
import { t } from '@grafana/i18n';
import { getNonApplicablePillStyles } from '../../utils.js';
import { CopyValueButton } from '../../components/CopyValueButton.js';

const LABEL_MAX_VISIBLE_LENGTH = 20;
function AdHocFilterPill({ filter, controller, readOnly, focusOnWipInputRef }) {
  var _a, _b, _c, _d;
  const styles = useStyles2(getStyles);
  const [viewMode, setViewMode] = useState(true);
  const [shouldFocusOnPillWrapper, setShouldFocusOnPillWrapper] = useState(false);
  const pillWrapperRef = useRef(null);
  const [populateInputOnEdit, setPopulateInputOnEdit] = useState(false);
  const keyLabel = (_a = filter.keyLabel) != null ? _a : filter.key;
  const valueLabel = ((_b = filter.valueLabels) == null ? void 0 : _b.join(", ")) || ((_c = filter.values) == null ? void 0 : _c.join(", ")) || filter.value;
  const handleChangeViewMode = useCallback(
    (event, shouldFocusOnPillWrapperOverride) => {
      event == null ? void 0 : event.stopPropagation();
      if (readOnly) {
        return;
      }
      setShouldFocusOnPillWrapper(shouldFocusOnPillWrapperOverride != null ? shouldFocusOnPillWrapperOverride : !viewMode);
      setViewMode(!viewMode);
    },
    [readOnly, viewMode]
  );
  useEffect(() => {
    var _a2;
    if (shouldFocusOnPillWrapper) {
      (_a2 = pillWrapperRef.current) == null ? void 0 : _a2.focus();
      setShouldFocusOnPillWrapper(false);
    }
  }, [shouldFocusOnPillWrapper]);
  useEffect(() => {
    if (filter.forceEdit && viewMode) {
      setViewMode(false);
      controller.updateFilter(filter, { forceEdit: void 0 });
    }
  }, [filter, controller, viewMode]);
  useEffect(() => {
    if (viewMode) {
      setPopulateInputOnEdit((prevValue) => prevValue ? false : prevValue);
    }
  }, [viewMode]);
  const getOriginFilterTooltips = (origin) => {
    if (origin === "dashboard") {
      return {
        info: "Applied by default in this dashboard. If edited, it carries over to other dashboards.",
        restore: "Restore the value set by this dashboard."
      };
    } else if (origin === "scope") {
      return {
        info: "Applied automatically from your selected scope.",
        restore: "Restore the value set by your selected scope."
      };
    } else {
      return {
        info: `This is a ${origin} injected filter.`,
        restore: `Restore filter to its original value.`
      };
    }
  };
  const cleanFilter = !filter.restorable && !filter.readOnly && !filter.nonApplicable;
  if (viewMode) {
    const pillTextContent = `${keyLabel} ${filter.operator} ${valueLabel}`;
    const pillText = /* @__PURE__ */ React.createElement("span", { className: cx(styles.pillText, filter.nonApplicable && styles.strikethrough) }, pillTextContent);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: cx(
          styles.combinedFilterPill,
          readOnly && styles.readOnlyCombinedFilter,
          (isMatchAllFilter(filter) || filter.nonApplicable) && styles.disabledPill,
          filter.readOnly && styles.filterReadOnly
        ),
        onClick: (e) => {
          e.stopPropagation();
          setPopulateInputOnEdit(true);
          handleChangeViewMode();
        },
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            setPopulateInputOnEdit(true);
            handleChangeViewMode();
          }
        },
        role: readOnly ? void 0 : "button",
        "aria-label": t(
          "grafana-scenes.components.adhoc-filter-pill.edit-filter-with-key",
          "Edit filter with key {{keyLabel}}",
          {
            keyLabel
          }
        ),
        tabIndex: 0,
        ref: pillWrapperRef
      },
      pillTextContent.length < LABEL_MAX_VISIBLE_LENGTH ? pillText : /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement("div", { className: styles.tooltipText }, pillTextContent), placement: "top" }, pillText),
      !readOnly && !filter.matchAllFilter && /* @__PURE__ */ React.createElement(CopyValueButton, { text: pillTextContent, className: styles.pillIcon }),
      !readOnly && !filter.matchAllFilter && (!filter.origin || filter.origin === "dashboard") ? /* @__PURE__ */ React.createElement(
        IconButton,
        {
          onClick: (e) => {
            e.stopPropagation();
            if (filter.origin && filter.origin === "dashboard") {
              controller.updateToMatchAll(filter);
            } else {
              controller.removeFilter(filter);
            }
            setTimeout(() => focusOnWipInputRef == null ? void 0 : focusOnWipInputRef());
          },
          onKeyDownCapture: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              if (filter.origin && filter.origin === "dashboard") {
                controller.updateToMatchAll(filter);
              } else {
                controller.removeFilter(filter);
              }
              setTimeout(() => focusOnWipInputRef == null ? void 0 : focusOnWipInputRef());
            }
          },
          name: "times",
          size: "md",
          className: cx(styles.pillIcon, filter.nonApplicable && styles.disabledPillIcon),
          tooltip: t(
            "grafana-scenes.components.adhoc-filter-pill.remove-filter-with-key",
            "Remove filter with key {{keyLabel}}",
            {
              keyLabel
            }
          )
        }
      ) : null,
      filter.origin && filter.readOnly && /* @__PURE__ */ React.createElement(
        Tooltip,
        {
          content: t("grafana-scenes.components.adhoc-filter-pill.managed-filter", "{{origin}} managed filter", {
            origin: filter.origin
          }),
          placement: "bottom"
        },
        /* @__PURE__ */ React.createElement(Icon, { name: "lock", size: "md", className: styles.readOnlyPillIcon })
      ),
      filter.origin && cleanFilter && /* @__PURE__ */ React.createElement(Tooltip, { content: getOriginFilterTooltips(filter.origin).info, placement: "bottom" }, /* @__PURE__ */ React.createElement(Icon, { name: "info-circle", size: "md", className: styles.infoPillIcon })),
      filter.origin && filter.restorable && !filter.readOnly && /* @__PURE__ */ React.createElement(
        IconButton,
        {
          onClick: (e) => {
            e.stopPropagation();
            controller.restoreOriginalFilter(filter);
          },
          onKeyDownCapture: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              controller.restoreOriginalFilter(filter);
            }
          },
          name: "history",
          size: "md",
          className: isMatchAllFilter(filter) ? styles.matchAllPillIcon : styles.pillIcon,
          tooltip: getOriginFilterTooltips(filter.origin).restore
        }
      ),
      filter.nonApplicable && /* @__PURE__ */ React.createElement(
        Tooltip,
        {
          content: (_d = filter.nonApplicableReason) != null ? _d : t("grafana-scenes.components.adhoc-filter-pill.non-applicable", "Filter is not applicable"),
          placement: "bottom"
        },
        /* @__PURE__ */ React.createElement(Icon, { name: "info-circle", size: "md", className: styles.infoPillIcon })
      )
    );
  }
  return /* @__PURE__ */ React.createElement(
    AdHocCombobox,
    {
      filter,
      controller,
      handleChangeViewMode,
      focusOnWipInputRef,
      populateInputOnEdit
    }
  );
}
const getStyles = (theme) => ({
  combinedFilterPill: css({
    display: "flex",
    alignItems: "center",
    background: theme.colors.action.selected,
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.weak}`,
    padding: theme.spacing(0.125, 0, 0.125, 1),
    color: theme.colors.text.primary,
    overflow: "hidden",
    whiteSpace: "nowrap",
    minHeight: theme.spacing(2.75),
    ...theme.typography.bodySmall,
    fontWeight: theme.typography.fontWeightBold,
    cursor: "pointer",
    "&:hover": {
      background: theme.colors.action.hover
    }
  }),
  readOnlyCombinedFilter: css({
    paddingRight: theme.spacing(1),
    cursor: "text",
    "&:hover": {
      background: theme.colors.action.selected
    }
  }),
  filterReadOnly: css({
    background: theme.colors.background.canvas,
    cursor: "text",
    "&:hover": {
      background: theme.colors.background.canvas
    }
  }),
  pillIcon: css({
    marginInline: theme.spacing(0.5),
    cursor: "pointer",
    "&:hover": {
      color: theme.colors.text.primary
    }
  }),
  pillText: css({
    maxWidth: "200px",
    width: "100%",
    textOverflow: "ellipsis",
    overflow: "hidden"
  }),
  tooltipText: css({
    textAlign: "center"
  }),
  infoPillIcon: css({
    marginInline: theme.spacing(0.5),
    cursor: "pointer"
  }),
  readOnlyPillIcon: css({
    marginInline: theme.spacing(0.5)
  }),
  matchAllPillIcon: css({
    marginInline: theme.spacing(0.5),
    cursor: "pointer",
    color: theme.colors.text.disabled
  }),
  disabledPillIcon: css({
    marginInline: theme.spacing(0.5),
    cursor: "pointer",
    color: theme.colors.text.disabled,
    "&:hover": {
      color: theme.colors.text.disabled
    }
  }),
  ...getNonApplicablePillStyles(theme)
});

export { AdHocFilterPill };
//# sourceMappingURL=AdHocFilterPill.js.map
