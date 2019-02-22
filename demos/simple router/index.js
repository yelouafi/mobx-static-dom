import { h, p, on, render } from "../../src";
import { observable } from "mobx";
import { router, link } from "./router";

import { home } from "./home";
import { counter } from "./counter";
import { about } from "./about";

const app = h.div(
  h.h2("Simple router demo using dynamic element"),
  h.ul(
    h.li(link("/", "Home")),
    h.li(link("/counter", "Counter demo")),
    h.li(link("/about", "About"))
  ),
  router(path => {
    if (path === "/" || path === "/home") return home();
    if (path === "/counter") return counter();
    if (path === "/about") return about();
    else
      return h.h1(
        "Error! unkown path, try one of the links above",
        p.style("background-color: red; color: #fefefe")
      );
  })
);

render(app, document.getElementById("app"));
