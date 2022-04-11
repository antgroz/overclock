'use strict';

var Base = require('./base');
var is = require('../util/is');

/**
 * @class
 * @param {object} params - Task parameters
 * @param {object} defaults - Default parameters
 */
function Once(params, defaults) {
  Base.call(this, params, defaults);

  this._timeout = null;
}

Once.prototype = Object.create(Base.prototype);
Once.prototype.constructor = Once;

Once.prototype._init = function () {
  var self = this;
  var data = { task: this };

  this.isStarting = true;
  this.startingAt = new Date();
  this.emit('starting', data);

  var go = function () {
    self._timeout = null;
    self.isStarting = false;
    self.isStarted = true;
    self.startedAt = new Date();
    self.emit('started', data);
    self._tick();
  };

  if (is.undefined(this.startTimeoutMillis)) {
    go();
    return;
  }

  this._timeout = setTimeout(go, this.startTimeoutMillis);
};

Once.prototype._destroy = function (done) {
  var self = this;
  var data = { task: this };

  this.isStopping = true;
  this.stoppingAt = true;
  this.emit('stopping', data);

  var stop = function () {
    clearTimeout(self._timeout);
    self._timeout = null;
    self.isStopping = false;
    self.isStopped = true;
    self.stoppedAt = new Date();
    self.emit('stopped', data);
    if (done) done();
  };

  var go = function () {
    if (!self.runningCount) {
      stop();
      return;
    }

    var listener = function () {
      self._postTock = null;
      clearTimeout(timeout);
      stop();
    };

    var timeout = is.undefined(self.gracefulTimeoutMillis)
      ? null
      : setTimeout(listener, self.gracefulTimeoutMillis);

    self._postTock = listener;
  };

  if (is.undefined(this.stopTimeoutMillis)) {
    go();
    return;
  }

  setTimeout(go, this.stopTimeoutMillis);
};

module.exports = Once;
