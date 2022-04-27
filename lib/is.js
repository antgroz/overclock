'use strict';

const is = exports;

/**
 * Is the value nullish
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
is.nullish = function (value) {
  return value === null || value === undefined;
};

/**
 * Is the value nullish or an integer
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
is.nullishOrInteger = function (value) {
  return is.nullish(value) || Number.isInteger(value);
};

/**
 * Is the value nullish or a finite non-negative number
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
is.nullishOrFiniteNonNegativeNumber = function (value) {
  return is.nullish(value) || (Number.isFinite(value) && value >= 0);
};

/**
 * Is the value nullish or a finite number
 *
 * @param {*} value - Value
 * @returns {boolean} - Is
 */
is.nullishOrFiniteNumber = function (value) {
  return is.nullish(value) || Number.isFinite(value);
};
