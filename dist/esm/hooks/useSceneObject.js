import { useId, useEffect } from 'react';
import { sceneGraph } from '@grafana/scenes';
import { useSceneContext } from './hooks.js';
import { getSceneObjectCache } from '../caching/SceneObjectCache.js';

function useSceneObject(options) {
  const scene = useSceneContext();
  const key = useId();
  const cache = getSceneObjectCache();
  let cacheKeyHash = options.cacheKey ? cache.getHashKey(options.cacheKey, options.objectConstructor) : void 0;
  let obj = scene.findByKey(key);
  if (!obj && cacheKeyHash) {
    obj = cache.get(cacheKeyHash);
    if (obj && obj.parent !== scene) {
      if (sceneGraph.findObject(scene, (sceneObj) => sceneObj === obj)) {
        console.error("A scene object cache key matched an object that is already in the scene");
        obj = void 0;
        cacheKeyHash = void 0;
      } else {
        obj.clearParent();
      }
    }
  }
  if (!obj) {
    obj = options.factory(key);
    if (cacheKeyHash) {
      cache.add(cacheKeyHash, obj);
    }
  }
  useEffect(() => scene.addToScene(obj), [obj, scene]);
  return obj;
}

export { useSceneObject };
//# sourceMappingURL=useSceneObject.js.map
