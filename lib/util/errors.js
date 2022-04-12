'use strict';

/**
 * @class
 * @param {*} [message] - Error message
 */
function TimeoutError(message) {
  Error.captureStackTrace(this, TimeoutError);
  this.message = message;
}

TimeoutError.prototype = Object.create(Error.prototype);
TimeoutError.prototype.name = 'TimeoutError';
TimeoutError.prototype.constructor = TimeoutError;
exports.TimeoutError = TimeoutError;

/**
 * @class
 * @param {*} [message] - Error message
 */
function LifecycleError(message) {
  Error.captureStackTrace(this, LifecycleError);
  this.message = message;
}

LifecycleError.prototype = Object.create(Error.prototype);
LifecycleError.prototype.name = 'LifecycleError';
LifecycleError.prototype.constructor = LifecycleError;
exports.LifecycleError = LifecycleError;

/**
 * @class
 * @param {*} [message] - Error message
 */
function ParameterError(message) {
  Error.captureStackTrace(this, ParameterError);
  this.message = message;
}

ParameterError.prototype = Object.create(Error.prototype);
ParameterError.prototype.name = 'ParameterError';
ParameterError.prototype.constructor = ParameterError;
exports.ParameterError = ParameterError;
