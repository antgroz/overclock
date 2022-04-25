/**
 * Is the value nullish or an integer
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullishOrInteger(value) {
  return Number.isInteger(value ?? 0);
}

/**
 * Is the value nullish or a finite non-negative number
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullishOrFiniteNonNegativeNumber(value) {
  const coalesced = value ?? 0;
  return Number.isFinite(coalesced) && coalesced >= 0;
}

/**
 * Is the value nullish or a finite number
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullishOrFiniteNumber(value) {
  return Number.isFinite(value ?? 0);
}
