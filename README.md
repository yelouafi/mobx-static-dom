> Caution! this is isn't something ready for production; you may try it though in a side project

# Getting starts

```sh
npm i --save mobx-static-dom
```

# Simple Demo

[Sandbox demo](https://codesandbox.io/s/98rwoq150o)

```js
import { h, p, on, render } from "mobx-static-dom";
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
```

- Use `h` to create HTML elements
- Use `p` to set DOM properties
- Use `on` to attach event handlers
- Use mobx to create observable values (values that will be changed by your app)
- When createing HTML elements, wrap dynamic values in a function (`() => state.count`)
- Call `render` to append the created element

> Do not append the create elements directly to the parent DOM, it won't work

# Dynamic lists of elements

[Sandbox demo](https://codesandbox.io/s/o9j0v3y9jy)

```js
import { h, p, on, map, render } from "mobx-static-dom";
import { observable, computed } from "mobx";

const state = observable({
  input: "",
  todos: []
});

function addTodo() {
  state.todos.push({ title: state.input, done: false });
  state.input = "";
}

export const todoApp = h.div(
  h.input(
    p.value(() => state.input),
    on.input(event => (state.input = event.target.value)),
    on.keydown(event => {
      if (event.which === 13) addTodo();
    })
  ),
  map(() => state.todos, todoView)
);

function todoView(todo) {
  return h.label(
    p.style(
      () => `
        display: block;
        text-decoration: ${todo.done ? "line-through" : "none"}`
    ),
    p.for("cb-done"),
    h.input(
      p.type("checkbox"),
      p.id("cb-done"),
      p.checked(() => todo.done),
      on.click(event => (todo.done = event.target.checked))
    ),
    () => todo.title
  );
}

render(todoApp, document.getElementById("app"));
```

Notes

- Use `map` to render dynamic arrays
- Event handlers are automatically wrapped with mobx actions

# Local state

[Sandbox demo](https://codesandbox.io/s/0qro7vz60n)

```js
function panel(...children) {
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
```

- Simply declare local state inside your function
- Children elements are passed as ordinary function arguments

# Simple router (dynamic element)

[Sandbox demo](https://codesandbox.io/s/kw5lzwzj2r)

```js
import { h, p, on, dynamic } from "mobx-static-dom";
import { observable } from "mobx";
import { createBrowserHistory } from "history";

export const history = createBrowserHistory();

export function router(config) {
  const state = observable({
    currentView: config(history.location.pathname)
  });

  history.listen((location, action) => {
    console.log(action, location.pathname, location.state);
    state.currentView = config(history.location.pathname);
  });

  // switch the current view
  return dynamic(() => state.currentView);
}

export function link(path, label) {
  return h.a(
    label,
    p.href("#"),
    on.click(event => {
      event.preventDefault();
      if (path === history.location.pathname) return;
      history.push(path);
    })
  );
}
```

- Use `dynamic` to create dynamically changing HTML elements
- Note the `dynamic` dierctive mounts a new instance of the wrapped element, so the internal state is gone when you switch back to the same element.

