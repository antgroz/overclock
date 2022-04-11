'use strict';

var EventEmitter = require('events').EventEmitter;
var is = require('./util/is');
var TaskOnce = require('./tasks/once');
var TaskPeriodic = require('./tasks/periodic');
var TaskRecurrent = require('./tasks/recurrent');
var TaskSequential = require('./tasks/sequential');

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
 * @class
 * @augments EventEmitter
 * @param {object} [options] - Meister parameters
 */
function Meister(options) {
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
    throw new Error('Meister options must be an object');
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

Meister.prototype = Object.create(EventEmitter.prototype);
Meister.prototype.constructor = Meister;

/**
 * Add a task
 *
 * @param {object} options - Task options
 * @returns {Meister} - This
 */
Meister.prototype.add = function (options) {
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

Meister.prototype.get = function (name) {
  return this.tasks[name];
};

Meister.prototype.has = function (name) {
  return !!this.tasks[name] || null;
};

Meister.prototype.del = function (name) {
  var task = this.tasks[name];

  if (!task) {
    return false;
  }

  this.unpipe(name);
  delete this.tasks[name];

  return true;
};

Meister.prototype.start = function (name) {
  if (name) {
    var task = this.tasks[name];
    if (!task) {
      throw new Error('Task has not been added yet');
    }
    task.start();
  } else {
    for (name in this.tasks) {
      this.tasks[name].start();
    }
  }

  return this;
};

Meister.prototype.stop = function () {
  var task;
  var done;
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

  if (name) {
    var task = this.tasks[name];
    if (!task) {
      throw new Error('Task has not been added yet');
    }
    return task.stop(done);
  }

  var go = function (done) {
    var handler = function () {
      if (!--count) done();
    };

    var count = 0;
    for (name in self.tasks) {
      count++;
      var promise = self.tasks[name].stop(handler);
      if (promise) promise.then(handler);
    }
  };

  if (this.Promise) {
    return new this.Promise(go);
  }

  go(done);
};

Meister.prototype.pipe = function (name, event) {
  if (event && !~EVENTS.indexOf(event)) {
    throw new Error('Event is invalid');
  }

  var task = this.tasks[name];
  if (!task) {
    throw new Error('Task has not been added yet');
  }

  var events = event ? [event] : EVENTS;

  for (var i = 0; i < events.length; i++) {
    var pipe = this.pipes[event];
    var listeners = task.listeners(event);
    if (listeners.indexOf(pipe) === -1) {
      task.on(event, pipe);
    }
  }

  return this;
};

Meister.prototype.unpipe = function (name, event) {
  if (event && !~EVENTS.indexOf(event)) {
    throw new Error('Event is invalid');
  }

  var task = this.tasks[name];
  if (!task) {
    throw new Error('Task has not been added yet');
  }

  var events = event ? [event] : EVENTS;

  for (var i = 0; i < events.length; i++) {
    var pipe = this.pipes[event];
    var listeners = task.listeners(event);
    var count = 0;
    for (var j = 0; j < listeners.length; j++) {
      count += listeners[i] === pipe;
    }
    for (j = 0; j < count; j++) {
      task.removeListener(event, pipe);
    }
  }

  return this;
};

module.exports = Meister;
