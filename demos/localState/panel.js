import { h, p, on } from "../../src";
import { observable } from "mobx";

const visibleStyle = `
  overflow:hidden;
  transition:max-height 0.5s ease-out;
  max-height:600px;
`;

const collapsedStyle = `
  overflow:hidden;
  max-height: 0; 
`;

export function panel(...children) {
  const state = observable({
    isContentVisible: true
  });

  function toggleContent() {
    state.isContentVisible = !state.isContentVisible;
  }

  return h.section(
    h.button(
      () => (state.isContentVisible ? "Hide content" : "Show content"),
      on.click(toggleContent)
    ),
    h.div(
      p.style(() => (state.isContentVisible ? visibleStyle : collapsedStyle)),
      ...children
    )
  );
}
