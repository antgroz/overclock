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
function Recurrent(options, defaults) {
  Base.call(this, options, defaults);

  // this task is interval-based, hence we need that no matter what
  if (is.undefined(this.runIntervalMillis)) {
    throw new ParameterError('Run interval must be specified');
  }
}

Recurrent.prototype = Object.create(Base.prototype);
Recurrent.prototype.constructor = Recurrent;

Recurrent.prototype._start = function () {
  Base.prototype._start.call(this);

  var self = this;

  // schedule the second and the following iterations to be executed
  // in equal intervals from each other
  this._interval = setInterval(function () {
    self._tick();
  }, this.runIntervalMillis);

  // kick-start the execution of the task with the first iteration
  this._tick();
};

Recurrent.prototype._tick = function () {
  // this is where we are deviating from the period task: in case
  // an iteration is already running, we do not allow another one to start
  if (this.runningCount) {
    return;
  }

  Base.prototype._tick.call(this);
};

module.exports = Recurrent;
