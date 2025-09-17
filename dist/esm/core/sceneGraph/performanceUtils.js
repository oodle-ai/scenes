function startPerformanceMeasure(eventName) {
  console.time(eventName);
  if (!performance || !performance.mark) {
    return;
  }
  performance.mark(`${eventName}_started`);
  if (!window.parent || !window.parent.performance || !window.parent.performance.mark) {
    return;
  }
  window.parent.performance.mark(`${eventName}_started`);
}
function stopPerformanceMeasure(eventName) {
  console.timeEnd(eventName);
  if (!performance || !performance.mark) {
    return;
  }
  performance.mark(`${eventName}_completed`);
  performance.measure(`${eventName}_measured`, `${eventName}_started`, `${eventName}_completed`);
  if (!window.parent || !window.parent.performance || !window.parent.performance.mark) {
    return;
  }
  window.parent.performance.mark(`${eventName}_completed`);
  window.parent.performance.measure(`${eventName}_measured`, `${eventName}_started`, `${eventName}_completed`);
}

export { startPerformanceMeasure, stopPerformanceMeasure };
//# sourceMappingURL=performanceUtils.js.map
