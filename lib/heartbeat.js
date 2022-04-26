import { Base } from './base.js';
import { isNullishOrFiniteNonNegativeNumber } from './is.js';
import { ParameterError } from './errors.js';
import { DEFAULT_HEARTBEAT_INTERVAL } from './constants.js';

export class Heartbeat extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const { heartbeatIntervalMillis } = options;

    if (!isNullishOrFiniteNonNegativeNumber(heartbeatIntervalMillis)) {
      const message =
        'Task heartbeat interval must be a finite non-negative number';
      throw new ParameterError(message);
    }

    this._heartbeatIntervalMillis =
      heartbeatIntervalMillis ?? DEFAULT_HEARTBEAT_INTERVAL;
  }

  /**
   * Heartbeat interval of the task
   *
   * @returns {number} - Heartbeat interval
   */
  get heartbeatIntervalMillis() {
    return this._heartbeatIntervalMillis;
  }

  /**
   * Internal logic for starting the task. Adds the scheduling
   * of the periodic spawning and spawning of the first generation
   *
   * @see {@link Base#_start}
   * @protected
   */
  _start() {
    this._interval = setInterval(() => {
      this._spawn();
    }, this.heartbeatIntervalMillis);

    this._spawn();

    super._start();
  }

  /**
   * Try stopping the task. Adds immediate cleanup of the heartbeat interval
   *
   * @see {@link Base#_tryStop}
   * @protected
   */
  async _tryStop() {
    clearInterval(this._interval);
    this._interval = null;

    return super._tryStop();
  }
}
