'use strict';

var is = require('./is');

/**
 * Throttle the execution of a function to `limit` executions.
 * When `limit` is 0, no executions are allowed. When `limit` is negative,
 * executions are unlimited
 *
 * @param {Function} executable - Executable function
 * @param {number} limit - Number of allowed executions
 * @returns {Function} - Throttle executable
 */
exports.throttle = function (executable, limit) {
  return function () {
    if (!limit) return;
    if (limit >= 0) limit--;
    return executable.apply(null, arguments);
  };
};

/**
 * Delay the execution of a function for `duration` milliseconds.
 * When `duration` is not provided, the executable is called right away
 *
 * @param {Function} executable - Executable function
 * @param {number} [duration] - Duration of delay in milliseconds
 * @returns {*} - Timeout or nothing
 */
exports.delay = function (executable, duration) {
  if (!is.nullish(duration)) {
    return setTimeout(executable, duration);
  }

  executable();
};

/**
 * Takes an asynchronous function following the error-first callback style
 * and either wraps its execution in a promise if a `Promise` constructor
 * is provided, or passes a `callback` to it otherwise. In case neither
 * Promise nor callback are provided, throws an error
 *
 * @param {Function} executable - Asynchronous executable accepting an
 * error-fist style callback
 * @param {Function} [Promise] - Promise constructor
 * @param {Function} [callback] - Error-fist style callback function
 * @returns {*} - Promise or nothing
 */
exports.run = function (executable, Promise, callback) {
  if (Promise) {
    return new Promise(function (resolve, reject) {
      executable(function (error, result) {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  executable(callback);
};
