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

export function text(value) {
  return directive(function textNodeDirective(parent, subscribe, onDispose) {
    if (typeof value !== "function") {
      parent.appendChild(document.createTextNode(value));
    } else {
      const node = document.createTextNode("");
      onDispose(
        subscribe(() => {
          node.nodeValue = value();
        })
      );
      parent.appendChild(node);
    }
  });
}

export function prop(name, value) {
  return directive(function propDirective(parent, subscribe, onDispose) {
    if (typeof value !== "function") {
      parent[name] = value;
    } else {
      onDispose(
        subscribe(() => {
          parent[name] = value();
        })
      );
    }
  });
}

export function event(type, handler) {
  return directive(function eventDirective(parent) {
    parent.addEventListener(type, action(handler));
  });
}

function runChild(child, parent, subscribe, onDispose) {
  if (isDirective(child)) {
    child(parent, subscribe, onDispose);
  } else if (Array.isArray(child)) {
    child.forEach(it => runChild(it, parent, subscribe, onDispose));
  } else if (isPlainObject(child)) {
    Object.keys(child).forEach(key =>
      runChild(prop(key, child[key]), parent, subscribe, onDispose)
    );
  } else {
    text(child)(parent, subscribe, onDispose);
  }
}

export function html(tag, ...children) {
  return directive(function htmlDirective(parent, subscribe, onDispose) {
    const node = document.createElement(tag);
    runChild(children, node, subscribe, onDispose);
    parent.appendChild(node);
  });
}

export function map(getItems, template) {
  return directive(function mapDirective(parent, subscribe, onDispose) {
    let items = (typeof getItems === "function"
      ? getItems()
      : getItems
    ).slice();
    let imap = new Map();
    let refs = [];
    const endMarkNode = document.createComment("array-end");
    parent.appendChild(endMarkNode);
    items.forEach((item, index) => {
      const ref = createRef(template(item), subscribe);
      ref.index = index;
      refs.push(ref);
      imap.set(item, ref);
      parent.appendChild(ref.node);
    });
    const disposer = subscribe(syncChildren);
    onDispose(() => {
      disposer();
      refs.forEach(ref => ref.dispose());
    });

    function syncChildren() {
      let oldItems = items;
      let oldRefs = refs;
      items = (typeof getItems === "function" ? getItems() : getItems).slice();
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
          newRef = createRef(template(newIt), subscribe);
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
        const ref = createRef(template(newIt), subscribe);
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
  return directive(function dynamicDirective(parent, subscribe, onDispose) {
    const disposer = subscribe(syncChild);
    onDispose(() => {
      disposer();
      if (ref != null) ref.dispose();
    });
    function syncChild() {
      const oldRef = ref;
      ref = createRef(getDirective(), subscribe);
      if (oldRef == null) {
        parent.appendChild(ref.node);
      } else if (oldRef != null) {
        oldRef.dispose();
        parent.replaceChild(ref.node, oldRef.node);
      }
    }
  });
}

function createRef(dom, subscribe) {
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
  dom(ref, subscribe, ref.onDispose);
  return ref;
}

export function render(dom, parent) {
  let ref = createRef(dom, autorun);
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
export const on = createDirProxy(event);
