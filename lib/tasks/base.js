'use strict';

var EventEmitter = require('events').EventEmitter;
var is = require('../util/is');
var ParameterError = require('../util/errors').ParameterError;

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle, namely methods
 *
 * 1. `start` - for starting the task
 * 2. `_init` - called by `start` and has to be implemented in subclasses
 * 3. `_tick` - called when the next iteration is executed
 * 4. `_run` - wrapper for various kinds of executable functions that is
 * called upon execution of a new iteration
 * 5. `_tock` - called when the iteration finishes executing
 * 6. `_destroy` - called by `stop` and has to be implemented in subclasses
 * 7. `stop` - for stopping the task, wraps the callback and Promise logic
 *
 * @class
 * @param {object} options - Task options
 * @param {object} defaults - Default options
 */
function Base(options, defaults) {
  if (!is.object(options)) {
    throw new ParameterError('Options must be an object');
  }

  var name = options.name;
  if (!is.string(name)) {
    throw new ParameterError('Name must be a string');
  }

  var executable = options.executable;
  if (!is.function(executable)) {
    throw new ParameterError('Executable must be a function');
  }

  var startTimeout = options.startTimeoutMillis;
  if (!is.undefined(startTimeout) && !is.nonNegativeNumber(startTimeout)) {
    throw new ParameterError('Start timeout must be a non-negative number');
  }

  var runInterval = options.runIntervalMillis;
  if (!is.undefined(runInterval) && !is.nonNegativeNumber(runInterval)) {
    throw new ParameterError('Run interval must be a non-negative number');
  }

  var stopTimeout = options.stopTimeoutMillis;
  if (!is.undefined(stopTimeout) && !is.nonNegativeNumber(stopTimeout)) {
    throw new ParameterError('Stop timeout must be a non-negative number');
  }

  var gracefulTimeout = options.gracefulTimeoutMillis;
  if (
    !is.undefined(gracefulTimeout) &&
    !is.nonNegativeNumber(gracefulTimeout)
  ) {
    throw new ParameterError('Graceful timeout must be a non-negative number');
  }

  var Promise = options.Promise;
  if (!is.undefined(Promise) && !is.function(Promise)) {
    throw new ParameterError('Promise must be a constructor function');
  }

  EventEmitter.call(this);

  // must always be present
  this.name = name;
  this.executable = executable;

  // values that have values
  this.startTimeoutMillis = is.undefined(startTimeout)
    ? defaults.startTimeoutMillis
    : startTimeout;
  this.runIntervalMillis = is.undefined(runInterval)
    ? defaults.runIntervalMillis
    : runInterval;
  this.stopTimeoutMillis = is.undefined(stopTimeout)
    ? defaults.stopTimeoutMillis
    : stopTimeout;
  this.gracefulTimeoutMillis = is.undefined(gracefulTimeout)
    ? defaults.gracefulTimeoutMillis
    : gracefulTimeout;
  this.Promise = Promise || defaults.Promise;

  // stats
  this.isStarting = false;
  this.isStarted = false;
  this.runningCount = 0;
  this.isStopping = false;
  this.isStopped = true;
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
 * 1. Synchronous functions returning a defined result
 * 2. Asynchronous functions accepting a Node.js style callback
 * 3. Asynchronous functions returning a Promise
 *
 * Synchronous functions returning nothing are currently not supported,
 * since it is practically impossible to distinguish them from asynchronous
 * functions accepting a callback and not returning anything.
 * The method guarantees that, in spite of incorrect implementations of
 * the executable, the callback passed to the method is only
 * going to be executed once
 *
 * @param {Function} done - Callback function accepting an error and a result
 * @private
 */
Base.prototype._run = function (done) {
  var called = false;
  var proxy = function (error, result) {
    if (called) return;
    called = true;
    done(error, result);
  };

  try {
    var result = this.executable(proxy);
    if (this.Promise && result instanceof this.Promise) {
      var onfulfilled = function (result) {
        proxy(null, result);
      };
      var onrejected = function (error) {
        proxy(error, null);
      };
      result.then(onfulfilled, onrejected);
    } else if (!is.undefined(result)) {
      proxy(null, result);
    }
  } catch (error) {
    proxy(error, null);
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
 * destroying is finished
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
 * with callback-style execution or returns a new Promise, if its
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
    throw new ParameterError('Done callback must be provided');
  }

  return new this.Promise(function (resolve, reject) {
    self._destroy(function (error) {
      if (error) reject(error);
      else resolve();
    });
  });
};

module.exports = Base;
