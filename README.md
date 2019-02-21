# Getting starts

```sh
npm i --save mobx-static-dom
```

# Counter Demo

```js
import { h, p, on, render } from "../mobx-static-dom";
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

# Todos demo (I know, I know)

```js
import { h, p, on, map, render } from "../mobx-static-dom";
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
  )
  h.hr(),
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

# Why ?

Because it sounded fun

# But, mutable state

I know, I'm a big proponent of immutability. And the above code isn't really my preferred style. And I still think virtual DOM (like in React) is a better model. But, there are many devs who find this programming model more convenient and map well to their mental model.

I wanted to test the concept, when I saw the https://github.com/paf31/purescript-sdom library which has the same concept but using a globale state (implicitly passed), I thought the _static dom approach_ could be a good fit for mobx who already takes care of reactivity.

The idea is that, unlike virtual DOM where we recreate the elements on each render, here we have

- static parts are created then get forgotten

- dynamic parts (leaf texts, props, dynamic arrays) subscribe to observable values and gets updated using the builtin mobx change notification.

It seems similar to the approach takes on template based frameworks, but using JavaScript itself for templating.

# What are the tradeoffs?

I didn't build some real world applications, but toying some demos, I've already seen some cons

- You have to manage which part is static and which is dynamic. With virtual DOM, everything is dynamic by default. It may seem manageable in the above demos but when you're passing arguments deep down to nested functions, it may become less obvious (nuance: could adopt a programming convention like using `getXXX` for dynamic parts, also Typings would be able to catch those errors)

- There is no clear evidence that the approach gives a significant performance boost over virtual DOM.

One thing I really liked is the no-JSX API. I don't just mean the HTML like syntax, but the signature itself. For virtual DOM, the typical signature is `h(tag, props, ...childern)`, while here the signature is just `h(tag, ...children)`. DOM props and nodes are unified using the concept of _directive_. In the current implementation it's just a function

```ts
directive: (parentNode, subscribe, onDispose) => void
```

This gives a lot of flexibility when designing reusable UI patterns, I like this style of programming more than the common JSX spread syntax.

A more ambitious approach many talk about is keeping the virtual DOM model and delegate to a compiler the work to figure out which part need or doesn't need to change. Honestly, (and I maybe totally wrong about this, I'm no expert on that) I've serious doubts we could acheive that in language with complex semantics like JavaScript. Maybe possible with langauges with simpler semantics like pure FP languages who are desgined around a small formalism like lambda calculus, but with a behemoth like JavaScript, it's far from obvious.

# Assuming this is gonna take off as a real project, what needs to be done

- Tooling
- Tests
- Attributes support
- SVG elements
- API docs
- More serious applications
