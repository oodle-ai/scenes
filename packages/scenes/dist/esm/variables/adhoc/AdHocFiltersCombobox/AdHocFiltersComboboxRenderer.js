import { css, cx } from '@emotion/css';
import { useStyles2, Icon } from '@grafana/ui';
import React, { memo, useRef } from 'react';
import { AdHocFilterPill } from './AdHocFilterPill.js';
import { AdHocFiltersAlwaysWipCombobox } from './AdHocFiltersAlwaysWipCombobox.js';

const AdHocFiltersComboboxRenderer = memo(function AdHocFiltersComboboxRenderer2({ controller }) {
  const { originFilters, filters, readOnly } = controller.useState();
  const styles = useStyles2(getStyles);
  const focusOnWipInputRef = useRef();
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: cx(styles.comboboxWrapper, { [styles.comboboxFocusOutline]: !readOnly }),
      onClick: () => {
        var _a;
        (_a = focusOnWipInputRef.current) == null ? void 0 : _a.call(focusOnWipInputRef);
      }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "filter", className: styles.filterIcon, size: "lg" }),
    originFilters == null ? void 0 : originFilters.map(
      (filter, index) => filter.origin ? /* @__PURE__ */ React.createElement(
        AdHocFilterPill,
        {
          key: `${index}-${filter.key}`,
          filter,
          controller,
          focusOnWipInputRef: focusOnWipInputRef.current
        }
      ) : null
    ),
    filters.filter((filter) => !filter.hidden).map((filter, index) => /* @__PURE__ */ React.createElement(
      AdHocFilterPill,
      {
        key: `${index}-${filter.key}`,
        filter,
        controller,
        readOnly: readOnly || filter.readOnly,
        focusOnWipInputRef: focusOnWipInputRef.current
      }
    )),
    !readOnly ? /* @__PURE__ */ React.createElement(AdHocFiltersAlwaysWipCombobox, { controller, ref: focusOnWipInputRef }) : null
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
    flexGrow: 1
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
  })
});

export { AdHocFiltersComboboxRenderer };
//# sourceMappingURL=AdHocFiltersComboboxRenderer.js.map
