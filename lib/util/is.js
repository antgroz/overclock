export const is = {};

/**
 * Is parameter undefined
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.undefined = function(param) {
  return param === undefined;
};

/**
 * Is parameter null
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.null = function(param) {
  return param === null;
};

/**
 * Is parameter nullish (undefined or null)
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.nullish = function(param) {
  return is.undefined(param) || is.nullish(param);
};

/**
 * Is parameter an object
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.object = function(param) {
  return typeof param === 'object' && !!param && !is.array(param);
};

/**
 * Is parameter a function
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.function = function(param) {
  return typeof param === 'function';
};

/**
 * Is parameter a boolean
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.boolean = function(param) {
  return typeof param === 'boolean';
};

/**
 * Is parameter a number
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.number = function(param) {
  return typeof param === 'number';
};

/**
 * Is parameter an integer
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.integer = function(param) {
  return is.number(param) && !(param % 1);
};

/**
 * Is parameter a valid non-negative number
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.nonNegativeNumber = function(param) {
  return is.number(param) && param >= 0;
};

/**
 * Is parameter a valid non-negative number
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.nonNegativeInteger = function(param) {
  return is.integer(param) && param >= 0;
};

/**
 * Is parameter an array
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.array = function(param) {
  return Array.isArray(param);
};

/**
 * Is parameter a string
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
is.string = function(param) {
  return typeof param === 'string';
};
