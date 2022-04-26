import { EventEmitter } from 'events';
import { DEFAULT_TASK_TYPE, EVENTS } from './constants.js';
import { ParameterError } from './errors.js';
import { Heartbeat } from './heartbeat.js';
import { Reactor } from './reactor.js';

/**
 * Manager is the principal manager for all the tasks and serves
 * as a global entry point for all actions on tasks that might be performed.
 * It also pipes the events from all tasks into its own combined flow of events
 *
 * @class
 * @augments EventEmitter
 * @param {object} [options] - Manager parameters
 */
export class Manager extends EventEmitter {
  /**
   * @param {object} options - Manager options
   */
  constructor(options = {}) {
    super();

    this._listeners = new Map();
    this._tasks = new Map();

    const { tasks } = options;

    if (tasks && !Array.isArray(tasks)) {
      const message = 'Tasks must be an array of option objects';
      throw new ParameterError(message);
    }

    for (const event of EVENTS.keys()) {
      this._listeners.set(event, (...args) => {
        this.emit(event, ...args);
      });
    }

    for (const taskOptions of tasks || []) {
      this.add(taskOptions);
    }
  }

  /**
   * Add a task. Start tracking its object and pipe its events
   *
   * @param {object} options - Task options
   * @returns {Manager} - This
   */
  add(options) {
    if (!options || typeof options !== 'object') {
      const message = 'Task options must be an object';
      throw new ParameterError(message);
    }

    let { type } = options;
    if (type === null || type === undefined) {
      type = DEFAULT_TASK_TYPE;
    }

    let ctor;
    switch (type) {
      case 'heartbeat':
        ctor = Heartbeat;
        break;
      case 'reactor':
        ctor = Reactor;
        break;
      default:
        throw new ParameterError(`Task type '${type}' is invalid`);
    }

    const task = new ctor(options);
    if (this._tasks.has(task.name)) {
      throw new ParameterError(`Task '${task.name}' is added already`);
    }

    this._tasks.set(task.name, task);
    this.subscribe(task.name);

    return this;
  }

  /**
   * Get a task object. Does not return anything if it is unknown to Manager
   *
   * @param {string} task - Name of the task
   * @returns {*} - Task or nothing, if unknown
   */
  get(task) {
    return this._tasks.get(task);
  }

  /**
   * Check if Manager tracks a task object
   *
   * @param {string} task - Name of the task
   * @returns {boolean} - Whether the task is known or not
   */
  has(task) {
    return this._tasks.has(task);
  }

  /**
   * Delete a task. Stops tracking its object and unsubscribes its events.
   * Does not automatically stop the task. Returns true if the task was
   * deleted and false if it is unknown
   *
   * @param {string} task - Name of the task
   * @returns {boolean} - Whether the task was deleted or not
   */
  delete(task) {
    if (!this._tasks.has(task)) {
      return false;
    }

    this.unsubscribe(task);
    this._tasks.delete(task);

    return true;
  }

  /**
   * Pipe the events from a task into the flow of events of this Manager.
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
   * @returns {Manager} - This
   */
  subscribe(task, event) {
    const taskObject = this._tasks.get(task);
    if (!taskObject) {
      const message = `Task '${task}' has not been added yet`;
      throw new ParameterError(message);
    }

    if (event && !EVENTS.has(event)) {
      const message = `Event '${event}' is invalid`;
      throw new ParameterError(message);
    }

    const events = event ? [event] : EVENTS;
    for (const event of events) {
      const listener = this._listeners.get(event);
      const listeners = taskObject.listeners(event);
      if (!listeners.includes(listener)) {
        taskObject.on(event, listener);
      }
    }

    return this;
  }

  /**
   * Unpipe the events from a task from the flow of events of this Manager.
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
   * @returns {Manager} - This
   */
  unsubscribe(task, event) {
    if (event && !EVENTS.has(event)) {
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
      const pipe = this._listeners.get(event);
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
   * Start the execution of the task according to its schedule.
   * Throws if the task is unknown
   *
   * @param {string} [task] - Name of the task
   * @returns {Manager} - This
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
   * the promise constructor is not set up on the Manager and done callback is
   * not provided either, this method just stops the task(s) silently
   *
   * @param {string} [task] - Name of the task
   * @returns {*} - Promise or nothing
   */
  async stop(task) {
    if (task) {
      const taskObject = this._tasks.get(task);
      if (!taskObject) {
        const message = `Task '${task}' has not been added yet`;
        throw new ParameterError(message);
      }

      return taskObject.stop();
    }

    const promises = [];
    for (const task of this._tasks.values()) {
      const promise = task.stop();
      promises.push(promise);
    }

    await Promise.all(promises);
  }
}
