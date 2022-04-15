'use strict';

var EventEmitter = require('events').EventEmitter;
var is = require('./util/is');
var TaskOnce = require('./tasks/once');
var TaskPeriodic = require('./tasks/periodic');
var TaskRecurrent = require('./tasks/recurrent');
var TaskSequential = require('./tasks/sequential');
var functions = require('./util/functions');
var throttle = functions.throttle;
var run = functions.run;

var EVENTS = ['starting', 'started', 'tick', 'tock', 'stopping', 'stopped'];

var ONCE = 'one';
var PERIODIC = 'periodic';
var RECURRENT = 'recurrent';
var SEQUENTIAL = 'sequential';
var SCHEDULES = [ONCE, PERIODIC, RECURRENT, SEQUENTIAL];

var CTORS = {};
CTORS[ONCE] = TaskOnce;
CTORS[PERIODIC] = TaskPeriodic;
CTORS[RECURRENT] = TaskRecurrent;
CTORS[SEQUENTIAL] = TaskSequential;

/**
 * Racer is the principal manager for all the tasks and serves
 * as a global entry point for all actions on tasks that might be performed.
 * It also pipes the events from all tasks into its own combined flow of events
 *
 * @class
 * @augments EventEmitter
 * @param {object} [options] - Racer parameters
 */
function Racer(options) {
  var self = this;
  EventEmitter.call(this);

  // preconfigured defaults
  this.schedule = PERIODIC;
  this.Promise = global.Promise;
  this.tasks = {};
  this.pipes = {};

  for (var i = 0; i < EVENTS.length; i++) {
    var event = EVENTS[i];
    this.pipes[event] = function () {
      Array.prototype.unshift.call(arguments, event);
      self.emit.apply(self, arguments);
    };
  }

  if (is.undefined(options)) {
    return;
  }

  // check options and change the defaults
  if (!is.object(options)) {
    throw new Error('Racer options must be an object');
  }

  if (!~SCHEDULES.indexOf(options.schedule)) {
    this.schedule = options.schedule;
  } else if (!is.undefined(options.schedule)) {
    throw new Error('Schedule is invalid');
  }

  if (is.nonNegativeNumber(options.startTimeoutMillis)) {
    this.startTimeoutMillis = options.startTimeoutMillis;
  } else if (!is.undefined(options.startTimeoutMillis)) {
    throw new Error('Start timeout must be a non-negative number');
  }

  if (is.nonNegativeNumber(options.runIntervalMillis)) {
    this.runIntervalMillis = options.runIntervalMillis;
  } else if (!is.undefined(options.runIntervalMillis)) {
    throw new Error('Run interval must be a non-negative number');
  }

  if (is.nonNegativeNumber(options.stopTimeoutMillis)) {
    this.stopTimeoutMillis = options.stopTimeoutMillis;
  } else if (!is.undefined(options.stopTimeoutMillis)) {
    throw new Error('Stop timeout must be a non-negative number');
  }

  if (is.nonNegativeNumber(options.gracefulTimeoutMillis)) {
    this.gracefulTimeoutMillis = options.gracefulTimeoutMillis;
  } else if (!is.undefined(options.gracefulTimeoutMillis)) {
    throw new Error('Graceful timeout must be a non-negative number');
  }

  if (is.function(options.Promise)) {
    this.Promise = options.Promise;
  } else if (!is.undefined(options.Promise)) {
    throw new Error('Promise must be a constructor function');
  }

  // add tasks
  if (is.array(options.tasks)) {
    for (i = 0; i < options.tasks.length; i++) {
      var task = options.tasks[i];
      this.add(task);
    }
  } else if (!is.undefined(options.tasks)) {
    throw new Error('Tasks must be an array');
  }
}

Racer.prototype = Object.create(EventEmitter.prototype);
Racer.prototype.constructor = Racer;

/**
 * Add a task. Start tracking its object and pipe its events
 *
 * @param {object} options - Task options
 * @returns {Racer} - This
 */
Racer.prototype.add = function (options) {
  var defaults = {
    startTimeoutMillis: this.startTimeoutMillis,
    runIntervalMillis: this.runIntervalMillis,
    stopTimeoutMillis: this.stopTimeoutMillis,
    gracefulTimeoutMillis: this.gracefulTimeoutMillis,
    Promise: this.Promise,
  };

  var schedule = (options && options.schedule) || this.schedule;
  var ctor = CTORS[schedule];
  if (!ctor) {
    throw new Error('Schedule type is invalid');
  }

  var task = new ctor(options, defaults);
  if (task.name in this.tasks) {
    throw new Error('Task "' + task.name + '" is already added');
  }
  this.tasks[task.name] = task;
  this.pipe(task.name);

  return this;
};

/**
 * Get a task object. Does not return anything if it is unknown to Racer
 *
 * @param {string} task - Name of the task
 * @returns {*} - Task or nothing, if unknown
 */
Racer.prototype.get = function (task) {
  return this.tasks[task];
};

/**
 * Check if Racer tracks a task object
 *
 * @param {string} task - Name of the task
 * @returns {boolean} - Whether the task is known or not
 */
Racer.prototype.has = function (task) {
  return !!this.tasks[task];
};

/**
 * Delete a task. Stops tracking its object and unpipes its events.
 * Does not automatically stop the task. Returns true if the task was
 * deleted and false if it is unknown
 *
 * @param {string} task - Name of the task
 * @returns {boolean} - Whether the task was deleted or not
 */
Racer.prototype.del = function (task) {
  if (!this.tasks[task]) {
    return false;
  }

  this.unpipe(task);
  delete this.tasks[task];

  return true;
};

/**
 * Start the execution of the task according to its schedule.
 * Throws if the task is unknown
 *
 * @param {string} task - Name of the task
 * @returns {Racer} - This
 */
Racer.prototype.start = function (task) {
  if (task) {
    if (!this.tasks[task]) {
      throw new Error('Task has not been added yet');
    }
    this.tasks[task].start();
  } else {
    for (task in this.tasks) {
      this.tasks[task].start();
    }
  }

  return this;
};

/**
 * Pipe the events from a task into the flow of events of this Racer.
 *
 * Accepts an optional `event` parameter for the name of the event to pipe.
 * If it is not specified, all known events are piped.
 *
 * Throws if an unknown task or an unknown event are provided. Multiple
 * invocations of this method on the same task and/or event are safe, and
 * it guarantees that only one event listener will be attached for each
 * combination of a task and an event
 *
 * @param {string} task - Name of the task
 * @param {string} [event] - Name of the event to pipe
 * @returns {Racer} - This
 */
Racer.prototype.pipe = function (task, event) {
  if (event && !~EVENTS.indexOf(event)) {
    throw new Error('Event is invalid');
  }

  task = this.tasks[task];
  if (!task) {
    throw new Error('Task has not been added yet');
  }

  var events = event ? [event] : EVENTS;

  for (var i = 0; i < events.length; i++) {
    event = events[i];
    var pipe = this.pipes[event];
    var listeners = task.listeners(event);
    if (!~listeners.indexOf(pipe)) {
      task.on(event, pipe);
    }
  }

  return this;
};

/**
 * Unpipe the events from a task from the flow of events of this Racer.
 *
 * Accepts an optional `event` parameter for the name of the event to unpipe.
 * If it is not specified, all known events are unpiped.
 *
 * Throws if an unknown task or an unknown event are provided. Guarantees
 * that, even if a pipe has been attached to a task multiple times, all
 * its instances will be removed
 *
 * @param {string} task - Name of the task
 * @param {string} [event] - Name of the event to pipe
 * @returns {Racer} - This
 */
Racer.prototype.unpipe = function (task, event) {
  if (event && !~EVENTS.indexOf(event)) {
    throw new Error('Event is invalid');
  }

  task = this.tasks[task];
  if (!task) {
    throw new Error('Task has not been added yet');
  }

  var events = event ? [event] : EVENTS;

  for (var i = 0; i < events.length; i++) {
    var pipe = this.pipes[event];
    var listeners = task.listeners(event);
    var count = listeners.length;
    for (var j = 0; j < count; j++) {
      var listener = listeners[j];
      if (listener !== pipe) continue;
      task.removeListener(event, listener);
      count--;
    }
  }

  return this;
};

/**
 * Stop one task, if provided, or all tracked tasks and call the done callback,
 * if provided. These are the signatures of this method:
 *
 * 1. function(task): Promise | void
 * 2. function(task, done): void
 * 3. function(): Promise | void
 * 4. function(done): void
 *
 * In case all tasks have to be stopped, this method wraps the stopping
 * of all tasks into a single Promise or done callback invocation. In case
 * the promise constructor is not set up on the Racer and done callback is
 * not provided either, this method just stops the task(s) silently
 *
 * @returns {*} - Promise or nothing
 */
Racer.prototype.stop = function () {
  var task, done;
  if (arguments[1]) {
    task = arguments[0];
    done = arguments[1];
  } else if (arguments[0]) {
    if (is.function(arguments[0])) {
      done = arguments[0];
    } else {
      task = arguments[0];
    }
  }

  var self = this;

  // if a single task is specified, just call its own stop method
  if (task) {
    task = this.tasks[task];
    if (!task) {
      throw new Error('Task has not been added yet');
    }
    task.stop(done);
    return;
  }

  var proxy = done ? throttle(done, 1) : function () {};

  var go = function (done) {
    var count = Object.keys(self.tasks).length;
    var sink = function (error) {
      count--;
      if (error) done(error);
      else if (!count) done();
    };

    for (task in self.tasks) {
      var promise = self.tasks[task].stop(sink);
      if (promise) promise.then(sink, sink);
    }
  };

  return run(go, this.Promise, proxy);
};

module.exports = Racer;
