const DEFAULT_NAMESPACE = "";
const DEFAULT_EXCLUDE_FROM_NAMESPACE = ["from", "to", "timezone"];
class UniqueUrlKeyMapper {
  constructor(options) {
    this.index = /* @__PURE__ */ new Map();
    this.options = {
      namespace: (options == null ? void 0 : options.namespace) || DEFAULT_NAMESPACE,
      excludeFromNamespace: (options == null ? void 0 : options.excludeFromNamespace) || DEFAULT_EXCLUDE_FROM_NAMESPACE
    };
  }
  getOptions() {
    return this.options;
  }
  getNamespacedKey(keyWithoutNamespace) {
    if (this.options.namespace && !this.options.excludeFromNamespace.includes(keyWithoutNamespace)) {
      return `${this.options.namespace}-${keyWithoutNamespace}`;
    }
    return keyWithoutNamespace;
  }
  getUniqueKey(keyWithoutNamespace, obj) {
    const key = this.getNamespacedKey(keyWithoutNamespace);
    const objectsWithKey = this.index.get(key);
    if (!objectsWithKey) {
      this.index.set(key, [obj]);
      return key;
    }
    let address = objectsWithKey.findIndex((o) => o === obj);
    if (address === -1) {
      filterOutOrphanedObjects(objectsWithKey, obj.getRoot());
      objectsWithKey.push(obj);
      address = objectsWithKey.length - 1;
    }
    if (address > 0) {
      return `${key}-${address + 1}`;
    }
    return key;
  }
  clear() {
    this.index.clear();
  }
}
function filterOutOrphanedObjects(sceneObjects, root) {
  for (let i = 0; i < sceneObjects.length; i++) {
    const obj = sceneObjects[i];
    if (isOrphan(obj)) {
      sceneObjects.splice(i, 1);
      i--;
    }
  }
}
function isOrphan(obj, root) {
  if (!obj.parent) {
    return false;
  }
  let found = false;
  obj.parent.forEachChild((child) => {
    if (child === obj) {
      found = true;
      return false;
    }
    return;
  });
  if (!found) {
    return true;
  }
  return isOrphan(obj.parent);
}

export { UniqueUrlKeyMapper };
//# sourceMappingURL=UniqueUrlKeyMapper.js.map
