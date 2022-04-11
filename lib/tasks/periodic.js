'use strict';

var Task = require('./base');

/**
 * @class
 * @param {object} params - Task parameters
 * @param {object} defaults - Default parameters
 */
function Periodic(params, defaults) {
  Task.call(this, params, defaults);

  this._timeout = null;
  this._interval = null;
}

Periodic.prototype = Object.create(Task.prototype);
Periodic.prototype.constructor = Periodic;

Periodic.prototype._init = function () {
  var self = this;

  this.isStarted = true;
  this.startedAt = new Date();

  this._timeout = setTimeout(function () {
    self._timeout = null;
    self._interval = setInterval(function () {
      self._tick();
    }, this.runIntervalMillis);

    self._tick();
  }, this.startTimeoutMillis);
};

Periodic.prototype._destroy = function (done) {
  var self = this;

  var stop = function () {
    clearTimeout(self._timeout);
    self._timeout = null;
    self.isStopped = true;
    if (done) done();
  };

  setTimeout(function () {
    clearInterval(self._interval);
    self._interval = null;

    if (self.runningCount) {
      var listener = function () {
        if (self.runningCount) {
          return;
        }
        self.removeListener('tock', listener);
        clearTimeout(timer);
        stop();
      };

      var timer = setTimeout(function () {
        self.removeListener('tock', listener);
        stop();
      }, self.gracefulTimeoutMillis);

      self.on('tock', listener);
    } else {
      stop();
    }
  }, this.stopTimeoutMillis);
};

module.exports = Periodic;
