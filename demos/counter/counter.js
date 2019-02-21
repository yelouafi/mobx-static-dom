import { h, p, on, render } from "../../src";
import { observable } from "mobx";

const state = observable({
  count: 0
});

export const counterApp = h.h1(
  p.style("cursor: pointer"),
  () => `Count ${state.count}`,
  on.click(() => state.count++)
);

// assuming your html file contains an element with id="app"
render(counterApp, document.getElementById("app"));
