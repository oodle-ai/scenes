import React from 'react';
import { EmbeddedScene } from '@grafana/scenes';
import { SceneContext } from '../contexts/SceneContextProvider.js';
import { SceneContextObject } from '../contexts/SceneContextObject.js';

class EmbeddedSceneWithContext extends EmbeddedScene {
  constructor(state) {
    super({ ...state, context: new SceneContextObject() });
  }
}
EmbeddedSceneWithContext.Component = ({ model }) => {
  return /* @__PURE__ */ React.createElement(SceneContext.Provider, { value: model.state.context }, /* @__PURE__ */ React.createElement(EmbeddedScene.Component, { model }));
};

export { EmbeddedSceneWithContext };
//# sourceMappingURL=EmbeddedSceneWithContext.js.map
