const { EventEmitter } = require('events');
const {
  OCK_ERR_TSK_PARAM_NAME_MISSING,
  OCK_ERR_TSK_PARAM_NAME_INVALID,
  OCK_ERR_TSK_PARAM_EXEC_MISSING,
  OCK_ERR_TSK_PARAM_EXEC_INVALID,
  OCK_ERR_TSK_PARAM_CONCUR_LIM_INVALID,
  OCK_ERR_TSK_PARAM_LIVE_THRESH_INVALID,
  OCK_ERR_TSK_PARAM_INIT_CAP_INVALID,
  OCK_ERR_TSK_PARAM_FAC_CAP_INVALID,
  OCK_ERR_TSK_PARAM_GEN_LIM_INVALID,
  OCK_ERR_TSK_PARAM_START_TMO_INVALID,
  OCK_ERR_TSK_PARAM_RUN_TMO_INVALID,
  OCK_ERR_TSK_PARAM_STOP_TMO_INVALID,
  OCK_ERR_TSK_PARAM_GRC_TMO_INVALID,
  OCK_ERR_TSK_LC_STOP_GEN_LIM_ZERO,
  OCK_ERR_TSK_LC_STOP_CONCUR_LIM_ZERO,
  OCK_ERR_TSK_LC_STOP_LIVE_THRESH_ZERO,
  OCK_ERR_TSK_LC_STOP_TOT_CAP_ZERO,
  OCK_ERR_TSK_LC_STOP_FAC_CAP_ZERO,
  OCK_ERR_TSK_LC_STOP_GEN_LIM_RCHD,
  OCK_ERR_TSK_LC_DLA_CONCUR_LIM_RCHD,
  OCK_ERR_TSK_LC_DLA_LIVE_THRESH_SAT,
  OCK_ERR_TSK_RUN_TMO,
  OCK_ERR_TSK_GRC_TMO,
} = require('./errors');
const {
  kSpawned,
  kSpawning,
  kStarted,
  kStarting,
  kStopped,
  kStopping,
  kTick,
  kTock,
} = require('./symbols');
const is = require('./is');
const {
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_FACTORY_CAPACITY,
  DEFAULT_GENERATION_LIMIT,
  DEFAULT_GRACE_TIMEOUT,
  DEFAULT_LIVENESS_THRESHOLD,
  DEFAULT_RUN_TIMEOUT,
  DEFAULT_START_TIMEOUT,
  DEFAULT_STOP_TIMEOUT,
  DEFAULT_INITIAL_CAPACITY,
} = require('./constants');

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle
 */
class Base extends EventEmitter {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super();
    this.setMaxListeners(0);

    const {
      name,
      executable,
      concurrencyLimit,
      livenessThreshold,
      initialCapacity,
      factoryCapacity,
      generationLimit,
      startTimeoutMillis,
      runTimeoutMillis,
      stopTimeoutMillis,
      graceTimeoutMillis,
    } = options;

    if (name === undefined) {
      throw new OCK_ERR_TSK_PARAM_NAME_MISSING();
    } else if (typeof name !== 'string' || !name) {
      throw new OCK_ERR_TSK_PARAM_NAME_INVALID(name);
    } else if (executable === undefined) {
      throw new OCK_ERR_TSK_PARAM_EXEC_MISSING();
    } else if (typeof executable !== 'function') {
      throw new OCK_ERR_TSK_PARAM_EXEC_INVALID(executable, name);
    } else if (!is.nullishOrInteger(concurrencyLimit)) {
      throw new OCK_ERR_TSK_PARAM_CONCUR_LIM_INVALID(concurrencyLimit, name);
    } else if (!is.nullishOrInteger(livenessThreshold)) {
      throw new OCK_ERR_TSK_PARAM_LIVE_THRESH_INVALID(livenessThreshold, name);
    } else if (!is.nullishOrInteger(initialCapacity)) {
      throw new OCK_ERR_TSK_PARAM_INIT_CAP_INVALID(initialCapacity, name);
    } else if (!is.nullishOrInteger(factoryCapacity)) {
      throw new OCK_ERR_TSK_PARAM_FAC_CAP_INVALID(factoryCapacity, name);
    } else if (!is.nullishOrInteger(generationLimit)) {
      throw new OCK_ERR_TSK_PARAM_GEN_LIM_INVALID(generationLimit, name);
    } else if (!is.nullishOrFiniteNonNegativeNumber(startTimeoutMillis)) {
      throw new OCK_ERR_TSK_PARAM_START_TMO_INVALID(startTimeoutMillis, name);
    } else if (!is.nullishOrFiniteNumber(runTimeoutMillis)) {
      throw new OCK_ERR_TSK_PARAM_RUN_TMO_INVALID(runTimeoutMillis, name);
    } else if (!is.nullishOrFiniteNonNegativeNumber(stopTimeoutMillis)) {
      throw new OCK_ERR_TSK_PARAM_STOP_TMO_INVALID(stopTimeoutMillis, name);
    } else if (!is.nullishOrFiniteNumber(graceTimeoutMillis)) {
      throw new OCK_ERR_TSK_PARAM_GRC_TMO_INVALID(graceTimeoutMillis, name);
    }

    this._name = name;
    this._executable = executable;
    this._concurrencyLimit = concurrencyLimit ?? DEFAULT_CONCURRENCY_LIMIT;
    this._livenessThreshold = livenessThreshold ?? DEFAULT_LIVENESS_THRESHOLD;
    this._initialCapacity =
      initialCapacity ?? factoryCapacity ?? DEFAULT_INITIAL_CAPACITY;
    this._factoryCapacity = factoryCapacity ?? DEFAULT_FACTORY_CAPACITY;
    this._generationLimit = generationLimit ?? DEFAULT_GENERATION_LIMIT;
    this._startTimeoutMillis = startTimeoutMillis ?? DEFAULT_START_TIMEOUT;
    this._runTimeoutMillis = runTimeoutMillis ?? DEFAULT_RUN_TIMEOUT;
    this._stopTimeoutMillis = stopTimeoutMillis ?? DEFAULT_STOP_TIMEOUT;
    this._graceTimeoutMillis = graceTimeoutMillis ?? DEFAULT_GRACE_TIMEOUT;

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
    this._promise = null;
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
   * Initial capacity of the task
   *
   * @returns {number} - Initial capacity
   */
  get initialCapacity() {
    return this._initialCapacity;
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
   * Grace timeout of the task
   *
   * @returns {number} - Grace timeout
   */
  get graceTimeoutMillis() {
    return this._graceTimeoutMillis;
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
   * Enter the starting phase of lifecycle
   *
   * @protected
   */
  _starting() {
    this._isStarting = true;
    this._startingAt = new Date();

    this.emit(kStarting);
    this.emit('starting', { task: this });
  }

  /**
   * Enter the started phase of lifecycle
   *
   * @protected
   */
  _started() {
    this._timeout = null;
    this._isStarting = false;
    this._isStarted = true;
    this._startedAt = new Date();
    this._isStopped = false;

    this.emit(kStarted);
    this.emit('started', { task: this });
  }

  /**
   * Enter the stopping phase of lifecycle
   *
   * @protected
   */
  _stopping() {
    this._isStopping = true;
    this._stoppingAt = new Date();

    this.emit(kStopping);
    this.emit('stopping', { task: this });
  }

  /**
   * Enter the stopped phase of lifecycle
   *
   * @protected
   */
  _stopped() {
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
   * Start the task. Checks the state of the lifecycle and throws in case
   * starting the task again would interfere with it. Moves the task
   * into the starting phase and schedules the move into the started phase
   */
  start() {
    // check if the lifecycle state does not allow us to start
    if (this._isStarting || this._isStarted) {
      return;
    }

    // change the state of the task
    this._starting();

    // delay the start
    this._timeout = setTimeout(() => {
      this._started();
    }, this._startTimeoutMillis);
  }

  /**
   * Method for spawning a new generation of executables. Checks the
   * configured limits and either finishes with an error, when no spawning
   * can be performed, or with the number of new executables being launched.
   * In case no further spawns can be performed, moves the task into
   * the stopping phase
   *
   * @protected
   */
  _spawn() {
    this.emit(kSpawning);
    this.emit('spawning', { task: this });

    const {
      name,
      generationLimit,
      concurrencyLimit,
      livenessThreshold,
      initialCapacity,
      factoryCapacity,
      population,
      generations,
    } = this;

    let doStop = false;
    let error = null;
    let result = 0;

    if (generationLimit === 0) {
      error = new OCK_ERR_TSK_LC_STOP_GEN_LIM_ZERO(name);
      doStop = true;
    } else if (concurrencyLimit === 0) {
      error = new OCK_ERR_TSK_LC_STOP_CONCUR_LIM_ZERO(name);
      doStop = true;
    } else if (livenessThreshold === 0) {
      error = new OCK_ERR_TSK_LC_STOP_LIVE_THRESH_ZERO(name);
      doStop = true;
    } else if (initialCapacity === 0 && factoryCapacity === 0) {
      error = new OCK_ERR_TSK_LC_STOP_TOT_CAP_ZERO(name);
      doStop = true;
    } else if (generations && factoryCapacity === 0) {
      error = new OCK_ERR_TSK_LC_STOP_FAC_CAP_ZERO(name);
      doStop = true;
    } else if (generationLimit > 0 && generations >= generationLimit) {
      error = new OCK_ERR_TSK_LC_STOP_GEN_LIM_RCHD(name);
      doStop = true;
    } else if (concurrencyLimit > 0 && population >= concurrencyLimit) {
      error = new OCK_ERR_TSK_LC_DLA_CONCUR_LIM_RCHD(name, concurrencyLimit);
    } else if (livenessThreshold > 0 && population >= livenessThreshold) {
      error = new OCK_ERR_TSK_LC_DLA_LIVE_THRESH_SAT(name, livenessThreshold);
    } else {
      let capacity = generations ? factoryCapacity : initialCapacity;

      if (!(capacity > 0)) {
        capacity = Number.POSITIVE_INFINITY;
      }

      const limit =
        concurrencyLimit > 0 ? concurrencyLimit : Number.POSITIVE_INFINITY;

      result = Math.min(limit - population, capacity);
      if (!Number.isFinite(result)) {
        result = 1;
      }

      for (let i = 0; i < result; i++) {
        this._tick();
      }

      this._generations++;
    }

    const data = { task: this, error, result };
    this.emit(kSpawned, data);
    this.emit('spawned', data);

    if (doStop) {
      this._stopping();
      void this._tryStop();
    }
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
   * to the executable in case abort signal and abort controller are supported
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

      const { name, runTimeoutMillis } = this;
      const error = new OCK_ERR_TSK_RUN_TMO(name, runTimeoutMillis);

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
   * Try to stop the task within the specified grace timeout.
   *
   * In case no iterations are currently running, we can optimize and move
   * the task into the stopped phase right away. Otherwise, we have to wait
   * for the running iterations to complete, after which we can actually
   * move the task into the stopped phase.
   *
   * Since each iteration finishes with invoking the `_tock` method,
   * we use that and attach a listener to the private tock event.
   * Thus, after each finished execution, we will check if the task
   * is being stopped and if there are no running iterations detected.
   * If both of these conditions hold true, we detach the listener
   * and proceed with moving the task into the stopped phase
   *
   * @protected
   */
  async _tryStop() {
    // if no iterations are running, we can just stop right away
    if (!this._population) {
      return this._stopped();
    }

    const promises = [];

    // otherwise, schedule a report of a timeout error if the grace
    // timeout is provided
    if (this._graceTimeoutMillis >= 0) {
      const { name, graceTimeoutMillis } = this;
      const error = new OCK_ERR_TSK_GRC_TMO(name, graceTimeoutMillis);

      const timeoutPromise = new Promise((_, reject) => {
        this._timeout = setTimeout(() => {
          reject(error);
        }, this._graceTimeoutMillis);
      });

      promises.push(timeoutPromise);
    }

    const successPromise = new Promise((resolve) => {
      this.on(kTock, () => {
        if (this._population) {
          return;
        }

        this.removeAllListeners(kTock);
        this._stopped();
        resolve();
      });
    });

    promises.push(successPromise);

    return Promise.race(promises);
  }

  /**
   * Start the task. Checks the state of the lifecycle and throws in case
   * stopping the task again would interfere with it. Moves the task
   * into the stopping phase and schedules a try to move the task into the
   * stopped phase.
   *
   * Returns a promise that resolves if the task could be stopped within
   * the grace timeout or rejects if it could not. Regardless of the
   * outcome of the promise, the task will be stopped eventually
   */
  async stop() {
    // check if the task is being stopped right at this moment
    if (this._promise) {
      return this._promise;
    }

    // check if the lifecycle state does not allow us to stop
    if (this._isStopped && !this._isStarting) {
      return;
    }

    // change the state
    this._stopping();

    this._promise = new Promise((resolve, reject) => {
      this._timeout = setTimeout(() => {
        clearTimeout(this._timeout);
        this._timeout = null;
        this._tryStop()
          .then(() => {
            this._promise = null;
            resolve();
          })
          .catch((error) => {
            this._promise = null;
            reject(error);
          });
      }, this._stopTimeoutMillis);
    });

    return this._promise;
  }
}

module.exports = Base;
