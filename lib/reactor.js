'use strict';

const Base = require('./base');
const is = require('./is');
const {
  OCK_ERR_TSK_PARAM_RCT_TMO_INVALID,
  OCK_ERR_TSK_LC_STOP_RCT_BRC_LIM_ZERO,
  OCK_ERR_TSK_PARAM_RCT_BRC_LIM_INVALID,
  OCK_ERR_TSK_LC_DLA_RCT_BRC_LIM_RCHD,
} = require('./errors');
const { DEFAULT_REACTOR_TIMEOUT } = require('./constants');

class Reactor extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const {
      name,
      concurrencyLimit,
      reactorTimeoutMillis,
      reactorBranchingLimit,
    } = options;

    if (!is.nullishOrFiniteNonNegativeNumber(reactorTimeoutMillis)) {
      throw new OCK_ERR_TSK_PARAM_RCT_TMO_INVALID(reactorTimeoutMillis, name);
    } else if (!is.nullishOrInteger(reactorBranchingLimit)) {
      throw new OCK_ERR_TSK_PARAM_RCT_BRC_LIM_INVALID(
        reactorBranchingLimit,
        name
      );
    }

    this._reactorTimeoutMillis =
      reactorTimeoutMillis ?? DEFAULT_REACTOR_TIMEOUT;
    this._reactorBranchingLimit = reactorBranchingLimit ?? concurrencyLimit;

    this._timeouts = new Set();
  }

  /**
   * Reactor timeout of the task
   *
   * @returns {number} - Reactor timeout
   */
  get reactorTimeoutMillis() {
    return this._reactorTimeoutMillis;
  }

  /**
   * Reactor branching limit of the task
   *
   * @returns {number} - Reactor branching limit
   */
  get reactorBranchingLimit() {
    return this._reactorBranchingLimit;
  }

  /**
   * Internal logic for starting the task. Adds the spawning
   * of the first generation
   *
   * @see {@link Base#_started}
   * @protected
   */
  _started() {
    this._spawn();

    super._started();
  }

  /**
   * Respond to the end of execution of an iteration. Adds scheduling
   * of the spawning of the following generation
   *
   * @param {object} data - Object with info on the execution
   * @see {@link Base#_tick}
   * @see {@link Base#_tock}
   * @protected
   */
  _tock(data) {
    super._tock(data);

    // do not schedule if the task is stopped or being stopped
    if (this._isStopping || this._isStopped) {
      return;
    }

    const { name, reactorBranchingLimit } = this;

    let limit =
      reactorBranchingLimit < 0
        ? Number.POSITIVE_INFINITY
        : reactorBranchingLimit;

    if (limit === 0) {
      const error = new OCK_ERR_TSK_LC_STOP_RCT_BRC_LIM_ZERO(name);
      this._stopping({ error });
      void this._tryStop().catch(() => null);
    } else if (this._timeouts.size >= limit) {
      this._spawning();

      const error = new OCK_ERR_TSK_LC_DLA_RCT_BRC_LIM_RCHD(name, limit);
      this._spawned({ error });
    } else {
      const timeout = setTimeout(() => {
        this._timeouts.delete(timeout);
        this._spawn();
      }, this._reactorTimeoutMillis);

      this._timeouts.add(timeout);
    }
  }

  /**
   * Try stopping the task. Adds immediate cleanup of the heartbeat interval
   *
   * @see {@link Base#_tryStop}
   * @protected
   */
  async _tryStop() {
    for (const timeout of this._timeouts) {
      clearTimeout(timeout);
    }
    this._timeouts = new Set();

    return super._tryStop();
  }
}

module.exports = Reactor;
