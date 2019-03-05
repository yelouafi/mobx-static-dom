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

# Why ?

Because it sounded fun

# But, mutable state

I know, I'm a big proponent of immutability. And the above code isn't really my preferred style. And I still think virtual DOM is a better model. But there are also many devs who find the above programming model more convenient and map well to their mental model.

Besides, [there is a way](https://github.com/mobxjs/mobx/issues/199#issuecomment-221015091) to use mobx in an FP (FRP to be more accurate) style.

For context, I was thinking of it since I saw the https://github.com/paf31/purescript-sdom library which has the same concept but using a globale state a la Redux (implicitly passed), I thought the _static dom approach_ could be a good fit for mobx which already takes care of reactivity.

The idea is that, unlike virtual DOM where we recreate the elements on each render, here we have

- static parts are created then get forgotten

- dynamic parts (leaf texts, props, dynamic arrays) subscribe to observable values and get updated using the builtin mobx change notification.

It seems similar to the approach taken by template based frameworks, but using JavaScript itself for templating.

# Tradeoffs

> Note, the following isn't based on some real world performance benchmark, they're mainly impressions after playing with some small use cases

First, you have to manage which part is static and which is dynamic. With virtual DOM, everything is dynamic by default. It may seem manageable in the above demos but when you're passing arguments deep down to nested functions, it may become less obvious (nuance: could adopt a programming convention like using `getXXX` for dynamic parts, also Typings would be able to catch those errors)

Obviously, the main goal of this approach is performance (besides convenience provided by mobx for managing state) since we don't have to re-render the whole (or part of the) app each time something changes. This argument is, however, to be put into context.

First, there is still the overhead of the change propagation work done by mobx. This is of course much less than the virtual DOM overhead (create virtual nodes, reconciliation), but understand we still need to reconcile for dynamic colections. It means the performance gains provided by the library wont always translate noticeable performance gains for your application (You have to interpret the previous sentence in its exact logical meaning, `doesn't always imply` is not synonym `wont never imply`). It depends on how much the UI structure (I'm not saying UI content) is dynamic and how much _unnecessary overhead_ virtual DOM adds to your application.

One thing I really liked is the no-JSX API. I don't just mean the HTML like syntax, but the signature itself. For virtual DOM, the typical signature is `h(tag, props, ...childern)`, while here the signature is just `h(tag, ...children)`. DOM props and nodes are unified using the concept of _directive_. In the current implementation it's just a function

```ts
directive: (parentNode, subscribe, onDispose) => void
```

This gives a lot of flexibility when designing reusable UI patterns, I like this style of programming more than the common JSX spread syntax. Besides, you can write and compose raw DOM mutations (provided they dont clash with others) if necessary. For example, you may have an append only list od DOM elements, in this case, instead of `map` which does a full keyed diff (currently using items itself as keys), you can write an optimized map that run in constant time O(1) and append directly new items at the end.

A more ambitious approach many talk about is keeping the virtual DOM model and delegate to a compiler the work to figure out which part need or doesn't need to change. Honestly, (and I maybe totally wrong about this, I'm no expert on that) I've serious doubts we could acheive that in language with complex semantics like JavaScript. Maybe possible with langauges with simpler semantics like pure FP languages who are desgined around a small formalism like lambda calculus, but with a behemoth like JavaScript, it's far from obvious.

# Assuming this is gonna take off as a real project, what needs to be done

- Tooling
- Tests
- SVG elements
- JSX like syntax/templates?
- API docs
- More serious applications
