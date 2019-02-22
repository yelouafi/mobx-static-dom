import { h, p, on } from "../../src";
import { observable } from "mobx";

export function counter() {
  const state = observable({
    count: 0
  });

  return h.section(
    h.h1("Counter demo"),
    h.p("Notice the state of this is gone whene navigated away"),
    h.h3(p.style("cursor: pointer"), () => `Count ${state.count}`),
    h.button("Increment", on.click(() => state.count++)),
    h.button("Decrement", on.click(() => state.count--))
  );
}
