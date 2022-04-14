'use strict';

var EventEmitter = require('events').EventEmitter;
var is = require('../util/is');
var LifecycleError = require('../util/errors').LifecycleError;
var ParameterError = require('../util/errors').ParameterError;
var TimeoutError = require('../util/errors').TimeoutError;
var delay = require('../util/functions').delay;
var throttle = require('../util/functions').throttle;
var run = require('../util/functions').run;

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle
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
  if (!is.nullish(startTimeout) && !is.nonNegativeNumber(startTimeout)) {
    throw new ParameterError('Start timeout must be a non-negative number');
  }

  var runInterval = options.runIntervalMillis;
  if (!is.nullish(runInterval) && !is.nonNegativeNumber(runInterval)) {
    throw new ParameterError('Run interval must be a non-negative number');
  }

  var stopTimeout = options.stopTimeoutMillis;
  if (!is.nullish(stopTimeout) && !is.nonNegativeNumber(stopTimeout)) {
    throw new ParameterError('Stop timeout must be a non-negative number');
  }

  var gracefulTimeout = options.gracefulTimeoutMillis;
  if (!is.nullish(gracefulTimeout) && !is.nonNegativeNumber(gracefulTimeout)) {
    throw new ParameterError('Graceful timeout must be a non-negative number');
  }

  var Promise = options.Promise;
  if (!is.nullish(Promise) && !is.function(Promise)) {
    throw new ParameterError('Promise must be a constructor function');
  }

  EventEmitter.call(this);

  // must always be present
  this.name = name;
  this.executable = executable;

  // options that have values
  this.startTimeoutMillis = is.nullish(startTimeout)
    ? defaults.startTimeoutMillis
    : startTimeout;
  this.runIntervalMillis = is.nullish(runInterval)
    ? defaults.runIntervalMillis
    : runInterval;
  this.stopTimeoutMillis = is.nullish(stopTimeout)
    ? defaults.stopTimeoutMillis
    : stopTimeout;
  this.gracefulTimeoutMillis = is.nullish(gracefulTimeout)
    ? defaults.gracefulTimeoutMillis
    : gracefulTimeout;
  this.Promise = Promise || defaults.Promise;

  // stats
  this.isStarting = false;
  this.isStarted = false;
  this.runningCount = 0;
  this.isStopping = false;
  this.isStopped = true;

  // internals
  this._timeout = null;
  this._interval = null;
}

Base.prototype = Object.create(EventEmitter.prototype);
Base.prototype.constructor = Base;

/**
 * Entry point method for starting a task. Checks the state of the lifecycle
 * and throws in case invoking the start procedure would interfere with it.
 * Changes the state of the task, emits the `starting` event, and invokes
 * the internal `_start` method or schedules it if necessary
 */
Base.prototype.start = function () {
  // check if the lifecycle state does not allow us to start
  var message;
  if (this.isStarting) message = 'Task is already starting';
  else if (this.isStarted) message = 'Task is already started';
  if (message) throw new LifecycleError(message);

  // change the state of the task
  this.isStarting = true;
  this.startingAt = new Date();

  this.emit('starting', { task: this });

  // delay the start if necessary
  this._timeout = delay(this._start.bind(this), this.startTimeoutMillis);
};

/**
 * Internal logic for starting the task. Changes the state of the task
 * and emits the `started` event. Subclasses have to extend or
 * re-implement this
 *
 * @protected
 */
Base.prototype._start = function () {
  // clear out the timeout and change state
  this._timeout = null;
  this.isStarting = false;
  this.isStarted = true;
  this.startedAt = new Date();
  this.isStopped = false;
  this.emit('started', { task: this });
};

/**
 * Start a new iteration of the task and set up means for
 * tracking its execution. Increments the running iteration count, emits
 * the `tick` event and runs the wrapped executable. At the end of execution,
 * it will collect data on the executed iteration and pass it to the internal
 * `_tock` method, which responds to finished executions
 *
 * @protected
 */
Base.prototype._tick = function () {
  var self = this;
  var tickAt = new Date();

  this.runningCount++;
  this.emit('tick', { task: this });

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
 * functions to an error-first style `done` callback. Supported types
 * of executables are
 *
 * 1. Synchronous functions returning a defined result
 * 2. Asynchronous functions accepting an error-first style callback
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
 * @protected
 */
Base.prototype._run = function (done) {
  // the throttle will guard as against cases when, e.g., an executable
  // invokes the callback but the also returns a promise we commit to
  var throttled = throttle(done, 1);

  try {
    // pass the callback to the function regardless or whether
    // it will invoke it or not
    var result = this.executable(throttled);

    // in case the function returned a promise we can recognize,
    // wire it to the done callback
    if (this.Promise && result instanceof this.Promise) {
      var onfulfilled = function (result) {
        throttled(null, result);
      };
      var onrejected = function (error) {
        throttled(error, null);
      };
      result.then(onfulfilled, onrejected);
    }

    // otherwise, if there is any result at all,
    // pass that to the callback
    else if (!is.nullish(result)) {
      throttled(null, result);
    }

    // any other case is ignored as undecidable
  } catch (error) {
    // if the function is synchronous and throws, we catch that, too
    throttled(error, null);
  }
};

/**
 * React to the end of execution of an iteration of a task. Decrements
 * the running iteration count and emits a `tock` event with the data on
 * the executed iteration. Subclasses have to re-implement
 * or extend this if necessary
 *
 * @param {object} data - Data on an iteration of execution
 * @protected
 */
Base.prototype._tock = function (data) {
  this.runningCount--;
  this.emit('tock', data);
};

/**
 * Internal logic for stopping the task. It clears the internal interval
 * timeout and thus immediately breaks any repeated scheduled executions.
 *
 * In case no iterations are currently running, we can optimize and start
 * the stop procedure right away. Otherwise, we have to wait for the running
 * iterations to complete, after which we can actually perform the stop
 * procedure.
 *
 * Since each iteration finishes with invoking the `_stop` method,
 * we use that and temporarily substitute the `_stop` method on the task
 * object being stopped. Thus, after each finished execution, we will
 * check if the task is being stopped and if there are no running iterations
 * detected. If both of these conditions hold true, we reset the substituted
 * `_tock` on the task object and proceed with the stop procedure.
 *
 * @param {Function} done - Error-first style callback function
 * @protected
 */
Base.prototype._stop = function (done) {
  var self = this;

  // the proxy function allows us to throttle multiple invocations
  // of the done callback, e.g., when the graceful timeout is fired
  // but the task did not actually stop, and to guard against
  // cases when the callback was not provided at all
  var proxy = done ? throttle(done, 1) : function () {};

  // stop the execution of this task
  var stop = function (error) {
    // an error signals that the graceful timeout was fired,
    // but that does not mean we can just abandon stopping the task -
    // it is irreversible - hence we just report the error to the callback
    // and allow the task to stop executing on its own
    if (error) {
      proxy(error);
      return;
    }

    // clear out any timeout and change the state
    clearTimeout(self._timeout);
    self._timeout = null;
    self.isStarting = false;
    self.isStarted = false;
    self.isStopping = false;
    self.isStopped = true;
    self.stoppedAt = new Date();
    self.emit('stopped', { task: self });

    // this is the final moment where the task is completely stopped
    proxy();
  };

  // clear out any repeating scheduling right away
  clearInterval(self._interval);
  self._interval = null;

  // if no iterations are running, we can just stop right away
  if (!self.runningCount) {
    stop();
    return;
  }

  // otherwise, schedule a report of a timeout error if the graceful
  // timeout is provided
  if (!is.nullish(self.gracefulTimeoutMillis)) {
    // we create the error ahead of the time just to protect ourselves
    // from an erroneously replaced graceful timeout
    var message =
      'Graceful timeout of ' + self.gracefulTimeoutMillis + ' ms reached';
    var error = new TimeoutError(message);

    self._timeout = setTimeout(function () {
      // we pass the error to the stop procedure to let it know that
      // the task is not really stopped yet and that an error report is due
      stop(error);
    }, self.gracefulTimeoutMillis);
  }

  // a bit of hacking to finish off the running iteration
  self._tock = function (data) {
    // we do not want to completely substitute any of the custom logic
    // the task subclass implements, hence we are calling it here anyway
    // by resolving the prototype dynamically
    Object.getPrototypeOf(self)._tock.call(self, data);

    // this iteration is not final, hence we do not let it clear out
    // the stub and invoke the stop procedure - another iteration after this
    // one will do that
    if (self.runningCount) {
      return;
    }

    // we are clear now to remove the stub and reset the _tock method
    // to the prototype version
    delete self._tock;

    // just in case somehow this custom re-implementation of the _tock method
    // survived the last cleanup into the stage of the lifecycle where the
    // task is not being stopped, we do not let it invoke the stop procedure
    // and just allow it to die off after being removed from the task object
    if (!self.isStopping) {
      return;
    }

    // now we are clear to call the stop procedure
    stop();
  };
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
  // check if the lifecycle state does not allow us to stop
  var message;
  if (this.isStopping)
    message = 'Task cannot be stopped again while it is stopping';
  else if (this.isStopped && !this.isStarting)
    message = 'Task is already stopped';
  if (message) {
    var error = new LifecycleError(message);
    var executable = function (callback) {
      callback(error);
    };

    // we want to bind the invocation of the stop method to a single
    // interface, hence any errors are reported in the same way
    // the results are - by running an async procedure with a callback
    // or as a promise
    return run(executable, this.Promise, done);
  }

  var self = this;

  // change the state
  this.isStopping = true;
  this.stoppingAt = new Date();

  this.emit('stopping', { task: this });

  // delay the execution of the _stop method, if necessary
  var delayed = function (done) {
    self._timeout = delay(self._stop.bind(self, done), self.stopTimeoutMillis);
  };

  // bind the invocation of the stop method to a callback or to a promise
  return run(delayed, this.Promise, done);
};

module.exports = Base;
