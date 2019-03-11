import { h, p, on, style, render } from "../../src";
import { observable } from "mobx";
import { form, textInput, types, validation } from "./form";
import { debugState } from "../../src/debugState";

function field(label, props) {
  return h.div(
    style.marginBottom("1em"),
    h.label(label, p.labelFor(label), style.display("block")),
    textInput(
      Object.assign({}, props, {
        render(inputState, inputHandlers) {
          function canShowError() {
            return inputState.currentResult.type === "error";
          }
          return h.div(
            h.input(
              p.id(name),
              style.border("1px solid #ddd"),
              style.borderRadius("2px"),
              style.display("block"),
              style.width("100%"),
              style.padding("5px"),
              p.value(() => inputState.text),
              inputHandlers
            ),
            h.span(
              style.fontSize("80%"),
              style.marginTop("5px"),
              style.display(() => (canShowError() ? "block" : "none")),
              style.color("red"),
              () => inputState.currentResult.errorMessage
            )
          );
        }
      })
    )
  );
}

const state = (window.$state = observable({
  values: {
    name: "",
    age: 40,
    email: ""
  }
}));

const app = h.section(
  p.style(`
    max-width: 600px;
    margin: auto;
    font-size: 18px;
  `),
  h.h1("Contact form"),
  form((formState, onSubmit) =>
    h.form(
      field("Name", {
        name: "name",
        required: "Name is required",
        type: types.text,
        validate: validation.minSize(10),
        getValue: () => state.values.name,
        onChange: v => (state.values.name = v)
      }),
      field("Email", {
        name: "email",
        required: "Email is required",
        type: types.text,
        validate: validation.email,
        getValue: () => state.values.email,
        onChange: v => (state.values.email = v)
      }),
      field(
        "Age",
        {
          name: "age",
          required: "Please provide an age",
          type: types.integer,
          validate: validation.min(15),
          getValue: () => state.values.age,
          onChange: v => (state.values.age = v)
        },
        style.maxWidth("60px")
      ),
      h.button(
        "Submit",
        p.type("submit"),
        p.disabled(() => formState.hasErrors),
        on.click(event => {
          event.preventDefault();
          console.log("submit");
          onSubmit();
        })
      ),
      debugState(() => formState)
    )
  )
);

// assuming your html file contains an element with id="app"
render(app, document.getElementById("app"));
