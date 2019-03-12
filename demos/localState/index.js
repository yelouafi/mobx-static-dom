import { h, p, on, render } from "../../src";
import { observable } from "mobx";
import debounce from "lodash.debounce";
import { markdown } from "markdown";
import { panel } from "./panel";

const state = observable({
  markdown: `# What is Lorem Ipsum?\n
**Lorem Ipsum** is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`
});

export const app = h.main(
  p.style(`
    max-width: 600px;
    margin: auto;
    margin-top: 2em;
  `),
  h.h1("Simple Markdown editor"),
  h.p("Source"),
  h.textarea(
    { rows: 12, style: "width: 100%" },
    state.markdown,
    on.input(
      debounce(event => {
        state.markdown = event.target.value;
      }, 300)
    )
  ),
  h.hr(),
  panel(h.div(p.innerHTML(() => markdown.toHTML(state.markdown))))
);

// assuming your html file contains an element with id="app"
render(app, document.getElementById("app"));
