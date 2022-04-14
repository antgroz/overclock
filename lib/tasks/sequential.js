'use strict';

var Base = require('./base');
var is = require('../util/is');
var ParameterError = require('../util/errors').ParameterError;

/**
 * Task that is only executed once
 *
 * @class
 * @param {object} options - Task parameters
 * @param {object} defaults - Default parameters
 */
function Sequential(options, defaults) {
  Base.call(this, options, defaults);

  // this task is interval-based, hence we need that no matter what
  if (is.undefined(this.runIntervalMillis)) {
    throw new ParameterError('Run interval must be specified');
  }
}

Sequential.prototype = Object.create(Base.prototype);
Sequential.prototype.constructor = Sequential;

Sequential.prototype._start = function () {
  Base.prototype._start.call(this);

  // kick-start the first iteration of the task
  this._tick();
};

Sequential.prototype._tock = function (data) {
  Base.prototype._tock.call(this, data);

  // since none of the other tasks classes set up their execution this way,
  // we have to guard against the stopping state here
  if (this.isStopping) {
    return;
  }

  var self = this;

  // schedule the next iteration to execute in an interval starting
  // with the end of this iteration and the start of the next one
  this._timeout = setTimeout(function () {
    self._interval = null;
    self._tick();
  }, this.runIntervalMillis);
};

module.exports = Sequential;
