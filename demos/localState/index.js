import { h, p, on, render, directive } from "../../src";
import { observable } from "mobx";
import { panel } from "./panel";

const state = observable({
  html: `<h3>What is Lorem Ipsum?</h3>
  <b>Lorem Ipsum</b> is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`
});

let $textArea;

export const app = h.main(
  p.style(`
    max-width: 600px;
    margin: auto;
    margin-top: 2em;
  `),
  h.h1("Simple HTML editor"),
  h.p("Type your HTML below (HTML is sanitized so some tags may be removed)"),
  h.textarea(
    directive(({ parent }) => ($textArea = parent)),
    { rows: 10, style: "width: 100%" },
    state.html
  ),
  h.button(
    "Update message",
    on.click(() => {
      state.html = $textArea.value;
    })
  ),
  h.hr(),
  panel(h.div(p.innerHTML(() => state.html)))
);

// assuming your html file contains an element with id="app"
render(app, document.getElementById("app"));
