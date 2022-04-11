'use strict';

var EventEmitter = require('events').EventEmitter;
var is = require('../util/is');

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle, namely
 *
 * 1. Entry point method `start` for starting the task
 * 2.
 */

/**
 * @class
 * @param {object} options - Task options
 * @param {object} defaults - Default options
 */
function Base(options, defaults) {
  if (!is.object(options)) {
    throw new Error('Task options must be an object');
  }

  var name = options.name;
  if (!is.string(name)) {
    throw new Error('Task name must be a string');
  }

  var executable = options.executable;
  if (!is.function(executable)) {
    throw new Error('Task executable must be a function');
  }

  var startTimeoutMillis = options.startTimeoutMillis;
  if (
    !is.undefined(startTimeoutMillis) &&
    !is.nonNegativeNumber(startTimeoutMillis)
  ) {
    throw new Error('Task start timeout must be a non-negative number');
  }

  var runIntervalMillis = options.runIntervalMillis;
  if (
    !is.undefined(runIntervalMillis) &&
    !is.nonNegativeNumber(runIntervalMillis)
  ) {
    throw new Error('Task run interval must be a non-negative number');
  }

  var stopTimeoutMillis = options.stopTimeoutMillis;
  if (
    !is.undefined(stopTimeoutMillis) &&
    !is.nonNegativeNumber(stopTimeoutMillis)
  ) {
    throw new Error('Task stop timeout must be a non-negative number');
  }

  var gracefulTimeoutMillis = options.gracefulTimeoutMillis;
  if (
    !is.undefined(gracefulTimeoutMillis) &&
    !is.nonNegativeNumber(gracefulTimeoutMillis)
  ) {
    throw new Error('Task graceful timeout must be a non-negative number');
  }

  var Promise = options.Promise;
  if (!is.undefined(Promise) && !is.function(Promise)) {
    throw new Error('Task Promise must be a constructor function');
  }

  EventEmitter.call(this);

  // must always be present
  this.name = name;
  this.executable = executable;

  // values that have values
  this.startTimeoutMillis = is.undefined(startTimeoutMillis)
    ? defaults.startTimeoutMillis
    : startTimeoutMillis;
  this.runIntervalMillis = is.undefined(runIntervalMillis)
    ? defaults.runIntervalMillis
    : runIntervalMillis;
  this.stopTimeoutMillis = is.undefined(stopTimeoutMillis)
    ? defaults.stopTimeoutMillis
    : stopTimeoutMillis;
  this.gracefulTimeoutMillis = is.undefined(gracefulTimeoutMillis)
    ? defaults.gracefulTimeoutMillis
    : gracefulTimeoutMillis;
  this.Promise = Promise || defaults.Promise;

  // stats
  this.isStarting = false;
  this.isStarted = false;
  this.runningCount = 0;
  this.isStopping = false;
  this.isStopped = false;
}

Base.prototype = Object.create(EventEmitter.prototype);
Base.prototype.constructor = Base;

/**
 * Initialize the task. Subclasses have to implement this
 * with custom logic of implementation
 *
 * @private
 */
Base.prototype._init = function () {
  throw new Error('Method not implemented');
};

/**
 * Start a new iteration of the task and set up means for
 * tracking its execution. Calls the pre-tick and post-tick hooks
 * before and after the `tick` event is emitted, respectively
 *
 * @private
 */
Base.prototype._tick = function () {
  if (this._preTick) {
    this._preTick();
  }

  var self = this;
  var data = { task: this };
  var tickAt = new Date();

  this.runningCount++;
  this.emit('tick', data);

  if (this._postTick) {
    this._postTick();
  }

  this._run(function (error, result) {
    var data = {
      task: self,
      tickAt: tickAt,
      tockAt: new Date(),
      error: error,
      result: result,
    };

    self._tock(data);
  });
};

/**
 * Wrapper around the task executable which interfaces various kinds of
 * functions to a `done` callback accepting error and result. Supported types
 * of executables are
 *
 * 1. Synchronous functions
 * 2. Asynchronous functions calling a Node.js style callback
 * 3. Asynchronous functions returning a Promise
 *
 * @param {Function} done - Callback function accepting an error and a result
 * @private
 */
Base.prototype._run = function (done) {
  try {
    var result = this.executable(done);
    if (this.Promise && result instanceof this.Promise) {
      var onfulfilled = function (result) {
        done(null, result);
      };
      var onrejected = function (error) {
        done(error, null);
      };
      result.then(onfulfilled, onrejected);
    } else {
      done(null, result);
    }
  } catch (error) {
    done(error, null);
  }
};

/**
 * React to the end of execution of an iteration of a task. Calls the
 * pre-tock and post-tock hooks before and after the `tock` event is emitted,
 * respectively
 *
 * @param {object} data - Data on an iteration of execution
 * @private
 */
Base.prototype._tock = function (data) {
  if (this._preTock) {
    this._preTock();
  }

  this.runningCount--;
  this.emit('tock', data);

  if (this._postTock) {
    this._postTock();
  }
};

/**
 * Destroy the task. Subclasses have to implement this
 * with custom logic of implementation. This method is passed a done
 * callback receiving an error object that has to be called when
 * destroying is finished. The done callback can be undefined in case
 * user input
 *
 * @private
 */
Base.prototype._destroy = function () {
  throw new Error('Method not implemented');
};

/**
 * Universal method for starting a task. Subclasses can leave this
 * as is and only implement the `_init` function or change it, if
 * necessary
 *
 * @returns {Base} - This
 */
Base.prototype.start = function () {
  this._init();

  return this;
};

/**
 * Universal method for stopping a task. Wraps the `_destroy` method
 * with callback-style execution or returns a new Promise, if the
 * constructor is provided while creating the task. Callback function has to
 * accept an optional error object. In case no callback is provided, but the
 * Promise constructor has been specified in options, this method will return
 * a promise resolving with nothing or rejecting with an error. In all other
 * cases the callback will be expected to be called and is passed to the
 * `_destroy` method. Subclasses can leave this as is and only implement
 * the `_destroy` function or change it, if necessary
 *
 * @param {Function} [done] - Callback function accepting an error
 * @returns {*} - Promise or nothing
 */
Base.prototype.stop = function (done) {
  var self = this;

  if (done) {
    this._destroy(done);
    return;
  }

  if (!this.Promise) {
    throw new Error('Done callback must be provided');
  }

  return new this.Promise(function (resolve, reject) {
    self._destroy(function (error) {
      if (error) reject(error);
      else resolve();
    });
  });
};

module.exports = Base;
