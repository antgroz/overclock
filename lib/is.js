"use strict";

var is = exports;

/**
 * Is parameter undefined
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.undefined = function (param) {
  return param === undefined;
};

/**
 * Is parameter null
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.null = function (param) {
  return param === null;
};

/**
 * Is parameter nullish (undefined or null)
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.nullish = function (param) {
  return is.undefined(param) || is.null(param);
};

/**
 * Is parameter an object
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.object = function (param) {
  return typeof param === "object" && !!param && !is.array(param);
};

/**
 * Is parameter a function
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.function = function (param) {
  return typeof param === "function";
};

/**
 * Is parameter a boolean
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.boolean = function (param) {
  return typeof param === "boolean";
};

/**
 * Is parameter a valid duration
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.duration = function (param) {
  return typeof param === "number" && param >= 0;
};

/**
 * Is parameter an array
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.array = function (param) {
  return Array.isArray(param);
};
