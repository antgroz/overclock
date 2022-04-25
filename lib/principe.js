'use strict';

const { EventEmitter } = require('events');
const { EVENTS } = require('./constants');
const is = require('./util/is');
const { createTask } = require('./tasks');
const { ParameterError } = require('./errors');


/**
 * Racer is the principal manager for all the tasks and serves
 * as a global entry point for all actions on tasks that might be performed.
 * It also pipes the events from all tasks into its own combined flow of events
 *
 * @class
 * @augments EventEmitter
 * @param {object} [options] - Racer parameters
 */
class Principe extends EventEmitter {


  /**
   * @param options - Principe options
   */
  constructor(options) {
    super();

    this._pipes = new Map();
    this._tasks = new Map();

    if (!is.nullish(options) && !is.object(options)) {
      throw new ParameterError('Options must be an object');
    }

    const { tasks } = options || {};

    for (const event of EVENTS) {
      this._pipes[event] = (...args) => {
        this.emit(event, ...args);
      };
    }

    if (!is.nullish(tasks) && !is.array(tasks)) {
      const message = 'Tasks must be an array of option objects';
      throw new ParameterError(message);
    }

    for (const opts of tasks || []) {
      this.add(opts);
    }
  }

  /**
   * Add a task. Start tracking its object and pipe its events
   *
   * @param options - Task options
   * @returns - This
   */
  add(options) {
    const task = createTask(options);
    this._tasks.set(task.name, task);
    this.pipe(task.name);

    return this;
  }

  /**
   * Get a task object. Does not return anything if it is unknown to Racer
   *
   * @param {string} task - Name of the task
   * @returns {*} - Task or nothing, if unknown
   */
  get(task) {
    return this._tasks.get(task);
  }

  /**
   * Check if Racer tracks a task object
   *
   * @param {string} task - Name of the task
   * @returns {boolean} - Whether the task is known or not
   */
  has(task) {
    return this._tasks.has(task);
  }

  /**
   * Delete a task. Stops tracking its object and unpipes its events.
   * Does not automatically stop the task. Returns true if the task was
   * deleted and false if it is unknown
   *
   * @param {string} task - Name of the task
   * @returns {boolean} - Whether the task was deleted or not
   */
  del(task) {
    if (!this._tasks.has(task)) {
      return false;
    }

    this.unpipe(task);
    this._tasks.delete(task);

    return true;
  }

  /**
   * Start the execution of the task according to its schedule.
   * Throws if the task is unknown
   *
   * @param {string} task - Name of the task
   * @returns {Principe} - This
   */
  start(task) {
    if (task) {
      const taskObject = this._tasks.get(task);
      if (!taskObject) {
        const message = `Task '${task}' has not been added yet`;
        throw new ParameterError(message);
      }
      taskObject.start();
    } else {
      for (const taskObject of this._tasks.values()) {
        taskObject.start();
      }
    }

    return this;
  }

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
   * @param task - Name of the task
   * @param event - Name of the event to pipe
   * @returns - This
   */
  pipe(task, event) {
    if (event && !EVENTS.includes(event)) {
      const message = `Event '${event}' is invalid`;
      throw new ParameterError(message);
    }

    const taskObject = this._tasks.get(task);
    if (!taskObject) {
      const message = `Task '${task}' has not been added yet`;
      throw new ParameterError(message);
    }

    const events = event ? [event] : EVENTS;
    for (const event of events) {
      const pipe = this._pipes.get(event);
      const listeners = taskObject.listeners(event);
      if (!listeners.includes(pipe)) {
        taskObject.on(event, pipe);
      }
    }

    return this;
  }

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
   * @param task - Name of the task
   * @param event - Name of the event to pipe
   * @returns - This
   */
  unpipe(task, event) {
    if (event && !EVENTS.includes(event)) {
      const message = `Event '${event}' is invalid`;
      throw new ParameterError(message);
    }

    const taskObject = this._tasks.get(task);
    if (!taskObject) {
      const message = `Task '${task}' has not been added yet`;
      throw new ParameterError(message);
    }

    const events = event ? [event] : EVENTS;
    for (const event of events) {
      const pipe = this._pipes.get(event);
      const listeners = taskObject.listeners(event);
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        if (listener !== pipe) continue;
        taskObject.removeListener(event, pipe);
      }
    }

    return this;
  }

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
  stop() {
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

    var proxy = done ? throttle(done, 1) : function() {
    };

    var go = function(done) {
      var count = Object.keys(self.tasks).length;
      var sink = function(error) {
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
  }
}

module.exports = Principe;
