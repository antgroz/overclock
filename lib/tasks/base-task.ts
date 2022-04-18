import { EventEmitter } from 'events';
import { LifecycleError, TimeoutError } from '../util/errors';
import { EVENTS } from '../constants';
import { asyncify } from '../util/functions';
import * as is from '../util/is';

export type BaseTaskOptions<R> = {
  name: string;
  executable: () => R | Promise<R>;
  concurrencyLimit: number;
  livenessThreshold: number;
  factoryCapacity: number;
  generationLimit: number;
  startTimeoutMillis: number;
  runTimeoutMillis: number;
  stopTimeoutMillis: number;
  gracefulTimeoutMillis: number;
};

/**
 * Base class for all the tasks, regardless of the schedule type.
 * Sets up the core parts of the execution lifecycle
 */
export abstract class BaseTask<R>
  extends EventEmitter
  implements BaseTaskOptions<R>
{
  protected _lifecycle = new EventEmitter();
  protected _isStarting = false;
  protected _isStarted = false;
  protected _isStopping = false;
  protected _isStopped = false;
  protected _startingAt: Date | null = null;
  protected _startedAt: Date | null = null;
  protected _stoppingAt: Date | null = null;
  protected _stoppedAt: Date | null = null;
  protected _population = 0;
  protected _generations = 0;
  protected _timeout: NodeJS.Timeout | null = null;

  public name: string;
  public executable: () => R | Promise<R>;
  public concurrencyLimit: number;
  public livenessThreshold: number;
  public factoryCapacity: number;
  public generationLimit: number;
  public startTimeoutMillis: number;
  public runTimeoutMillis: number;
  public stopTimeoutMillis: number;
  public gracefulTimeoutMillis: number;

  /**
   * @param options - Task options
   */
  protected constructor(options: BaseTaskOptions<R>) {
    super();
    Object.assign(this, options);

    for (const event of EVENTS) {
      this._lifecycle.on(event, (...args) => {
        this.emit(event, ...args);
      });
    }
  }

  public get isStarting() {
    return this._isStarting;
  }

  public get isStarted() {
    return this._isStarted;
  }

  public get isStopping() {
    return this._isStopping;
  }

  public get isStopped() {
    return this._isStopped;
  }

  public get startingAt() {
    return this._startingAt;
  }

  public get startedAt() {
    return this._startedAt;
  }

  public get stoppingAt() {
    return this._stoppingAt;
  }

  public get stoppedAt() {
    return this._stoppedAt;
  }

  public get population() {
    return this._population;
  }

  public get generations() {
    return this._generations;
  }

  /**
   * Entry point method for starting a task. Checks the state of the lifecycle
   * and throws in case invoking the start procedure would interfere with it.
   * Changes the state of the task, emits the `starting` event, and invokes
   * the internal `_start` method or schedules it if necessary
   */
  public start() {
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
    this._timeout = setTimeout(() => {
      this._start();
    }, this.startTimeoutMillis || 0);
  }

  /**
   * Internal logic for starting the task. Changes the state of the task
   * and emits the `started` event. Subclasses have to extend or
   * re-implement this
   */
  protected _start() {
    // clear out the timeout and change state
    this._timeout = null;
    this._isStarting = false;
    this._isStarted = true;
    this._startedAt = new Date();
    this._isStopped = false;
    this._lifecycle.emit('started', { task: this });
  }

  protected _spawn() {
    this._lifecycle.emit('spawning', { task: this });

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
      const message = 'spawning is inhibited by generation limit of 0';
      data.error = new LifecycleError(message);
    } else if (concurrencyLimit === 0) {
      const message = 'spawning is inhibited by concurrency limit of 0';
      data.error = new LifecycleError(message);
    } else if (livenessThreshold === 0) {
      const message = 'spawning is inhibited by liveness threshold of 0';
      data.error = new LifecycleError(message);
    } else if (factoryCapacity === 0) {
      const message = 'spawning is inhibited by factory capacity of 0';
      data.error = new LifecycleError(message);
    } else if (generationLimit > 0 && generations >= generationLimit) {
      const message = 'not spawning because generation limit is reached';
      data.error = new LifecycleError(message);
    } else if (concurrencyLimit > 0 && population >= concurrencyLimit) {
      const message = 'not spawning because concurrency limit is reached';
      data.error = new LifecycleError(message);
    } else if (livenessThreshold > 0 && population >= livenessThreshold) {
      const message = 'not spawning because liveness threshold is satisfied';
      data.error = new LifecycleError(message);
    } else {
      if (is.nullish(concurrencyLimit) || concurrencyLimit < 0) {
        concurrencyLimit = Number.POSITIVE_INFINITY;
      }
      if (is.nullish(factoryCapacity) || factoryCapacity < 0) {
        factoryCapacity = Number.POSITIVE_INFINITY;
      }

      let result = Math.min(concurrencyLimit - population, factoryCapacity);
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
  protected _tick() {
    const data = {
      task: this,
      tickAt: new Date(),
      tockAt: null,
      error: null,
      result: null,
    };

    this._population++;
    this._lifecycle.emit('tick', { task: this });

    asyncify(this.executable)()
      .then((result) => [null, result])
      .catch((error) => [error, null])
      .then(([error, result]) => {
        data.tockAt = new Date();
        data.error = error;
        data.result = result;

        this._tock(data);
      });
  }

  protected _tock(data) {
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
  protected async _stop() {
    // if no iterations are running, we can just stop right away
    if (!this.population) {
      return;
    }

    const successPromise = new Promise<void>((resolve) => {
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

    const promises = [successPromise];

    // otherwise, schedule a report of a timeout error if the graceful
    // timeout is provided
    if (!is.nullish(this.gracefulTimeoutMillis)) {
      // we create the error ahead of the time to protect ourselves
      // from the value of the graceful timeout being replaced
      const message = `Graceful timeout of ${this.gracefulTimeoutMillis} ms reached`;
      const error = new TimeoutError(message);

      const failPromise = new Promise<void>((_, reject) => {
        this._timeout = setTimeout(() => {
          reject(error);
        }, this.gracefulTimeoutMillis);
      });

      promises.push(failPromise);
    }

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
  public async stop() {
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
      this._timeout = setTimeout(() => {
        this._timeout = null;
        this._stop()
          .then((result) => resolve(result))
          .catch((error) => reject(error));
      }, this.stopTimeoutMillis || 0);
    });
  }
}
