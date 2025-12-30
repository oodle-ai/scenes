import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2, Icon, Button } from '@grafana/ui';
import { t } from '@grafana/i18n';
import React, { memo, useState, useRef, useEffect } from 'react';
import { useMeasure } from 'react-use';
import { AdHocFilterPill } from './AdHocFilterPill.js';
import { AdHocFiltersAlwaysWipCombobox } from './AdHocFiltersAlwaysWipCombobox.js';

const MAX_VISIBLE_FILTERS = 5;
const AdHocFiltersComboboxRenderer = memo(function AdHocFiltersComboboxRenderer2({ controller }) {
  var _a;
  const { originFilters, filters, readOnly, collapsible, valueRecommendations } = controller.useState();
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const [collapsed, setCollapsed] = useState(true);
  const [wrapperRef, { height: wrapperHeight }] = useMeasure();
  const clearAll = () => {
    var _a2;
    (_a2 = controller.clearAll) == null ? void 0 : _a2.call(controller);
  };
  const focusOnWipInputRef = useRef();
  const singleLineThreshold = theme.spacing.gridSize * 5;
  const isMultiLine = collapsible && wrapperHeight > singleLineThreshold;
  const handleCollapseToggle = (event) => {
    event.stopPropagation();
    if (collapsible) {
      setCollapsed(true);
    }
  };
  const handleExpand = () => {
    var _a2, _b;
    if (!collapsible) {
      (_a2 = focusOnWipInputRef.current) == null ? void 0 : _a2.call(focusOnWipInputRef);
      return;
    }
    if (collapsed) {
      setCollapsed(false);
    } else {
      (_b = focusOnWipInputRef.current) == null ? void 0 : _b.call(focusOnWipInputRef);
    }
  };
  const visibleOriginFilters = (_a = originFilters == null ? void 0 : originFilters.filter((f) => f.origin)) != null ? _a : [];
  const visibleFilters = filters.filter((f) => !f.hidden);
  const allFilters = [...visibleOriginFilters, ...visibleFilters];
  const totalFiltersCount = allFilters.length;
  const shouldCollapse = collapsible && collapsed && totalFiltersCount > 0;
  const filtersToRender = shouldCollapse ? allFilters.slice(0, MAX_VISIBLE_FILTERS) : allFilters;
  useEffect(() => {
    if (collapsible && totalFiltersCount === 0 && collapsed) {
      setCollapsed(false);
    }
  }, [collapsible, totalFiltersCount, collapsed]);
  const showCollapseButton = collapsible && isMultiLine && !collapsed;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: wrapperRef,
      className: cx(styles.comboboxWrapper, {
        [styles.comboboxFocusOutline]: !readOnly,
        [styles.collapsed]: shouldCollapse,
        [styles.clickableCollapsed]: shouldCollapse
      }),
      onClick: handleExpand
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "filter", className: styles.filterIcon, size: "lg" }),
    valueRecommendations && /* @__PURE__ */ React.createElement(valueRecommendations.Component, { model: valueRecommendations }),
    filtersToRender.map((filter, index) => /* @__PURE__ */ React.createElement(
      AdHocFilterPill,
      {
        key: `${filter.origin ? "origin-" : ""}${index}-${filter.key}`,
        filter,
        controller,
        readOnly: readOnly || filter.readOnly,
        focusOnWipInputRef: focusOnWipInputRef.current
      }
    )),
    !readOnly && !shouldCollapse ? /* @__PURE__ */ React.createElement(AdHocFiltersAlwaysWipCombobox, { controller, ref: focusOnWipInputRef }) : null,
    /* @__PURE__ */ React.createElement("div", { className: styles.rightControls }, showCollapseButton && /* @__PURE__ */ React.createElement(
      Button,
      {
        className: styles.collapseButton,
        fill: "text",
        onClick: handleCollapseToggle,
        "aria-label": t(
          "grafana-scenes.variables.adhoc-filters-combobox-renderer.collapse-filters",
          "Collapse filters"
        ),
        "aria-expanded": !collapsed
      },
      t("grafana-scenes.variables.adhoc-filters-combobox-renderer.collapse", "Collapse"),
      /* @__PURE__ */ React.createElement(Icon, { name: "angle-up", size: "md" })
    ), /* @__PURE__ */ React.createElement("div", { className: styles.clearAllButton }, /* @__PURE__ */ React.createElement(Icon, { name: "times", size: "md", onClick: clearAll })), shouldCollapse && /* @__PURE__ */ React.createElement(React.Fragment, null, totalFiltersCount > MAX_VISIBLE_FILTERS && /* @__PURE__ */ React.createElement("span", { className: styles.moreIndicator }, "(+", totalFiltersCount - MAX_VISIBLE_FILTERS, ")"), /* @__PURE__ */ React.createElement(Icon, { name: "angle-down", className: styles.dropdownIndicator })))
  );
});
const getStyles = (theme) => ({
  comboboxWrapper: css({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: theme.spacing(1),
    rowGap: theme.spacing(0.5),
    minHeight: theme.spacing(4),
    backgroundColor: theme.components.input.background,
    border: `1px solid ${theme.colors.border.strong}`,
    borderRadius: theme.shape.radius.default,
    paddingInline: theme.spacing(1),
    paddingBlock: theme.spacing(0.5),
    flexGrow: 1,
    width: "100%"
  }),
  comboboxFocusOutline: css({
    "&:focus-within": {
      outline: "2px dotted transparent",
      outlineOffset: "2px",
      boxShadow: `0 0 0 2px ${theme.colors.background.canvas}, 0 0 0px 4px ${theme.colors.primary.main}`,
      transitionTimingFunction: `cubic-bezier(0.19, 1, 0.22, 1)`,
      transitionDuration: "0.2s",
      transitionProperty: "outline, outline-offset, box-shadow",
      zIndex: 2
    }
  }),
  filterIcon: css({
    color: theme.colors.text.secondary,
    alignSelf: "center"
  }),
  collapsed: css({
    flexWrap: "nowrap",
    overflow: "hidden"
  }),
  clickableCollapsed: css({
    cursor: "pointer",
    "&:hover": {
      borderColor: theme.colors.border.medium
    }
  }),
  rightControls: css({
    display: "flex",
    alignItems: "center",
    marginLeft: "auto",
    flexShrink: 0
  }),
  moreIndicator: css({
    color: theme.colors.text.secondary,
    whiteSpace: "nowrap"
  }),
  dropdownIndicator: css({
    color: theme.colors.text.secondary,
    flexShrink: 0
  }),
  collapseButton: css({
    color: theme.colors.text.secondary,
    padding: 0,
    fontSize: theme.typography.bodySmall.fontSize,
    border: "none",
    "&:hover": {
      background: "transparent",
      color: theme.colors.text.primary
    }
  }),
  clearAllButton: css({
    fontSize: theme.typography.bodySmall.fontSize,
    cursor: "pointer",
    color: theme.colors.text.secondary,
    "&:hover": {
      color: theme.colors.text.primary
    }
  })
});

export { AdHocFiltersComboboxRenderer };
//# sourceMappingURL=AdHocFiltersComboboxRenderer.js.map
