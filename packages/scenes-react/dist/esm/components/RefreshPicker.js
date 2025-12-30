import React, { useId, useEffect } from 'react';
import { useSceneContext } from '../hooks/hooks.js';
import { SceneRefreshPicker } from '@grafana/scenes';
import { usePrevious } from 'react-use';

function RefreshPicker(props) {
  const scene = useSceneContext();
  const key = useId();
  const prevProps = usePrevious(props);
  let picker = scene.findByKey(key);
  if (!picker) {
    picker = new SceneRefreshPicker({
      key,
      ...props
    });
  }
  useEffect(() => scene.addToScene(picker), [picker, scene]);
  useEffect(() => {
    const stateUpdate = {};
    if (!prevProps) {
      return;
    }
    if (props.refresh !== prevProps.refresh) {
      stateUpdate.refresh = props.refresh;
    }
    if (props.withText !== prevProps.withText) {
      stateUpdate.withText = props.withText;
    }
    picker.setState(stateUpdate);
  }, [picker, props, prevProps]);
  return /* @__PURE__ */ React.createElement(picker.Component, { model: picker });
}

export { RefreshPicker };
//# sourceMappingURL=RefreshPicker.js.map
