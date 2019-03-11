import { on, provider, directive } from "../../src";
import { observable, reaction } from "mobx";

function success(value) {
  return { type: "success", value };
}

function error(errorMessage, invalidValue) {
  return { type: "error", errorMessage, value: invalidValue };
}

const SPACES_RE = /\s+/g;
const INTEGER_RE = /^\d+$/;
const DECIMAL_RE = /^\d+(?:\.\d+)?$/;
const DATE_RE = /^(?:\d{1,2})\/(?:\d{1,2})\/(?:\d{1,4})$/;

export const types = {
  text: {
    parse: success,
    format: str => str
  },

  integer: {
    parse(str) {
      str = str.replace(SPACES_RE, "");
      if (!INTEGER_RE.test(str)) return error("Invalid integer!");
      return success(+str);
    },
    format(num, isFocused, intl) {
      return isFocused
        ? num
        : intl.formatNumber(num, { maximumFractionDigits: 0 });
    }
  },

  decimal: {
    parse(str) {
      str = str.replace(SPACES_RE, "");
      if (!DECIMAL_RE.test(str)) return error("Invalid decimal!");
      return success(+str);
    },
    format(num) {
      return num.toFixed(2);
    }
  },

  date: {
    parse(str) {
      if (!DATE_RE.test(str)) return error("Invalid date!");
      const parts = str.split("/");
      if (parts.length === 3) {
        let [day, month, year] = parts.map(s => +s);
        if (year < 100) {
          year += 2000;
        }
        const value = Date.parse(`${year}-${month}-${day}`);
        if (!isNaN(value)) return success(value);
      }
      return error("Invalid date!");
    },
    format(timestamp, _, intl) {
      return intl.formatDate(new Date(timestamp));
    }
  }
};

export const validation = {
  min(aMin, msg = `Field must be greater or equal than ${aMin}`) {
    return function minValidator(num) {
      if (num < aMin) return msg;
    };
  },
  max(aMax, msg = `Field must be less or equal than ${aMax}`) {
    return function maxValidator(num) {
      if (num > aMax) return msg;
    };
  },
  minSize(
    aMinSize,
    msg = `Field be must have ${aMinSize} charachters at least`
  ) {
    return function minSizeValidator(str) {
      if (str.length < aMinSize) return msg;
    };
  },
  maxSize(aMaxSize, msg = `Field must have ${aMaxSize} charachters at most`) {
    return function maxSizeValidator(str) {
      if (str.length > aMaxSize) return msg;
    };
  },
  pattern(aPattern, msg = `Field value doesn't match ${aPattern}`) {
    const anchoredRegex = new RegExp(`^${aPattern}$`);
    return function patternValidator(str) {
      if (!anchoredRegex.test(str)) return msg;
    };
  }
};

validation.email = validation.pattern(
  /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/
    .source,
  "Invalid email address"
);

export function form(render) {
  const state = observable({
    $$fields: [],
    wasSubmitted: false,
    get isTouched() {
      return state.$$fields.some(field => field.isTouched);
    },
    get hasErrors() {
      return state.$$fields.some(field => field.currentResult.type === "error");
    }
  });

  function handleSubmit() {
    state.wasSubmitted = true;
  }

  const formContext = {
    form: state
  };

  return provider(formContext, render(state, handleSubmit));
}

export function textInput({
  required,
  type,
  validate,
  getValue,
  onChange,
  render
}) {
  let state = observable({
    name,
    text: String(getValue()),
    currentResult: processInput(String(getValue())),
    isFocused: false,
    isTouched: false
  });

  reaction(getValue, newValue => {
    state.text = String(newValue);
  });

  function processInput(text) {
    if (text === "" && required) {
      if (required) return error(required);
      return success(null);
    }
    const result = type.parse(text);
    if (result.type === "error" || validate == null) return result;
    const errMsg = validate(result.value);
    if (errMsg != null) return error(errMsg, result.value);
    return result;
  }

  function handleInput(event) {
    state.isTouched = true;
    state.text = event.target.value;
    state.currentResult = processInput(state.text);
  }

  function handleFocus() {
    state.isFocused = true;
  }

  function handleBlur() {
    state.isFocused = false;
    if (state.currentResult.type === "success") {
      onChange(state.currentResult.value);
    }
  }

  return render(state, [
    on.input(handleInput),
    on.input(handleFocus),
    on.input(handleBlur),
    directive(env => env.ctx.form.$$fields.push(state))
  ]);
}
