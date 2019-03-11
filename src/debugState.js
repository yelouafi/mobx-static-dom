import { directive, h, p } from "./index";
import { toJS } from "mobx";

const debugParent = document.createElement("debug");
document.body.appendChild(debugParent);

export function debugState(getState, ...rest) {
  return directive(function debugStateDirective(env) {
    const debugDir = h.div(
      p.style(`
        position: absolute;
        bottom: 10px;
        right: 10px;
        max-width: 400px;
        max-height: 200px;
        overflow: auto;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 5px;
        box-shadow: 10px 10px 12px 0px rgba(0,0,0,0.75);
      `),
      h.pre(() => JSON.stringify(toJS(getState()), null, 2)),
      ...rest
    );
    debugParent.textContent = "";
    debugDir({ ...env, parent: debugParent });
  });
}
