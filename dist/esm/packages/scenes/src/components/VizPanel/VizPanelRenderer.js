import { Trans } from '@grafana/i18n';
import React, { useMemo, useCallback, useLayoutEffect, useEffect } from 'react';
import { useMeasure } from 'react-use';
import { SetPanelAttentionEvent, AlertState, PluginContextProvider } from '@grafana/data';
import { getAppEvents, getDataSourceSrv } from '@grafana/runtime';
import { useStyles2, Tooltip, PanelChrome, Icon, Button, ErrorBoundaryAlert, PanelContextProvider } from '@grafana/ui';
import { sceneGraph } from '../../core/sceneGraph/index.js';
import { isSceneObject } from '../../core/types.js';
import { css, cx } from '@emotion/css';
import { debounce } from 'lodash';
import { VizPanelSeriesLimit } from './VizPanelSeriesLimit.js';
import { useLazyLoaderIsInView } from '../layout/LazyLoader.js';

function VizPanelRenderer({ model }) {
  var _a, _b, _c;
  const {
    title,
    options,
    fieldConfig,
    _pluginLoadError,
    displayMode,
    hoverHeader,
    showMenuAlways,
    hoverHeaderOffset,
    menu,
    headerActions,
    subHeader,
    titleItems,
    seriesLimit,
    seriesLimitShowAll,
    description,
    collapsible,
    collapsed,
    _renderCounter = 0
  } = model.useState();
  const [ref, { width, height }] = useMeasure();
  const appEvents = useMemo(() => getAppEvents(), []);
  const setPanelAttention = useCallback(() => {
    if (model.state.key) {
      appEvents.publish(new SetPanelAttentionEvent({ panelId: model.getPathId() }));
    }
  }, [model, appEvents]);
  const debouncedMouseMove = useMemo(
    () => debounce(setPanelAttention, 100, { leading: true, trailing: false }),
    [setPanelAttention]
  );
  const profiler = useMemo(() => model.getProfiler(), [model]);
  const currentRenderStart = performance.now();
  const endRenderCallbackRef = React.useRef(null);
  useLayoutEffect(() => {
    if (profiler) {
      const callback = profiler.onSimpleRenderStart(currentRenderStart);
      endRenderCallbackRef.current = callback || null;
    }
  });
  useEffect(() => {
    if (endRenderCallbackRef.current) {
      const timestamp = performance.now();
      const duration = timestamp - currentRenderStart;
      endRenderCallbackRef.current(timestamp, duration);
      endRenderCallbackRef.current = null;
    }
  });
  const plugin = model.getPlugin();
  const { dragClass, dragClassCancel } = getDragClasses(model);
  const dragHooks = getDragHooks(model);
  const dataObject = sceneGraph.getData(model);
  const rawData = dataObject.useState();
  const dataWithSeriesLimit = useDataWithSeriesLimit(rawData.data, seriesLimit, seriesLimitShowAll);
  const dataWithFieldConfig = model.applyFieldConfig(dataWithSeriesLimit);
  const sceneTimeRange = sceneGraph.getTimeRange(model);
  const timeZone = sceneTimeRange.getTimeZone();
  const timeRange = model.getTimeRange(dataWithFieldConfig);
  const isInView = useLazyLoaderIsInView();
  useEffect(() => {
    if (dataObject.isInViewChanged) {
      dataObject.isInViewChanged(isInView);
    }
  }, [isInView, dataObject]);
  const titleInterpolated = model.interpolate(title, void 0, "text");
  const alertStateStyles = useStyles2(getAlertStateStyles);
  if (!plugin) {
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Trans, { i18nKey: "grafana-scenes.components.viz-panel-renderer.loading-plugin-panel" }, "Loading plugin panel..."));
  }
  if (!plugin.panel) {
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Trans, { i18nKey: "grafana-scenes.components.viz-panel-renderer.panel-plugin-has-no-panel-component" }, "Panel plugin has no panel component"));
  }
  const PanelComponent = plugin.panel;
  if (dataObject && dataObject.setContainerWidth) {
    dataObject.setContainerWidth(Math.round(width));
  }
  let subHeaderElement = [];
  if (subHeader) {
    if (Array.isArray(subHeader)) {
      subHeaderElement = subHeaderElement.concat(
        subHeader.map((subHeaderItem) => {
          return /* @__PURE__ */ React.createElement(subHeaderItem.Component, { model: subHeaderItem, key: `${subHeaderItem.state.key}` });
        })
      );
    } else if (isSceneObject(subHeader)) {
      subHeaderElement.push(/* @__PURE__ */ React.createElement(subHeader.Component, { model: subHeader, key: `${subHeader.state.key}` }));
    } else {
      subHeaderElement.push(subHeader);
    }
  }
  let titleItemsElement = [];
  if (titleItems) {
    if (Array.isArray(titleItems)) {
      titleItemsElement = titleItemsElement.concat(
        titleItems.map((titleItem) => {
          return /* @__PURE__ */ React.createElement(titleItem.Component, { model: titleItem, key: `${titleItem.state.key}` });
        })
      );
    } else if (isSceneObject(titleItems)) {
      titleItemsElement.push(/* @__PURE__ */ React.createElement(titleItems.Component, { model: titleItems }));
    } else {
      titleItemsElement.push(titleItems);
    }
  }
  if (seriesLimit) {
    titleItemsElement.push(
      /* @__PURE__ */ React.createElement(
        VizPanelSeriesLimit,
        {
          key: "series-limit",
          data: rawData.data,
          seriesLimit,
          showAll: seriesLimitShowAll,
          onShowAllSeries: () => model.setState({ seriesLimitShowAll: !seriesLimitShowAll })
        }
      )
    );
  }
  if (model.state.$timeRange) {
    titleItemsElement.push(/* @__PURE__ */ React.createElement(model.state.$timeRange.Component, { model: model.state.$timeRange, key: model.state.key }));
  }
  if (dataWithFieldConfig.alertState) {
    titleItemsElement.push(
      /* @__PURE__ */ React.createElement(Tooltip, { content: (_a = dataWithFieldConfig.alertState.state) != null ? _a : "unknown", key: `alert-states-icon-${model.state.key}` }, /* @__PURE__ */ React.createElement(
        PanelChrome.TitleItem,
        {
          className: cx({
            [alertStateStyles.ok]: dataWithFieldConfig.alertState.state === AlertState.OK,
            [alertStateStyles.pending]: dataWithFieldConfig.alertState.state === AlertState.Pending,
            [alertStateStyles.alerting]: dataWithFieldConfig.alertState.state === AlertState.Alerting
          })
        },
        /* @__PURE__ */ React.createElement(
          Icon,
          {
            name: dataWithFieldConfig.alertState.state === "alerting" ? "heart-break" : "heart",
            className: "panel-alert-icon",
            size: "md"
          }
        )
      ))
    );
  }
  let panelMenu;
  if (menu) {
    panelMenu = /* @__PURE__ */ React.createElement(menu.Component, { model: menu });
  }
  let actionsElement;
  if (headerActions) {
    if (Array.isArray(headerActions)) {
      actionsElement = /* @__PURE__ */ React.createElement(React.Fragment, null, headerActions.map((action) => {
        return /* @__PURE__ */ React.createElement(action.Component, { model: action, key: `${action.state.key}` });
      }));
    } else if (isSceneObject(headerActions)) {
      actionsElement = /* @__PURE__ */ React.createElement(headerActions.Component, { model: headerActions });
    } else {
      actionsElement = headerActions;
    }
  }
  const data = dataWithFieldConfig;
  const isReadyToRender = dataObject.isDataReadyToDisplay ? dataObject.isDataReadyToDisplay() : true;
  const context = model.getPanelContext();
  const panelId = model.getLegacyPanelId();
  let datasource = (_c = (_b = data.request) == null ? void 0 : _b.targets[0]) == null ? void 0 : _c.datasource;
  return /* @__PURE__ */ React.createElement("div", { className: relativeWrapper + " oodle-panel" }, /* @__PURE__ */ React.createElement("div", { ref, className: absoluteWrapper, "data-viz-panel-key": model.state.key }, width > 0 && height > 0 && /* @__PURE__ */ React.createElement(
    PanelChrome,
    {
      title: titleInterpolated,
      description: (description == null ? void 0 : description.trim()) ? model.getDescription : void 0,
      loadingState: data.state,
      statusMessage: getChromeStatusMessage(data, _pluginLoadError),
      statusMessageOnClick: model.onStatusMessageClick,
      width,
      height,
      selectionId: model.state.key,
      displayMode,
      titleItems: titleItemsElement.length > 0 ? titleItemsElement : void 0,
      dragClass,
      actions: actionsElement,
      dragClassCancel,
      padding: plugin.noPadding ? "none" : "md",
      menu: panelMenu,
      onCancelQuery: model.onCancelQuery,
      onFocus: setPanelAttention,
      onMouseEnter: setPanelAttention,
      onMouseMove: debouncedMouseMove,
      subHeaderContent: subHeaderElement.length ? subHeaderElement : void 0,
      onDragStart: (e) => {
        var _a2;
        (_a2 = dragHooks.onDragStart) == null ? void 0 : _a2.call(dragHooks, e, model);
      },
      showMenuAlways,
      ...collapsible ? {
        collapsible: Boolean(collapsible),
        collapsed,
        onToggleCollapse: model.onToggleCollapse
      } : { hoverHeader, hoverHeaderOffset }
    },
    (innerWidth, innerHeight) => {
      var _a2;
      return /* @__PURE__ */ React.createElement(React.Fragment, null, plugin.meta.id === "timeseries" && /* @__PURE__ */ React.createElement(
        Button,
        {
          style: { top: ((_a2 = model.state.title) == null ? void 0 : _a2.length) > 0 ? "-32px" : "0px", right: "28px", position: "absolute", border: 0, padding: 0 },
          variant: "secondary",
          fill: "outline",
          type: "button",
          "data-testid": "send-query-button",
          tooltipPlacement: "top",
          hidden: (datasource == null ? void 0 : datasource.type) !== "prometheus",
          onClick: () => {
            var _a3, _b2;
            const variables = { ...(_a3 = data == null ? void 0 : data.request) == null ? void 0 : _a3.scopedVars };
            variables.__interval = {
              value: "$__interval"
            };
            variables.__interval_ms = {
              value: "$__interval_ms"
            };
            let timeRange2 = (_b2 = data.request) == null ? void 0 : _b2.range;
            let rangeDurationMs = timeRange2.to.valueOf() - timeRange2.from.valueOf();
            getDataSourceSrv().get(datasource, variables).then((ds) => {
              var _a4, _b3, _c2, _d, _e, _f;
              if (ds.interpolateVariablesInQueries) {
                let targets = ds.interpolateVariablesInQueries((_a4 = data.request) == null ? void 0 : _a4.targets, variables);
                sendOodleInsightEvent(
                  (_b3 = data.request) == null ? void 0 : _b3.dashboardUID,
                  "Insights",
                  model.state.title,
                  (_c2 = data.request) == null ? void 0 : _c2.panelId,
                  targets,
                  timeRange2,
                  rangeDurationMs,
                  (_f = (_e = (_d = model.state) == null ? void 0 : _d.fieldConfig) == null ? void 0 : _e.defaults) == null ? void 0 : _f.unit
                );
              } else {
                throw new Error("datasource does not support variable interpolation");
              }
            }).catch((_) => {
              var _a4, _b3, _c2, _d, _e, _f;
              sendOodleInsightEvent(
                (_a4 = data.request) == null ? void 0 : _a4.dashboardUID,
                "Insights",
                model.state.title,
                (_b3 = data.request) == null ? void 0 : _b3.panelId,
                (_c2 = data.request) == null ? void 0 : _c2.targets,
                timeRange2,
                rangeDurationMs,
                (_f = (_e = (_d = model.state) == null ? void 0 : _d.fieldConfig) == null ? void 0 : _e.defaults) == null ? void 0 : _f.unit
              );
            });
          }
        },
        /* @__PURE__ */ React.createElement(
          "img",
          {
            src: "https://imagedelivery.net/oP5rEbdkySYwiZY4N9HGRw/d0e74e50-902c-4b3c-90af-cabc367bcb00/public",
            alt: "Insight icon",
            "data-testid": "insight-icon",
            style: { height: "25px" }
          }
        )
      ), /* @__PURE__ */ React.createElement(ErrorBoundaryAlert, { dependencies: [plugin, data] }, /* @__PURE__ */ React.createElement(PluginContextProvider, { meta: plugin.meta }, /* @__PURE__ */ React.createElement(PanelContextProvider, { value: context }, isReadyToRender && /* @__PURE__ */ React.createElement(
        PanelComponent,
        {
          id: panelId,
          data,
          title,
          timeRange,
          timeZone,
          options,
          fieldConfig,
          transparent: displayMode === "transparent",
          width: innerWidth,
          height: innerHeight,
          renderCounter: _renderCounter,
          replaceVariables: model.interpolate,
          onOptionsChange: model.onOptionsChange,
          onFieldConfigChange: model.onFieldConfigChange,
          onChangeTimeRange: model.onTimeRangeChange,
          eventBus: context.eventBus
        }
      )))));
    }
  )));
}
const sendOodleInsightEvent = (dashboardUId, dashboardTitle, panelTitle, panelId, expressionData, dashboardTime, rangeDurationMs, unit) => {
  const eventData = {
    dashboardUId,
    dashboardTitle,
    panelTitle,
    panelId,
    expressionData,
    dashboardTime,
    rangeDurationMs,
    unit
  };
  sendEventToParent({
    type: "message",
    payload: {
      source: "oodle-grafana",
      eventType: "sendQuery",
      value: JSON.parse(JSON.stringify(eventData))
    }
  });
};
function sendEventToParent(data) {
  window.parent.postMessage(data, "*");
}
function useDataWithSeriesLimit(data, seriesLimit, showAllSeries) {
  return useMemo(() => {
    if (!(data == null ? void 0 : data.series) || !seriesLimit || showAllSeries) {
      return data;
    }
    return {
      ...data,
      series: data.series.slice(0, seriesLimit)
    };
  }, [data, seriesLimit, showAllSeries]);
}
function getDragClasses(panel) {
  var _a, _b;
  const parentLayout = sceneGraph.getLayout(panel);
  const isDraggable = parentLayout == null ? void 0 : parentLayout.isDraggable();
  if (!parentLayout || !isDraggable || itemDraggingDisabled(panel, parentLayout)) {
    return { dragClass: "", dragClassCancel: "" };
  }
  return { dragClass: (_a = parentLayout.getDragClass) == null ? void 0 : _a.call(parentLayout), dragClassCancel: (_b = parentLayout == null ? void 0 : parentLayout.getDragClassCancel) == null ? void 0 : _b.call(parentLayout) };
}
function getDragHooks(panel) {
  var _a, _b;
  const parentLayout = sceneGraph.getLayout(panel);
  return (_b = (_a = parentLayout == null ? void 0 : parentLayout.getDragHooks) == null ? void 0 : _a.call(parentLayout)) != null ? _b : {};
}
function itemDraggingDisabled(item, layout) {
  let obj = item;
  while (obj && obj !== layout) {
    if ("isDraggable" in obj.state && obj.state.isDraggable === false) {
      return true;
    }
    if ("repeatSourceKey" in obj.state && obj.state.repeatSourceKey) {
      return true;
    }
    obj = obj.parent;
  }
  return false;
}
function getChromeStatusMessage(data, pluginLoadingError) {
  if (pluginLoadingError) {
    return pluginLoadingError;
  }
  let message = data.error ? data.error.message : void 0;
  if (data.errors) {
    message = data.errors.map((e) => e.message).join(", ");
  }
  return message;
}
const relativeWrapper = css({
  position: "relative",
  width: "100%",
  height: "100%"
});
const absoluteWrapper = css({
  position: "absolute",
  width: "100%",
  height: "100%"
});
const getAlertStateStyles = (theme) => {
  return {
    ok: css({
      color: theme.colors.success.text
    }),
    pending: css({
      color: theme.colors.warning.text
    }),
    alerting: css({
      color: theme.colors.error.text
    })
  };
};

export { VizPanelRenderer };
//# sourceMappingURL=VizPanelRenderer.js.map
