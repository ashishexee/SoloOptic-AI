export function isObject(x: any): x is object {
  return x !== null && typeof x === "object";
}

export function safeNumber(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
