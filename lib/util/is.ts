/**
 * Is parameter undefined
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function undef(param: unknown): param is undefined {
  return param === undefined;
}

/**
 * Is parameter null
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function nil(param: unknown): param is null {
  return param === null;
}

/**
 * Is parameter nullish (undefined or null)
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function nullish(param: unknown): param is null | undefined {
  return undef(param) || nil(param);
}

/**
 * Is parameter an object
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function object(param: unknown): param is object {
  return typeof param === 'object' && !!param && !array(param);
}

/**
 * Is parameter a function
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function func(param: unknown): param is Function {
  return typeof param === 'function';
}

/**
 * Is parameter a boolean
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function boolean(param: unknown): param is boolean {
  return typeof param === 'boolean';
}

export function number(param: unknown): param is number {
  return typeof param === 'number';
}

export function integer(param: unknown): param is number {
  return number(param) && !(param % 1);
}

/**
 * Is parameter a valid non-negative number
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function nonNegativeNumber(param: unknown): param is number {
  return number(param) && param >= 0;
}

/**
 * Is parameter a valid non-negative number
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function nonNegativeInteger(param: unknown): param is number {
  return integer(param) && param >= 0;
}

/**
 * Is parameter an array
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function array(param: unknown): param is Array<unknown> {
  return Array.isArray(param);
}

/**
 * Is parameter a string
 *
 * @param {*} param - Parameter
 * @returns {boolean} - Is
 */
export function string(param: unknown): param is string {
  return typeof param === 'string';
}
