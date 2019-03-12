import { h, style, directive, render } from "../../src";
import { observable } from "mobx";

function draggable(getX, getY, onDrag) {
  return directive(({ parent: node }) => {
    node.onmousedown = event => {
      const dx = getX() - event.clientX;
      const dy = getY() - event.clientY;

      document.addEventListener("mousemove", onMouseMove);

      node.onmouseup = () => {
        document.removeEventListener("mousemove", onMouseMove);
      };

      function onMouseMove(event) {
        const x = event.clientX + dx;
        const y = event.clientY + dy;
        onDrag(x, y);
      }
    };
  });
}

const colors = ["#28A86B", "#ff5722", "b06327", "#1e99e9"];

function controlPoint(getX, getY, fill, onDrag) {
  return h.g(
    { transform: () => `translate(${getX()}, ${getY()})` },
    h.circle({
      cx: 0,
      cy: 0,
      r: 3,
      class: "control-point",
      style: `fill: ${fill}`
    }),
    h.circle(
      { cx: 0, cy: 0, r: 10, class: "handle" },
      draggable(getX, getY, onDrag)
    )
  );
}

function bezier(state) {
  return [
    h.g(
      h.path({
        d: () =>
          `M${state.x1} ${state.y1} C${state.cx1} ${state.cy1} ${state.cx2} ${
            state.cy2
          } ${state.x2} ${state.y2}`,
        class: "curve"
      }),
      h.line({
        class: "control-line",
        x1: () => state.cx1,
        y1: () => state.cy1,
        x2: () => state.x1,
        y2: () => state.y1
      }),
      h.line({
        class: "control-line",
        x1: () => state.x2,
        y1: () => state.y2,
        x2: () => state.cx2,
        y2: () => state.cy2
      })
    ),
    controlPoint(() => state.x1, () => state.y1, colors[0], (x, y) => {
      state.x1 = x;
      state.y1 = y;
    }),
    controlPoint(() => state.x2, () => state.y2, colors[1], (x, y) => {
      state.x2 = x;
      state.y2 = y;
    }),
    controlPoint(() => state.cx1, () => state.cy1, colors[2], (x, y) => {
      state.cx1 = x;
      state.cy1 = y;
    }),
    controlPoint(() => state.cx2, () => state.cy2, colors[3], (x, y) => {
      state.cx2 = x;
      state.cy2 = y;
    })
  ];
}
const state = observable({
  x1: 100,
  y1: 100,
  x2: 280,
  y2: 100,
  cx1: 150,
  cy1: 20,
  cx2: 180,
  cy2: 150
});

export const svgApp = h.div(
  h.svg({ width: 500, height: 240 }, bezier(state)),
  h.pre(
    '<path d="',
    h.span(() => `M${state.x1},${state.y1} `, style.color(colors[0])),
    "C",
    h.span(() => `${state.cx1},${state.cy1} `, style.color(colors[2])),
    h.span(() => `${state.cx2},${state.cy2} `, style.color(colors[3])),
    h.span(() => `${state.x2},${state.y2}`, style.color(colors[1])),
    '" />'
  )
);

// assuming your html file contains an element with id="app"
render(svgApp, document.getElementById("app"));
