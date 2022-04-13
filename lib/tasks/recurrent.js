'use strict';

var Base = require('./base');
var is = require('../util/is');
var LifecycleError = require('../util/errors').LifecycleError;
var ParameterError = require('../util/errors').ParameterError;
var TimeoutError = require('../util/errors').TimeoutError;

/**
 * Task that is only executed once
 *
 * @class
 * @param {object} options - Task parameters
 * @param {object} defaults - Default parameters
 */
function Recurrent(options, defaults) {
  Base.call(this, options, defaults);

  if (is.undefined(this.runIntervalMillis)) {
    throw new ParameterError('Run interval must be specified');
  }

  this._timeout = null;
  this._interval = null;
}

Recurrent.prototype = Object.create(Base.prototype);
Recurrent.prototype.constructor = Recurrent;

Recurrent.prototype._tick = function () {
  if (this.runningCount) return;

  Base.prototype._tick.call(this);
};

Recurrent.prototype._init = function () {
  var message;
  if (this.isStarting) {
    message = 'Task is already starting';
    throw new LifecycleError(message);
  } else if (this.isStarted) {
    message = 'Task is already started';
    throw new LifecycleError(message);
  }

  var self = this;
  var data = { task: this };

  var go = function () {
    self._timeout = null;
    self.isStarting = false;
    self.isStarted = true;
    self.startedAt = new Date();
    self.isStopped = false;
    self.emit('started', data);

    self._interval = setInterval(function () {
      self._tick();
    }, self.runIntervalMillis);

    self._tick();
  };

  this.isStarting = true;
  this.startingAt = new Date();

  if (is.undefined(this.startTimeoutMillis)) {
    self.emit('starting', data);
    go();
  } else {
    this._timeout = setTimeout(go, this.startTimeoutMillis);
    self.emit('starting', data);
  }
};

Recurrent.prototype._destroy = function (done) {
  var message, error;
  if (this.isStopping) {
    message = 'Task cannot be stopped again while it is stopping';
    error = new LifecycleError(message);
    done(error);
    return;
  }
  if (this.isStopped && !this.isStarting) {
    message = 'Task is already stopped';
    error = new LifecycleError(message);
    done(error);
    return;
  }

  var self = this;
  var data = { task: this };

  var isCalled = false;
  var proxy = function (error) {
    if (isCalled) return;
    isCalled = true;
    done(error);
  };

  var stop = function (error) {
    clearTimeout(self._timeout);
    self._timeout = null;
    if (error) {
      proxy(error);
    } else {
      self.isStarting = false;
      self.isStarted = false;
      self.isStopping = false;
      self.isStopped = true;
      self.stoppedAt = new Date();
      self.emit('stopped', data);
      proxy();
    }
  };

  var go = function () {
    clearInterval(self._interval);
    self._interval = null;

    if (!self.runningCount) {
      stop();
    } else {
      if (!is.undefined(self.gracefulTimeoutMillis)) {
        self._timeout = setTimeout(function () {
          var message =
            'Graceful timeout of ' + self.gracefulTimeoutMillis + ' ms reached';
          var error = new TimeoutError(message);
          stop(error);
        }, self.gracefulTimeoutMillis);
      }

      self._postTock = function () {
        if (self.runningCount) return;
        self._postTock = null;
        stop();
      };
    }
  };

  this.isStopping = true;
  this.stoppingAt = new Date();

  if (is.undefined(this.stopTimeoutMillis)) {
    this.emit('stopping', data);
    go();
  } else {
    this._timeout = setTimeout(go, this.stopTimeoutMillis);
    this.emit('stopping', data);
  }
};

module.exports = Recurrent;
