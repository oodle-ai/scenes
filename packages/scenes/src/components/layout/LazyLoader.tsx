import React, { ForwardRefExoticComponent, useImperativeHandle, useRef, useState } from 'react';
import { useEffectOnce } from 'react-use';

import { uniqueId } from 'lodash';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import { t } from '@grafana/i18n';

export function useUniqueId(): string {
  const idRefLazy = useRef<string | undefined>(undefined);
  idRefLazy.current ??= uniqueId();
  return idRefLazy.current;
}

const UNLOAD_MULTIPLIER = 2;

export const DragActiveContext = React.createContext<boolean>(false);

// --- Unload observer: unmounts panel content when far off-screen ---
let unloadObserver: IntersectionObserver | null = null;
const unloadCallbacks: Record<string, (e: IntersectionObserverEntry) => void> = {};
const unloadElements = new Map<string, Element>();
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

function getUnloadMargin(): string {
  return `${Math.round(window.innerHeight * UNLOAD_MULTIPLIER)}px`;
}

function createUnloadObserver(): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = unloadCallbacks[entry.target.id];
        if (typeof cb === 'function') {
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

function observeUnload(id: string, el: Element, cb: (e: IntersectionObserverEntry) => void) {
  unloadCallbacks[id] = cb;
  unloadElements.set(id, el);
  if (!unloadObserver) {
    unloadObserver = createUnloadObserver();
    window.addEventListener('resize', handleUnloadResize);
  }
  unloadObserver.observe(el);
}

function unobserveUnload(id: string) {
  const el = unloadElements.get(id);
  if (el && unloadObserver) {
    unloadObserver.unobserve(el);
  }
  delete unloadCallbacks[id];
  unloadElements.delete(id);

  if (unloadElements.size === 0 && unloadObserver) {
    unloadObserver.disconnect();
    unloadObserver = null;
    window.removeEventListener('resize', handleUnloadResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  }
}

export interface Props extends Omit<React.HTMLProps<HTMLDivElement>, 'onChange' | 'children'> {
  children: React.ReactNode;
  key: string;
  onLoad?: () => void;
  onChange?: (isInView: boolean) => void;
  unloadWhenFarOffScreen?: boolean;
}

export interface LazyLoaderType extends ForwardRefExoticComponent<Props> {
  addCallback: (id: string, c: (e: IntersectionObserverEntry) => void) => void;
  callbacks: Record<string, (e: IntersectionObserverEntry) => void>;
  observer: IntersectionObserver;
}

export const LazyLoader: LazyLoaderType = React.forwardRef<HTMLDivElement, Props>(
  ({ children, onLoad, onChange, unloadWhenFarOffScreen, className, ...rest }, ref) => {
    const id = useUniqueId();
    const { hideEmpty } = useStyles2(getStyles);
    const [loaded, setLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const innerRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    const isDragActive = React.useContext(DragActiveContext);
    const isDragActiveRef = useRef(isDragActive);
    isDragActiveRef.current = isDragActive;

    useImperativeHandle(ref, () => innerRef.current!);

    useEffectOnce(() => {
      LazyLoader.addCallback(id, (entry) => {
        if (!loadedRef.current && entry.isIntersecting) {
          loadedRef.current = true;
          setLoaded(true);
          onLoad?.();
        }

        setIsInView(entry.isIntersecting);
        onChange?.(entry.isIntersecting);
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
            const distance =
              rect.top > entry.rootBounds.bottom
                ? rect.top - entry.rootBounds.bottom
                : entry.rootBounds.top - rect.bottom;
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

    // since we will hide empty lazyloaded divs, we need to include a
    // non-breaking space while the loader has not been loaded. after it has
    // been loaded, we can remove the non-breaking space and show the children.
    // If the children render empty, the whole loader will be hidden by css.
    return (
      <div id={id} ref={innerRef} className={`${hideEmpty} ${className}`} {...rest}>
        {!loaded ? (
          t('grafana-scenes.components.lazy-loader.placeholder', '\u00A0')
        ) : (
          <LazyLoaderInViewContext.Provider value={isInView}>{children}</LazyLoaderInViewContext.Provider>
        )}
      </div>
    );
  }
) as LazyLoaderType;

function getStyles() {
  return {
    hideEmpty: css({
      '&:empty': {
        display: 'none',
      },
    }),
  };
}

LazyLoader.displayName = 'LazyLoader';
LazyLoader.callbacks = {} as Record<string, (e: IntersectionObserverEntry) => void>;
LazyLoader.addCallback = (id: string, c: (e: IntersectionObserverEntry) => void) => (LazyLoader.callbacks[id] = c);
LazyLoader.observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (typeof LazyLoader.callbacks[entry.target.id] === 'function') {
        LazyLoader.callbacks[entry.target.id](entry);
      }
    }
  },
  { rootMargin: '200px' }
);

export const LazyLoaderInViewContext = React.createContext<boolean>(true);

export function useLazyLoaderIsInView(): boolean {
  return React.useContext(LazyLoaderInViewContext);
}
