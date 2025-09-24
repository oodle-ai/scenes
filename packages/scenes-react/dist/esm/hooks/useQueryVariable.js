import { sceneGraph, QueryVariable } from '@grafana/scenes';
import { useSceneContext } from './hooks.js';
import { useEffect } from 'react';
import { isEqual } from 'lodash';

function useQueryVariable(options) {
  const scene = useSceneContext();
  let variable = sceneGraph.lookupVariable(options.name, scene);
  if (!variable) {
    variable = new QueryVariable({
      name: options.name,
      datasource: { uid: options.datasource },
      query: options.query,
      regex: options.regex
    });
  }
  if (!(variable instanceof QueryVariable)) {
    variable = null;
  }
  useEffect(() => {
    if (variable) {
      scene.addVariable(variable);
    }
  }, [variable, scene]);
  useEffect(() => {
    var _a;
    if (((_a = variable == null ? void 0 : variable.state.datasource) == null ? void 0 : _a.uid) !== options.datasource || !isEqual(variable == null ? void 0 : variable.state.query, options.query) || (variable == null ? void 0 : variable.state.regex) !== options.regex) {
      variable == null ? void 0 : variable.setState({ datasource: { uid: options.datasource }, query: options.query, regex: options.regex });
      variable == null ? void 0 : variable.refreshOptions();
    }
  }, [options, variable]);
  return variable;
}

export { useQueryVariable };
//# sourceMappingURL=useQueryVariable.js.map
