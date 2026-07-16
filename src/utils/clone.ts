// SPDX-License-Identifier: Apache-2.0
/**
 * Deep-clone a JSON-serializable value.
 *
 * Hermes (the React Native JS engine) does not provide the `structuredClone`
 * global that Web/Node do, so we use a JSON round-trip. This is safe here
 * because every value cloned through it is plain JSON data - no Date, Map, Set,
 * functions or `undefined`. Use a structured-clone polyfill instead if that
 * ever stops being true.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
