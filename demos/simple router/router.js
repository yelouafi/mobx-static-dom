import { h, p, on, dynamic } from "../../src";
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
