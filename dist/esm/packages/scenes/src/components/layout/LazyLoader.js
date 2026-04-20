import React, { useState, useRef, useImperativeHandle } from 'react';
import { useEffectOnce } from 'react-use';
import { uniqueId } from 'lodash';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import { t } from '@grafana/i18n';

function useUniqueId() {
  var _a;
  const idRefLazy = useRef(void 0);
  (_a = idRefLazy.current) != null ? _a : idRefLazy.current = uniqueId();
  return idRefLazy.current;
}
const UNLOAD_MULTIPLIER = 2;
const DragActiveContext = React.createContext(false);
let unloadObserver = null;
const unloadCallbacks = {};
const unloadElements = /* @__PURE__ */ new Map();
let resizeTimeout = null;
function getUnloadMargin() {
  return `${Math.round(window.innerHeight * UNLOAD_MULTIPLIER)}px`;
}
function createUnloadObserver() {
  return new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = unloadCallbacks[entry.target.id];
        if (typeof cb === "function") {
          cb(entry);
        }
      }
    },
    { rootMargin: getUnloadMargin() }
  );
}
function handleUnloadResize() {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(() => {
    if (unloadObserver && unloadElements.size > 0) {
      unloadObserver.disconnect();
      unloadObserver = createUnloadObserver();
      for (const el of unloadElements.values()) {
        unloadObserver.observe(el);
      }
    }
  }, 200);
}
function observeUnload(id, el, cb) {
  unloadCallbacks[id] = cb;
  unloadElements.set(id, el);
  if (!unloadObserver) {
    unloadObserver = createUnloadObserver();
    window.addEventListener("resize", handleUnloadResize);
  }
  unloadObserver.observe(el);
}
function unobserveUnload(id) {
  const el = unloadElements.get(id);
  if (el && unloadObserver) {
    unloadObserver.unobserve(el);
  }
  delete unloadCallbacks[id];
  unloadElements.delete(id);
  if (unloadElements.size === 0 && unloadObserver) {
    unloadObserver.disconnect();
    unloadObserver = null;
    window.removeEventListener("resize", handleUnloadResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  }
}
const LazyLoader = React.forwardRef(
  ({ children, onLoad, onChange, unloadWhenFarOffScreen, className, ...rest }, ref) => {
    const id = useUniqueId();
    const { hideEmpty } = useStyles2(getStyles);
    const [loaded, setLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const innerRef = useRef(null);
    const loadedRef = useRef(false);
    const isDragActive = React.useContext(DragActiveContext);
    const isDragActiveRef = useRef(isDragActive);
    isDragActiveRef.current = isDragActive;
    useImperativeHandle(ref, () => innerRef.current);
    useEffectOnce(() => {
      LazyLoader.addCallback(id, (entry) => {
        if (!loadedRef.current && entry.isIntersecting) {
          loadedRef.current = true;
          setLoaded(true);
          onLoad == null ? void 0 : onLoad();
        }
        setIsInView(entry.isIntersecting);
        onChange == null ? void 0 : onChange(entry.isIntersecting);
      });
      const wrapperEl = innerRef.current;
      if (wrapperEl) {
        LazyLoader.observer.observe(wrapperEl);
      }
      if (unloadWhenFarOffScreen && wrapperEl) {
        observeUnload(id, wrapperEl, (entry) => {
          if (!entry.isIntersecting && loadedRef.current && !isDragActiveRef.current && entry.rootBounds) {
            const vh = entry.rootBounds.height;
            const rect = entry.boundingClientRect;
            const distance = rect.top > entry.rootBounds.bottom ? rect.top - entry.rootBounds.bottom : entry.rootBounds.top - rect.bottom;
            if (distance > vh * UNLOAD_MULTIPLIER) {
              loadedRef.current = false;
              setLoaded(false);
            }
          }
        });
      }
      return () => {
        wrapperEl && LazyLoader.observer.unobserve(wrapperEl);
        delete LazyLoader.callbacks[id];
        if (Object.keys(LazyLoader.callbacks).length === 0) {
          LazyLoader.observer.disconnect();
        }
        if (unloadWhenFarOffScreen) {
          unobserveUnload(id);
        }
      };
    });
    return /* @__PURE__ */ React.createElement("div", { id, ref: innerRef, className: `${hideEmpty} ${className}`, ...rest }, !loaded ? t("grafana-scenes.components.lazy-loader.placeholder", "\xA0") : /* @__PURE__ */ React.createElement(LazyLoaderInViewContext.Provider, { value: isInView }, children));
  }
);
function getStyles() {
  return {
    hideEmpty: css({
      "&:empty": {
        display: "none"
      }
    })
  };
}
LazyLoader.displayName = "LazyLoader";
LazyLoader.callbacks = {};
LazyLoader.addCallback = (id, c) => LazyLoader.callbacks[id] = c;
LazyLoader.observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (typeof LazyLoader.callbacks[entry.target.id] === "function") {
        LazyLoader.callbacks[entry.target.id](entry);
      }
    }
  },
  { rootMargin: "200px" }
);
const LazyLoaderInViewContext = React.createContext(true);
function useLazyLoaderIsInView() {
  return React.useContext(LazyLoaderInViewContext);
}

export { DragActiveContext, LazyLoader, LazyLoaderInViewContext, useLazyLoaderIsInView, useUniqueId };
//# sourceMappingURL=LazyLoader.js.map
