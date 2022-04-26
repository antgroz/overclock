/**
 * Is the value nullish
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullish(value) {
  return value === null || value === undefined;
}

/**
 * Is the value nullish or an integer
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullishOrInteger(value) {
  return isNullish(value) || Number.isInteger(value);
}

/**
 * Is the value nullish or a finite non-negative number
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullishOrFiniteNonNegativeNumber(value) {
  return isNullish(value) || (Number.isFinite(value) && value >= 0);
}

/**
 * Is the value nullish or a finite number
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
export function isNullishOrFiniteNumber(value) {
  return isNullish(value) || Number.isFinite(value);
}
