import { Base } from './base.js';

export class Heartbeat extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const { heartbeatIntervalMillis } = options;

    this._heartbeatIntervalMillis = heartbeatIntervalMillis ?? 1000;
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
   * Internal logic for stopping the task. Adds heartbeat interval cleanup
   *
   * @see {@link Base#_stop}
   * @protected
   */
  _stop() {
    clearInterval(this._interval);
    this._interval = null;

    super._stop();
  }
}
