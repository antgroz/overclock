'use strict';

const Base = require('./base');
const is = require('./is');
const { OCK_ERR_TSK_PARAM_HRT_INTVL_INVALID } = require('./errors');
const { DEFAULT_HEARTBEAT_INTERVAL } = require('./constants');

class Heartbeat extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const { name, heartbeatIntervalMillis } = options;

    if (!is.nullishOrFiniteNonNegativeNumber(heartbeatIntervalMillis)) {
      throw new OCK_ERR_TSK_PARAM_HRT_INTVL_INVALID(
        heartbeatIntervalMillis,
        name
      );
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
   * @see {@link Base#_started}
   * @protected
   */
  _started() {
    this._interval = setInterval(() => {
      this._spawn();
    }, this._heartbeatIntervalMillis);

    super._started();

    this._spawn();
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

module.exports = Heartbeat;
