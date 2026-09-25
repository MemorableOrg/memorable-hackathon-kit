export function now() {
  return globalThis.__now ?? Date.now();
}
