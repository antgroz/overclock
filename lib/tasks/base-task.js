const { EventEmitter } = require('events');
const { LifecycleError, TimeoutError } = require('../util/errors');
const { EVENTS } = require('../constants');
const is = require('../util/is');

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle
 */
class BaseTask extends EventEmitter {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super();

    const {
      name,
      executable,
      concurrencyLimit,
      livenessThreshold,
      factoryCapacity,
      generationLimit,
      startTimeoutMillis,
      runTimeoutMillis,
      stopTimeoutMillis,
      gracefulTimeoutMillis,
    } = options;

    this._name = name;
    this._executable = executable;
    this._wrapper = async (options = {}) => this._executable(options);
    this._concurrencyLimit = concurrencyLimit;
    this._livenessThreshold = livenessThreshold;
    this._factoryCapacity = factoryCapacity;
    this._generationLimit = generationLimit;
    this._startTimeoutMillis = startTimeoutMillis;
    this._runTimeoutMillis = runTimeoutMillis;
    this._stopTimeoutMillis = stopTimeoutMillis;
    this._gracefulTimeoutMillis = gracefulTimeoutMillis;

    this._lifecycle = new EventEmitter();
    this._isStarting = false;
    this._isStarted = false;
    this._isStopping = false;
    this._isStopped = false;
    this._startingAt = null;
    this._startedAt = null;
    this._stoppingAt = null;
    this._stoppedAt = null;
    this._population = 0;
    this._generations = 0;
    this._immediate = null;
    this._timeout = null;

    for (const event of EVENTS) {
      this._lifecycle.on(event, (...args) => {
        this.emit(event, ...args);
      });
    }
  }

  get name() {
    return this._name;
  }

  get executable() {
    return this._executable;
  }

  get wrapper() {
    return this._wrapper;
  }

  get concurrencyLimit() {
    return this._concurrencyLimit;
  }

  get livenessThreshold() {
    return this._livenessThreshold;
  }

  get factoryCapacity() {
    return this._factoryCapacity;
  }

  get generationLimit() {
    return this._generationLimit;
  }

  get startTimeoutMillis() {
    return this._startTimeoutMillis;
  }

  get runTimeoutMillis() {
    return this._runTimeoutMillis;
  }

  get stopTimeoutMillis() {
    return this._stopTimeoutMillis;
  }

  get gracefulTimeoutMillis() {
    return this._gracefulTimeoutMillis;
  }

  get isStarting() {
    return this._isStarting;
  }

  get isStarted() {
    return this._isStarted;
  }

  get isStopping() {
    return this._isStopping;
  }

  get isStopped() {
    return this._isStopped;
  }

  get startingAt() {
    return this._startingAt;
  }

  get startedAt() {
    return this._startedAt;
  }

  get stoppingAt() {
    return this._stoppingAt;
  }

  get stoppedAt() {
    return this._stoppedAt;
  }

  get population() {
    return this._population;
  }

  get generations() {
    return this._generations;
  }

  /**
   * Entry point method for starting a task. Checks the state of the lifecycle
   * and throws in case invoking the start procedure would interfere with it.
   * Changes the state of the task, emits the `starting` event, and invokes
   * the internal `_start` method or schedules it if necessary
   */
  start() {
    // check if the lifecycle state does not allow us to start
    if (this._isStarting) {
      const message = 'Task is already starting';
      throw new LifecycleError(message);
    } else if (this._isStarted) {
      const message = 'Task is already started';
      throw new LifecycleError(message);
    }

    // change the state of the task
    this._isStarting = true;
    this._startingAt = new Date();

    this._lifecycle.emit('starting', { task: this });

    // delay the start if necessary
    const callback = () => this.start();
    if (this._startTimeoutMillis > 0) {
      this._timeout = setTimeout(callback, this._startTimeoutMillis);
    } else {
      this._immediate = setImmediate(callback);
    }
  }

  /**
   * Internal logic for starting the task. Changes the state of the task
   * and emits the `started` event. Subclasses have to extend or
   * re-implement this
   */
  _start() {
    // clear out the timeout and change state
    this._timeout = null;
    this._isStarting = false;
    this._isStarted = true;
    this._startedAt = new Date();
    this._isStopped = false;
    this._lifecycle.emit('started', { task: this });
  }

  _spawn() {
    this._lifecycle.emit('spawning', { task: this });

    let {
      _generationLimit,
      _concurrencyLimit,
      _livenessThreshold,
      _factoryCapacity,
      _population,
      _generations,
    } = this;

    const data = { task: this, error: null, result: 0 };
    if (_generationLimit === 0) {
      const message = 'spawning is inhibited by generation limit of 0';
      data.error = new LifecycleError(message);
    } else if (_concurrencyLimit === 0) {
      const message = 'spawning is inhibited by concurrency limit of 0';
      data.error = new LifecycleError(message);
    } else if (_livenessThreshold === 0) {
      const message = 'spawning is inhibited by liveness threshold of 0';
      data.error = new LifecycleError(message);
    } else if (_factoryCapacity === 0) {
      const message = 'spawning is inhibited by factory capacity of 0';
      data.error = new LifecycleError(message);
    } else if (_generationLimit > 0 && _generations >= _generationLimit) {
      const message = 'not spawning because generation limit is reached';
      data.error = new LifecycleError(message);
    } else if (_concurrencyLimit > 0 && _population >= _concurrencyLimit) {
      const message = 'not spawning because concurrency limit is reached';
      data.error = new LifecycleError(message);
    } else if (_livenessThreshold > 0 && _population >= _livenessThreshold) {
      const message = 'not spawning because liveness threshold is satisfied';
      data.error = new LifecycleError(message);
    } else {
      if (is.nullish(_concurrencyLimit) || _concurrencyLimit < 0) {
        _concurrencyLimit = Number.POSITIVE_INFINITY;
      }
      if (is.nullish(_factoryCapacity) || _factoryCapacity < 0) {
        _factoryCapacity = Number.POSITIVE_INFINITY;
      }

      let result = Math.min(_concurrencyLimit - _population, _factoryCapacity);
      if (!Number.isFinite(result)) {
        result = 1;
      }

      data.result = result;
    }

    for (let i = 0; i < data.result; i++) {
      this._tick();
    }

    this._generations++;
    this._lifecycle.emit('spawned', data);
  }

  /**
   * Start a new iteration of the task and set up means for
   * tracking its execution. Increments the running iteration count, emits
   * the `tick` event and runs the wrapped executable. At the end of execution,
   * it will collect data on the executed iteration and pass it to the internal
   * `_tock` method, which responds to finished executions
   */
  _tick() {
    const data = {
      task: this,
      tickAt: new Date(),
      tockAt: null,
      error: null,
      result: null,
    };

    this._population++;
    this._lifecycle.emit('tick', { task: this });

    this._run()
      .then((result) => [null, result])
      .catch((error) => [error, null])
      .then(([error, result]) => {
        data.tockAt = new Date();
        data.error = error;
        data.result = result;

        this._tock(data);
      });
  }

  async _run() {
    const options = {};
    const promises = [];

    if (!is.undefined(this._runTimeoutMillis) && this._runTimeoutMillis >= 0) {
      const abortController = new AbortController();
      options.signal = abortController.signal;

      const message = `Run timeout of ${this._runTimeoutMillis} ms reached`;
      const error = new TimeoutError(message);

      const timeoutPromise = new Promise((_, reject) => {
        const callback = () => {
          abortController.abort();
          reject(error);
        };

        if (this._runTimeoutMillis > 0) {
          setTimeout(callback, this._runTimeoutMillis);
        } else {
          setImmediate(callback);
        }
      });
      promises.push(timeoutPromise);
    }

    const successPromise = this._wrapper(options);
    promises.push(successPromise);

    return Promise.race(promises);
  }

  _tock(data) {
    this._population--;
    this._lifecycle.emit('tock', data);
  }

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
   */
  async _stop() {
    // if no iterations are running, we can just stop right away
    if (!this._population) {
      return this._lifecycle.emit('stopped', { task: this });
    }

    const options = {};
    const promises = [];

    // otherwise, schedule a report of a timeout error if the graceful
    // timeout is provided
    if (!is.nullish(this._gracefulTimeoutMillis)) {
      const abortController = new AbortController();
      options.signal = abortController.signal;

      const message = `Graceful timeout of ${this._gracefulTimeoutMillis} ms reached`;
      const error = new TimeoutError(message);

      const timeoutPromise = new Promise((_, reject) => {
        const callback = () => {
          abortController.abort();
          reject(error);
        };

        if (this._gracefulTimeoutMillis > 0) {
          this._timeout = setTimeout(callback, this._gracefulTimeoutMillis);
        } else {
          this._immediate = setImmediate(callback);
        }
      });

      promises.push(timeoutPromise);
    }

    const successPromise = new Promise((resolve) => {
      const listener = () => {
        if (this._population) {
          return;
        }

        this._lifecycle.removeListener('tock', listener);

        if (!this._isStopping) {
          return;
        }

        clearTimeout(this._timeout);
        this._timeout = null;
        clearImmediate(this._immediate);
        this._immediate = null;

        this._isStarting = false;
        this._isStarted = false;
        this._isStopping = false;
        this._isStopped = true;
        this._stoppedAt = new Date();
        this._lifecycle.emit('stopped', { task: this });
        resolve();
      };

      this._lifecycle.on('tock', listener);
    });

    promises.push(successPromise);

    return Promise.race(promises);
  }

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
   */
  async stop() {
    // check if the lifecycle state does not allow us to stop
    if (this._isStopping) {
      const message = 'Task cannot be stopped again while it is stopping';
      throw new LifecycleError(message);
    } else if (this._isStopped && !this._isStarting) {
      const message = 'Task is already stopped';
      throw new LifecycleError(message);
    }

    // change the state
    this._isStopping = true;
    this._stoppingAt = new Date();
    this._lifecycle.emit('stopping', { task: this });

    return new Promise((resolve, reject) => {
      const callback = () => {
        clearTimeout(this._timeout);
        this._timeout = null;
        clearImmediate(this._immediate);
        this._immediate = null;

        this._stop()
          .then(() => resolve())
          .catch((error) => reject(error));
      };

      if (this._stopTimeoutMillis > 0) {
        this._timeout = setTimeout(callback, this._stopTimeoutMillis);
      } else {
        this._immediate = setImmediate(callback);
      }
    });
  }
}

module.exports = BaseTask;
