import { EventEmitter } from 'events';
import { LifecycleError, ParameterError, TimeoutError } from './errors.js';
import {
  kSpawned,
  kSpawning,
  kStarted,
  kStarting,
  kStopped,
  kStopping,
  kTick,
  kTock,
} from './symbols.js';
import {
  isNullishOrFiniteNonNegativeNumber,
  isNullishOrFiniteNumber,
  isNullishOrInteger,
} from './is.js';
import {
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_FACTORY_CAPACITY,
  DEFAULT_GENERATION_LIMIT,
  DEFAULT_GRACEFUL_TIMEOUT,
  DEFAULT_LIVENESS_THRESHOLD,
  DEFAULT_RUN_TIMEOUT,
  DEFAULT_START_TIMEOUT,
  DEFAULT_STOP_TIMEOUT,
} from './constants.js';

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle
 */
export class Base extends EventEmitter {
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

    if (!name || typeof name !== 'string') {
      throw new ParameterError('Task name must be a non-empty string');
    }
    if (!executable || typeof executable !== 'function') {
      throw new ParameterError('Task executable must be a function');
    }
    if (!isNullishOrInteger(concurrencyLimit)) {
      throw new ParameterError('Task concurrency limit must be an integer');
    }
    if (!isNullishOrInteger(livenessThreshold)) {
      throw new ParameterError('Task liveness threshold must be an integer');
    }
    if (!isNullishOrInteger(factoryCapacity)) {
      throw new ParameterError('Task factory capacity must be an integer');
    }
    if (!isNullishOrInteger(generationLimit)) {
      throw new ParameterError('Task generation limit must be an integer');
    }
    if (!isNullishOrFiniteNonNegativeNumber(startTimeoutMillis)) {
      const message = 'Task start timeout must be a finite non-negative number';
      throw new ParameterError(message);
    }
    if (!isNullishOrFiniteNumber(runTimeoutMillis)) {
      const message = 'Task run timeout must be a finite number';
      throw new ParameterError(message);
    }
    if (!isNullishOrFiniteNonNegativeNumber(stopTimeoutMillis)) {
      const message = 'Task stop timeout must be a finite non-negative number';
      throw new ParameterError(message);
    }
    if (!isNullishOrFiniteNumber(gracefulTimeoutMillis)) {
      const message = 'Task graceful timeout must be a finite number';
      throw new ParameterError(message);
    }

    this._name = name;
    this._executable = executable;
    this._concurrencyLimit = concurrencyLimit ?? DEFAULT_CONCURRENCY_LIMIT;
    this._livenessThreshold = livenessThreshold ?? DEFAULT_LIVENESS_THRESHOLD;
    this._factoryCapacity = factoryCapacity ?? DEFAULT_FACTORY_CAPACITY;
    this._generationLimit = generationLimit ?? DEFAULT_GENERATION_LIMIT;
    this._startTimeoutMillis = startTimeoutMillis ?? DEFAULT_START_TIMEOUT;
    this._runTimeoutMillis = runTimeoutMillis ?? DEFAULT_RUN_TIMEOUT;
    this._stopTimeoutMillis = stopTimeoutMillis ?? DEFAULT_STOP_TIMEOUT;
    this._gracefulTimeoutMillis =
      gracefulTimeoutMillis ?? DEFAULT_GRACEFUL_TIMEOUT;

    this._wrapper = async (options = {}) => this._executable(options);
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
    this._ticks = 0;
    this._tocks = 0;
    this._timeout = null;
  }

  /**
   * Name of the task
   *
   * @returns {string} - Name
   */
  get name() {
    return this._name;
  }

  /**
   * Task executable
   *
   * @returns {Function} - Executable
   */
  get executable() {
    return this._executable;
  }

  /**
   * Concurrency limit of the task
   *
   * @returns {number} - Concurrency limit
   */
  get concurrencyLimit() {
    return this._concurrencyLimit;
  }

  /**
   * Liveness threshold of the task
   *
   * @returns {number} - Liveness threshold
   */
  get livenessThreshold() {
    return this._livenessThreshold;
  }

  /**
   * Factory capacity of the task
   *
   * @returns {number} - Factory capacity
   */
  get factoryCapacity() {
    return this._factoryCapacity;
  }

  /**
   * Generation limit of the task
   *
   * @returns {number} - Generation limit
   */
  get generationLimit() {
    return this._generationLimit;
  }

  /**
   * Start timeout of the task
   *
   * @returns {number} - Start timeout
   */
  get startTimeoutMillis() {
    return this._startTimeoutMillis;
  }

  /**
   * Run timeout of the task
   *
   * @returns {number} - Run timeout
   */
  get runTimeoutMillis() {
    return this._runTimeoutMillis;
  }

  /**
   * Stop timeout of the task
   *
   * @returns {number} - Stop timeout
   */
  get stopTimeoutMillis() {
    return this._stopTimeoutMillis;
  }

  /**
   * Graceful timeout of the task
   *
   * @returns {number} - Graceful timeout
   */
  get gracefulTimeoutMillis() {
    return this._gracefulTimeoutMillis;
  }

  /**
   * Is the task starting
   *
   * @returns {boolean} - Is
   */
  get isStarting() {
    return this._isStarting;
  }

  /**
   * Is the task started
   *
   * @returns {boolean} - Is
   */
  get isStarted() {
    return this._isStarted;
  }

  /**
   * Is the task stopping
   *
   * @returns {boolean} - Is
   */
  get isStopping() {
    return this._isStopping;
  }

  /**
   * Is the task stopped
   *
   * @returns {boolean} - Is
   */
  get isStopped() {
    return this._isStopped;
  }

  /**
   * When the task was last starting
   *
   * @returns {Date | null} - Date or null
   */
  get startingAt() {
    return this._startingAt;
  }

  /**
   * When the task was last started
   *
   * @returns {Date | null} - Date or null
   */
  get startedAt() {
    return this._startedAt;
  }

  /**
   * When the task was last stopping
   *
   * @returns {Date | null} - Date or null
   */
  get stoppingAt() {
    return this._stoppingAt;
  }

  /**
   * When the task was last stopped
   *
   * @returns {Date | null} - Date or null
   */
  get stoppedAt() {
    return this._stoppedAt;
  }

  /**
   * Total population of running executions
   *
   * @returns {number} - Number
   */
  get population() {
    return this._population;
  }

  /**
   * Total number of produced generations
   *
   * @returns {number} - Number
   */
  get generations() {
    return this._generations;
  }

  /**
   * Total number of ticks
   *
   * @returns {number} - Number
   */
  get ticks() {
    return this._ticks;
  }

  /**
   * Total number of tocks
   *
   * @returns {number} - Number
   */
  get tocks() {
    return this._tocks;
  }

  /**
   * Entry point method for starting a task. Checks the state of the lifecycle
   * and throws in case invoking the start procedure would interfere with it.
   * Changes the state of the task, emits the `starting` event, and schedules
   * the internal `_start` method
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

    this.emit(kStarting);
    this.emit('starting', { task: this });

    // delay the start
    this._timeout = setTimeout(() => {
      this._start();
    }, this._startTimeoutMillis);
  }

  /**
   * Internal logic for starting the task. Changes the state of the task
   * and emits the `started` event. Subclasses have to extend or
   * re-implement this
   *
   * @protected
   */
  _start() {
    // clear out the timeout and change state
    this._timeout = null;
    this._isStarting = false;
    this._isStarted = true;
    this._startedAt = new Date();
    this._isStopped = false;
    this.emit(kStarted);
    this.emit('started', { task: this });
  }

  /**
   * Method for spawning a new generation of executables. Checks the
   * configured limits and either finishes with an error, when no spawning
   * can be performed, or with the number of new executables being launched
   *
   * @protected
   */
  _spawn() {
    this.emit(kSpawning);
    this.emit('spawning', { task: this });

    let {
      generationLimit,
      concurrencyLimit,
      livenessThreshold,
      factoryCapacity,
      population,
      generations,
    } = this;

    const data = { task: this, error: null, result: 0 };
    if (generationLimit === 0) {
      const message = 'Spawning is inhibited by generation limit of 0';
      data.error = new LifecycleError(message);
    } else if (concurrencyLimit === 0) {
      const message = 'Spawning is inhibited by concurrency limit of 0';
      data.error = new LifecycleError(message);
    } else if (livenessThreshold === 0) {
      const message = 'Spawning is inhibited by liveness threshold of 0';
      data.error = new LifecycleError(message);
    } else if (factoryCapacity === 0) {
      const message = 'Spawning is inhibited by factory capacity of 0';
      data.error = new LifecycleError(message);
    } else if (generationLimit > 0 && generations >= generationLimit) {
      const message = 'Not spawning because generation limit is reached';
      data.error = new LifecycleError(message);
    } else if (concurrencyLimit > 0 && population >= concurrencyLimit) {
      const message = 'Not spawning because concurrency limit is reached';
      data.error = new LifecycleError(message);
    } else if (livenessThreshold > 0 && population >= livenessThreshold) {
      const message = 'Not spawning because liveness threshold is satisfied';
      data.error = new LifecycleError(message);
    } else {
      if (!(concurrencyLimit > 0)) {
        concurrencyLimit = Number.POSITIVE_INFINITY;
      }
      if (!(factoryCapacity > 0)) {
        factoryCapacity = Number.POSITIVE_INFINITY;
      }

      let result = Math.min(concurrencyLimit - population, factoryCapacity);
      if (!Number.isFinite(result)) {
        result = 1;
      }

      data.result = result;

      for (let i = 0; i < data.result; i++) {
        this._tick();
      }

      this._generations++;
    }

    this.emit(kSpawned, data);
    this.emit('spawned', data);
  }

  /**
   * Start a new iteration of the task and set up means for
   * tracking its execution. Increments the running iteration count, emits
   * the `tick` event and runs the wrapped executable. At the end of execution,
   * it will collect data on the executed iteration and pass it to the internal
   * `_tock` method, which responds to finished executions
   *
   * @protected
   */
  _tick() {
    const data = {
      task: this,
      tickAt: new Date(),
      tockAt: null,
      error: null,
      result: null,
    };

    this._ticks++;
    this._population++;
    this.emit(kTick, data);
    this.emit('tick', data);

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

  /**
   * Run the wrapper and limit the time of its execution, in case run timeout
   * is specified. The timeout is communicated via an abort signal passed
   * to the executable
   *
   * @protected
   */
  async _run() {
    const options = {};
    const promises = [];

    if (this._runTimeoutMillis >= 0) {
      let abortController;
      if (global.AbortController) {
        abortController = new AbortController();
        options.signal = abortController.signal;
      }

      const message = `Run timeout of ${this._runTimeoutMillis} ms reached`;
      const error = new TimeoutError(message);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          if (abortController) {
            abortController.abort();
          }
          reject(error);
        }, this._runTimeoutMillis);
      });
      promises.push(timeoutPromise);
    }

    const successPromise = this._wrapper(options);
    promises.push(successPromise);

    return Promise.race(promises);
  }

  /**
   * Respond to the end of execution of an iteration
   *
   * @param {object} data - Object with info on the execution
   * @see {@link Base#_tick}
   * @protected
   */
  _tock(data) {
    this._tocks++;
    this._population--;

    this.emit(kTock, data);
    this.emit('tock', data);
  }

  /**
   * Internal logic for stopping the task. Changes the state of the task
   * and emits the `stopped` event. Subclasses can extend or
   * re-implement this
   *
   * @protected
   */
  _stop() {
    clearTimeout(this._timeout);
    this._timeout = null;

    this._isStarting = false;
    this._isStarted = false;
    this._isStopping = false;
    this._isStopped = true;
    this._stoppedAt = new Date();
    this.emit(kStopped);
    this.emit('stopped', { task: this });
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
   *
   * @protected
   */
  async _tryStop() {
    // if no iterations are running, we can just stop right away
    if (!this._population) {
      return this._stop();
    }

    const promises = [];

    // otherwise, schedule a report of a timeout error if the graceful
    // timeout is provided
    if (this._gracefulTimeoutMillis >= 0) {
      const message = `Graceful timeout of ${this._gracefulTimeoutMillis} ms reached`;
      const error = new TimeoutError(message);

      const timeoutPromise = new Promise((_, reject) => {
        this._timeout = setTimeout(() => {
          reject(error);
        }, this._gracefulTimeoutMillis);
      });

      promises.push(timeoutPromise);
    }

    const successPromise = new Promise((resolve) => {
      this.on(kTock, () => {
        if (this._population) {
          return;
        }

        this.removeAllListeners(kTock);
        this._stop();
        resolve();
      });
    });

    promises.push(successPromise);

    return Promise.race(promises);
  }

  /**
   * Entry point method for stopping a task. Wraps the `_stop` method
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
    this.emit(kStopping);
    this.emit('stopping', { task: this });

    return new Promise((resolve, reject) => {
      this._timeout = setTimeout(() => {
        clearTimeout(this._timeout);
        this._timeout = null;
        this._tryStop()
          .then(() => resolve())
          .catch((error) => reject(error));
      }, this._stopTimeoutMillis);
    });
  }
}
