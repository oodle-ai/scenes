import React, { forwardRef, useLayoutEffect } from 'react';
import { AdHocCombobox } from './AdHocFiltersCombobox.js';

const AdHocFiltersAlwaysWipCombobox = forwardRef(function AdHocFiltersAlwaysWipCombobox2({ controller, onInputClick }, parentRef) {
  const { wip } = controller.useState();
  useLayoutEffect(() => {
    if (!wip) {
      controller.addWip();
    }
  }, [wip]);
  return /* @__PURE__ */ React.createElement(AdHocCombobox, { controller, filter: wip, isAlwaysWip: true, ref: parentRef, onInputClick });
});

export { AdHocFiltersAlwaysWipCombobox };
//# sourceMappingURL=AdHocFiltersAlwaysWipCombobox.js.map
