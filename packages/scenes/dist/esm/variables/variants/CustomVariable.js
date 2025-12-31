import { of } from 'rxjs';
import { VariableDependencyConfig } from '../VariableDependencyConfig.js';
import { MultiOrSingleValueSelect } from '../components/VariableValueSelect.js';
import { MultiValueVariable } from './MultiValueVariable.js';
import { sceneGraph } from '../../core/sceneGraph/index.js';
import React from 'react';

class CustomVariable extends MultiValueVariable {
  constructor(initialState) {
    super({
      type: "custom",
      query: "",
      value: "",
      text: "",
      options: [],
      name: "",
      ...initialState
    });
    this._variableDependency = new VariableDependencyConfig(this, {
      statePaths: ["query"]
    });
  }
  // We expose this publicly as we also need it outside the variable
  // The interpolate flag is needed since we don't always want to get the interpolated options
  transformCsvStringToOptions(str, interpolate = true) {
    var _a;
    str = interpolate ? sceneGraph.interpolate(this, str) : str;
    const match = (_a = str.match(/(?:\\,|[^,])+/g)) != null ? _a : [];
    return match.map((text) => {
      var _a2;
      text = text.replace(/\\,/g, ",");
      const textMatch = (_a2 = /^\s*(.+)\s:\s(.+)$/g.exec(text)) != null ? _a2 : [];
      if (textMatch.length === 3) {
        const [, key, value] = textMatch;
        return { label: key.trim(), value: value.trim() };
      } else {
        return { label: text.trim(), value: text.trim() };
      }
    });
  }
  getValueOptions(args) {
    const options = this.transformCsvStringToOptions(this.state.query);
    if (!options.length) {
      this.skipNextValidation = true;
    }
    return of(options);
  }
}
CustomVariable.Component = ({ model }) => {
  return /* @__PURE__ */ React.createElement(MultiOrSingleValueSelect, { model });
};

export { CustomVariable };
//# sourceMappingURL=CustomVariable.js.map
