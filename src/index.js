// @ts-check

import { autorun, action } from "mobx";

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

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function text(value) {
  return directive(function textNodeDirective(env) {
    if (typeof value !== "function") {
      env.parent.appendChild(document.createTextNode(value));
    } else {
      const node = document.createTextNode("");
      env.onDispose(
        env.subscribe(() => {
          node.nodeValue = value(env.ctx);
        })
      );
      env.parent.appendChild(node);
    }
  });
}

export function prop(name, value) {
  return directive(function propDirective(env) {
    if (typeof value !== "function") {
      env.parent[name] = value;
    } else {
      env.onDispose(
        env.subscribe(() => {
          env.parent[name] = value(env.ctx);
        })
      );
    }
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";
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
  return directive(function attributeDirective(env) {
    if (typeof value !== "function") {
      setDOMAttribute(env.parent, name, value, env.ctx.SVG);
    } else {
      env.onDispose(
        env.subscribe(() => {
          setDOMAttribute(env.parent, name, value(env.ctx), env.ctx.SVG);
        })
      );
    }
  });
}

export function styleKey(name, value) {
  return directive(function propDirective(env) {
    if (typeof value !== "function") {
      env.parent.style[name] = value;
    } else {
      env.onDispose(
        env.subscribe(() => {
          env.parent.style[name] = value(env.ctx);
        })
      );
    }
  });
}

export function event(type, handler) {
  return directive(function eventDirective(env) {
    env.parent.addEventListener(type, action(event => handler(event, env.ctx)));
  });
}

function runChild(child, env) {
  if (isDirective(child)) {
    child(env);
  } else if (Array.isArray(child)) {
    child.forEach(it => runChild(it, env));
  } else if (isPlainObject(child)) {
    Object.keys(child).forEach(key => attr(kebabCase(key), child[key])(env));
  } else {
    text(child)(env);
  }
}

export function el(tag, ...children) {
  return directive(function elementDirective(env) {
    const isSvgTag = tag === "svg";
    const envIsSvg = env.ctx.SVG;
    const node =
      isSvgTag || envIsSvg
        ? document.createElementNS(SVG_NS, tag)
        : document.createElement(tag);
    const childEnv = { ...env, parent: node };
    if (isSvgTag && !envIsSvg) {
      childEnv.ctx = { ...env.ctx, SVG: true };
    }
    runChild(children, childEnv);
    env.parent.appendChild(node);
  });
}

export function map(getItems, template) {
  return directive(function mapDirective(env) {
    let items = [];
    let imap = new Map();
    let refs = [];
    const endMarkNode = document.createComment("array-end");
    env.parent.appendChild(endMarkNode);
    const disposer = env.subscribe(syncChildren);
    env.onDispose(() => {
      disposer();
      refs.forEach(ref => ref.dispose());
    });

    function syncChildren() {
      let oldItems = items;
      let oldRefs = refs;
      items = getItems(env.ctx);
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
          newRef = createRef(template(newIt), env);
          imap.set(newIt, newRef);
        } else {
          oldItems[newRef.index] = null;
        }
        refs[newStart] = newRef;
        env.parent.insertBefore(newRef.node, oldRefs[oldStart].node);
        newStart++;
      }
      while (oldStart <= oldEnd) {
        oldIt = oldItems[oldStart];
        if (oldIt != null) {
          oldRef = oldRefs[oldStart];
          env.parent.removeChild(oldRef.node);
          imap.delete(oldIt);
          oldRef.dispose();
        }
        oldStart++;
      }
      while (newStart <= newEnd) {
        newIt = items[newStart];
        const ref = createRef(template(newIt), env);
        imap.set(newIt, ref);
        refs[newStart] = ref;
        env.parent.insertBefore(
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
  return directive(function dynamicDirective(env) {
    let ref;
    const disposer = env.subscribe(syncChild);
    env.onDispose(() => {
      disposer();
      if (ref != null) ref.dispose();
    });
    function syncChild() {
      const oldRef = ref;
      ref = createRef(getDirective(env.ctx), env);
      if (oldRef == null) {
        env.parent.appendChild(ref.node);
      } else if (oldRef != null) {
        oldRef.dispose();
        env.parent.replaceChild(ref.node, oldRef.node);
      }
    }
  });
}

function createRef(dom, env) {
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
  dom({ ...env, parent: ref, onDispose: ref.onDispose });
  return ref;
}

export function provider(newCtx, ...children) {
  return directive(function contextProviderDirective(env) {
    runChild(children, { ...env, ctx: { ...env.ctx, ...newCtx } });
  });
}

export function render(dom, parent, ctx = {}) {
  let ref = createRef(dom, {
    subscribe: autorun,
    ctx
  });
  parent.textContent = "";
  parent.appendChild(ref.node);
  return ref;
}

export function createDirProxy(dirFn) {
  const factoryMap = new Map();
  return new Proxy(
    {},
    {
      get(target, key) {
        let boundDir = factoryMap.get(key);
        if (boundDir == null) {
          boundDir = dirFn.bind(null, key);
          factoryMap.set(key, boundDir);
        }
        return boundDir;
      }
    }
  );
}

export const h = createDirProxy(el);
export const p = createDirProxy(prop);
export const a = createDirProxy(attr);
export const style = createDirProxy(styleKey);
export const on = createDirProxy(event);
