import React from 'react';
import { sceneGraph, ControlsLabel } from '@grafana/scenes';
import { useSceneContext } from '../hooks/hooks.js';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { LoadingState } from '@grafana/data';

function DataLayerControl({ name }) {
  var _a, _b, _c;
  const scene = useSceneContext();
  const styles = useStyles2(getStyles);
  const layerSets = sceneGraph.getDataLayers(scene);
  const layer = getLayer(layerSets, name);
  const isLoading = Boolean(layer && ((_a = layer.state.data) == null ? void 0 : _a.state) === LoadingState.Loading);
  if (!layer) {
    return /* @__PURE__ */ React.createElement("div", null, "Annotation ", name, " not found");
  }
  return /* @__PURE__ */ React.createElement("div", { className: styles.container }, /* @__PURE__ */ React.createElement(
    ControlsLabel,
    {
      htmlFor: `data-layer-${layer.state.key}`,
      isLoading,
      onCancel: () => {
        var _a2;
        return (_a2 = layer.cancelQuery) == null ? void 0 : _a2.call(layer);
      },
      label: layer.state.name,
      description: layer.state.description,
      error: (_c = (_b = layer.state.data) == null ? void 0 : _b.errors) == null ? void 0 : _c[0].message
    }
  ), /* @__PURE__ */ React.createElement(layer.Component, { model: layer }));
}
const getStyles = () => ({
  container: css({
    display: "flex"
  })
});
function getLayer(layers, name) {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i].state.layers.find((layer2) => layer2.state.name === name);
    if (layer) {
      return layer;
    }
  }
  return void 0;
}

export { DataLayerControl };
//# sourceMappingURL=DataLayerControl.js.map
