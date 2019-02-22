import { h, p, on } from "../../src";

export function home(...children) {
  return h.section(h.h1("Welcome home"), children);
}
