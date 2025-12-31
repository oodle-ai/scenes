import { isPlainObject } from 'lodash';
import { LRUCache } from 'lru-cache';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var _cache, _objectRefIds, _objectRefIdCounter;
class SceneObjectCache {
  constructor() {
    __privateAdd(this, _cache);
    __privateAdd(this, _objectRefIds, /* @__PURE__ */ new WeakMap());
    __privateAdd(this, _objectRefIdCounter, 0);
    __privateSet(this, _cache, new LRUCache({
      max: 500,
      ttl: 1e3 * 60 * 5
    }));
  }
  add(keyHash, object) {
    __privateGet(this, _cache).set(keyHash, object);
  }
  get(keyHash) {
    return __privateGet(this, _cache).get(keyHash);
  }
  getHashKey(key, type) {
    if (Array.isArray(key)) {
      return `${type.name}-${key.map((k) => this.getHashKeyElement(k)).join()}`;
    }
    return `${type.name}-${this.getHashKeyElement(key)}`;
  }
  getByRefHashKey(obj) {
    let objectRefId = __privateGet(this, _objectRefIds).get(obj);
    if (objectRefId == null) {
      objectRefId = __privateWrapper(this, _objectRefIdCounter)._++;
      __privateGet(this, _objectRefIds).set(obj, objectRefId);
    }
    return objectRefId;
  }
  getHashKeyElement(key) {
    if (typeof key === "string" || typeof key === "boolean" || typeof key === "number") {
      return key;
    }
    return getObjectHash(key);
  }
}
_cache = new WeakMap();
_objectRefIds = new WeakMap();
_objectRefIdCounter = new WeakMap();
let cache;
function getSceneObjectCache() {
  if (cache) {
    return cache;
  }
  return cache = new SceneObjectCache();
}
function getObjectHash(obj) {
  return JSON.stringify(
    obj,
    (_, val) => isPlainObject(val) ? Object.keys(val).sort().reduce((result, key) => {
      result[key] = val[key];
      return result;
    }, {}) : val
  );
}

export { SceneObjectCache, getObjectHash, getSceneObjectCache };
//# sourceMappingURL=SceneObjectCache.js.map
