'use strict';

/**
 * Create a new error class
 *
 * @param {string} name - Name of the error
 * @returns {Function} - Error constructor
 */
function createError(name) {
  /**
   * @class
   * @param {*} [message] - Error message
   */
  function E(message) {
    Error.captureStackTrace(this, E);
    this.message = message;
  }

  E.prototype = Object.create(Error.prototype);
  E.prototype.name = name;
  E.prototype.constructor = E;

  return E;
}

exports.TimeoutError = createError('TimeoutError');
exports.InitializationError = createError('InitializationError');
