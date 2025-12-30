import { isFilterComplete, isMultiValueOperator, isMatchAllFilter } from './AdHocFiltersVariable.js';
import { escapeOriginFilterUrlDelimiters, toUrlCommaDelimitedString, unescapeUrlDelimiters } from '../utils.js';

class AdHocFiltersVariableUrlSyncHandler {
  constructor(_variable) {
    this._variable = _variable;
  }
  getKey() {
    return `var-${this._variable.state.name}`;
  }
  getKeys() {
    return [this.getKey()];
  }
  getUrlState() {
    const filters = this._variable.state.filters;
    const originFilters = this._variable.state.originFilters;
    let value = [];
    if (filters.length === 0 && (originFilters == null ? void 0 : originFilters.length) === 0) {
      return { [this.getKey()]: [""] };
    }
    if (filters.length) {
      value.push(
        ...filters.filter(isFilterComplete).filter((filter) => !filter.hidden).map((filter) => toArray(filter).map(escapeOriginFilterUrlDelimiters).join("|"))
      );
    }
    if (originFilters == null ? void 0 : originFilters.length) {
      value.push(
        ...originFilters == null ? void 0 : originFilters.filter(isFilterComplete).filter((filter) => !filter.hidden && filter.origin && filter.restorable).map(
          (filter) => toArray(filter).map(escapeOriginFilterUrlDelimiters).join("|").concat(`#${filter.origin}#restorable`)
        )
      );
    }
    return {
      [this.getKey()]: value.length ? value : [""]
    };
  }
  updateFromUrl(values) {
    const urlValue = values[this.getKey()];
    if (urlValue == null) {
      return;
    }
    const filters = deserializeUrlToFilters(urlValue);
    const originFilters = updateOriginFilters([...this._variable.state.originFilters || []], filters);
    this._variable.setState({
      filters: filters.filter((f) => !f.origin),
      originFilters
    });
  }
}
function updateOriginFilters(prevOriginFilters, filters) {
  const updatedOriginFilters = [...prevOriginFilters];
  for (let i = 0; i < filters.length; i++) {
    const foundOriginFilterIndex = prevOriginFilters.findIndex((f) => f.key === filters[i].key);
    if (foundOriginFilterIndex > -1 && filters[i].origin === prevOriginFilters[foundOriginFilterIndex].origin) {
      if (isMatchAllFilter(filters[i])) {
        filters[i].matchAllFilter = true;
      }
      updatedOriginFilters[foundOriginFilterIndex] = filters[i];
    } else if (filters[i].origin === "dashboard") {
      delete filters[i].origin;
      delete filters[i].restorable;
    } else if (foundOriginFilterIndex === -1 && filters[i].origin === "scope" && filters[i].restorable) {
      updatedOriginFilters.push(filters[i]);
    }
  }
  return updatedOriginFilters;
}
function deserializeUrlToFilters(value) {
  if (Array.isArray(value)) {
    const values = value;
    return values.map(toFilter).filter(isFilter);
  }
  const filter = toFilter(value);
  return filter === null ? [] : [filter];
}
function toArray(filter) {
  var _a;
  const result = [toUrlCommaDelimitedString(filter.key, filter.keyLabel), filter.operator];
  if (isMultiValueOperator(filter.operator)) {
    filter.values.forEach((value, index) => {
      var _a2;
      result.push(toUrlCommaDelimitedString(value, (_a2 = filter.valueLabels) == null ? void 0 : _a2[index]));
    });
  } else {
    result.push(toUrlCommaDelimitedString(filter.value, (_a = filter.valueLabels) == null ? void 0 : _a[0]));
  }
  return result;
}
function toFilter(urlValue) {
  if (typeof urlValue !== "string" || urlValue.length === 0) {
    return null;
  }
  const [filter, origin, restorable] = urlValue.split("#");
  const [key, keyLabel, operator, _operatorLabel, ...values] = filter.split("|").reduce((acc, v) => {
    const [key2, label] = v.split(",");
    acc.push(key2, label != null ? label : key2);
    return acc;
  }, []).map(unescapeUrlDelimiters);
  return {
    key,
    keyLabel,
    operator,
    value: values[0],
    values: isMultiValueOperator(operator) ? values.filter((_, index) => index % 2 === 0) : void 0,
    valueLabels: values.filter((_, index) => index % 2 === 1),
    condition: "",
    ...isFilterOrigin(origin) && { origin },
    ...!!restorable && { restorable: true }
  };
}
function isFilterOrigin(value) {
  return value === "scope" || value === "dashboard";
}
function isFilter(filter) {
  return filter !== null && typeof filter.key === "string" && typeof filter.value === "string";
}

export { AdHocFiltersVariableUrlSyncHandler, toArray };
//# sourceMappingURL=AdHocFiltersVariableUrlSyncHandler.js.map
