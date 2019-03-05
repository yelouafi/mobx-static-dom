import { autorun, action, toJS } from "mobx";

const DIRECTIVE = Symbol("Directive");

export function directive(f) {
  if (typeof f !== "function") throw new Error("argument must be a function!");
  f[DIRECTIVE] = true;
  return f;
}

export const isDirective = v => v != null && v[DIRECTIVE];

function isPlainObject(obj) {
  if (typeof obj !== "object" || obj === null) return false;

  const proto = Object.getPrototypeOf(obj);
  return proto !== null && Object.getPrototypeOf(proto) === null;
}

export function text(value) {
  return directive(function textNodeDirective(
    parent,
    subscribe,
    onDispose,
    ctx
  ) {
    if (typeof value !== "function") {
      parent.appendChild(document.createTextNode(value));
    } else {
      const node = document.createTextNode("");
      onDispose(
        subscribe(() => {
          node.nodeValue = value(ctx);
        })
      );
      parent.appendChild(node);
    }
  });
}

export function prop(name, value) {
  return directive(function propDirective(parent, subscribe, onDispose, ctx) {
    if (typeof value !== "function") {
      parent[name] = value;
    } else {
      onDispose(
        subscribe(() => {
          parent[name] = value(ctx);
        })
      );
    }
  });
}

const XLINK_NS = "http://www.w3.org/1999/xlink";
const NS_ATTRS = {
  show: XLINK_NS,
  actuate: XLINK_NS,
  href: XLINK_NS
};

function setDOMAttribute(el, name, value, isSVG) {
  if (value === true) {
    el.setAttribute(name, "");
  } else if (value === false) {
    el.removeAttribute(name);
  } else {
    var ns = isSVG ? NS_ATTRS[name] : undefined;
    if (ns !== undefined) {
      el.setAttributeNS(ns, name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
}

export function attr(name, value) {
  return directive(function attributeDirective(
    parent,
    subscribe,
    onDispose,
    ctx
  ) {
    if (typeof value !== "function") {
      setDOMAttribute(parent, name, value);
    } else {
      onDispose(
        subscribe(() => {
          setDOMAttribute(parent, name, value(ctx));
        })
      );
    }
  });
}

export function styleKey(name, value) {
  return directive(function propDirective(parent, subscribe, onDispose, ctx) {
    if (typeof value !== "function") {
      parent.style[name] = value;
    } else {
      onDispose(
        subscribe(() => {
          parent.style[name] = value(ctx);
        })
      );
    }
  });
}

export function event(type, handler) {
  return directive(function eventDirective(parent, subscribe, onDispose, ctx) {
    parent.addEventListener(type, action(event => handler(event, ctx)));
  });
}

function runChild(child, parent, subscribe, onDispose, ctx) {
  if (isDirective(child)) {
    child(parent, subscribe, onDispose, ctx);
  } else if (Array.isArray(child)) {
    child.forEach(it => runChild(it, parent, subscribe, onDispose, ctx));
  } else if (isPlainObject(child)) {
    Object.keys(child).forEach(key =>
      runChild(prop(key, child[key]), parent, subscribe, onDispose, ctx)
    );
  } else {
    text(child)(parent, subscribe, onDispose, ctx);
  }
}

export function html(tag, ...children) {
  return directive(function htmlDirective(parent, subscribe, onDispose, ctx) {
    const node = document.createElement(tag);
    runChild(children, node, subscribe, onDispose, ctx);
    parent.appendChild(node);
  });
}

export function map(getItems, template) {
  return directive(function mapDirective(parent, subscribe, onDispose, ctx) {
    let items = [];
    let imap = new Map();
    let refs = [];
    const endMarkNode = document.createComment("array-end");
    parent.appendChild(endMarkNode);
    const disposer = subscribe(syncChildren);
    onDispose(() => {
      disposer();
      refs.forEach(ref => ref.dispose());
    });

    function syncChildren() {
      let oldItems = items;
      let oldRefs = refs;
      items = getItems(ctx);
      refs = new Array(items.length);
      let oldStart = 0,
        oldEnd = oldItems.length - 1;
      let newStart = 0,
        newEnd = items.length - 1;
      let oldIt, newIt, oldRef, newRef;
      let nextSibling = endMarkNode;

      while (oldStart <= oldEnd && newStart <= newEnd) {
        if (oldItems[oldStart] == null) {
          oldStart++;
          continue;
        }
        if (oldItems[oldEnd] == null) {
          oldEnd--;
          continue;
        }
        if (oldItems[oldStart] === items[newStart]) {
          refs[newStart] = oldRefs[oldStart];
          oldStart++;
          newStart++;
          continue;
        }
        if (oldItems[oldEnd] === items[newEnd]) {
          refs[newEnd] = oldRefs[oldEnd];
          oldEnd--;
          newEnd--;
          continue;
        }
        newIt = items[newStart];
        newRef = imap.get(newIt);
        if (newRef == null) {
          newRef = createRef(template(newIt), subscribe, ctx);
          imap.set(newIt, newRef);
        } else {
          oldItems[newRef.index] = null;
        }
        refs[newStart] = newRef;
        parent.insertBefore(newRef.node, oldRefs[oldStart].node);
        newStart++;
      }
      while (oldStart <= oldEnd) {
        oldIt = oldItems[oldStart];
        if (oldIt != null) {
          oldRef = oldRefs[oldStart];
          parent.removeChild(oldRef.node);
          imap.delete(oldIt);
          oldRef.dispose();
        }
        oldStart++;
      }
      while (newStart <= newEnd) {
        newIt = items[newStart];
        const ref = createRef(template(newIt), subscribe, ctx);
        imap.set(newIt, ref);
        refs[newStart] = ref;
        parent.insertBefore(
          ref.node,
          oldStart < oldRefs.length ? oldRefs[oldStart].node : nextSibling
        );
        newStart++;
      }
      refs.forEach((ref, index) => {
        ref.index = index;
      });
    }
  });
}

export function dynamic(getDirective) {
  let ref;
  return directive(function dynamicDirective(
    parent,
    subscribe,
    onDispose,
    ctx
  ) {
    const disposer = subscribe(syncChild);
    onDispose(() => {
      disposer();
      if (ref != null) ref.dispose();
    });
    function syncChild() {
      const oldRef = ref;
      ref = createRef(getDirective(ctx), subscribe, ctx);
      if (oldRef == null) {
        parent.appendChild(ref.node);
      } else if (oldRef != null) {
        oldRef.dispose();
        parent.replaceChild(ref.node, oldRef.node);
      }
    }
  });
}

function createRef(dom, subscribe, ctx) {
  let ref = {
    _disposers: [],
    appendChild(node) {
      ref.node = node;
    },
    onDispose(d) {
      ref._disposers.push(d);
    },
    dispose() {
      ref._disposers.forEach(d => d());
    }
  };
  dom(ref, subscribe, ref.onDispose, ctx);
  return ref;
}

export function createContext(id) {
  const symbol = Symbol(id);
  return {
    provider(getValue, child) {
      return directive(function contextProviderDirective(
        parent,
        subscribe,
        onDispose,
        ctx
      ) {
        child(
          parent,
          subscribe,
          onDispose,
          Object.assign({}, ctx, {
            get [symbol]() {
              return getValue();
            }
          })
        );
      });
    },
    consumer(effect) {
      return directive(function contextConsumerDirective(
        parent,
        subscribe,
        onDispose,
        ctx
      ) {
        onDispose(subscribe(() => effect(ctx[symbol])));
      });
    }
  };
}

export function render(dom, parent, ctx) {
  let ref = createRef(dom, autorun, ctx);
  parent.textContent = "";
  parent.appendChild(ref.node);
  return ref;
}

export function createDirProxy(dirFn) {
  const factoryMap = new Map();
  return new Proxy(html, {
    get(target, key) {
      let boundDir = factoryMap.get(key);
      if (boundDir == null) {
        boundDir = dirFn.bind(null, key);
        factoryMap.set(key, boundDir);
      }
      return boundDir;
    }
  });
}

export const h = createDirProxy(html);
export const p = createDirProxy(prop);
export const a = createDirProxy(attr);
export const style = createDirProxy(styleKey);
export const on = createDirProxy(event);

const debugParent = document.createElement("debug");
document.body.appendChild(debugParent);

export function debugState(getState, ...rest) {
  return directive(function debugStateDirective(parent, subscribe, onDispose) {
    const debugDir = h.div(
      p.style(`
        position: absolute;
        bottom: 10px;
        right: 10px;
        max-width: 400px;
        max-height: 200px;
        overflow: auto;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 5px;
        box-shadow: 10px 10px 12px 0px rgba(0,0,0,0.75);
      `),
      h.pre(() => JSON.stringify(toJS(getState()), null, 2)),
      ...rest
    );
    debugParent.textContent = "";
    debugDir(debugParent, subscribe, onDispose);
  });
}
