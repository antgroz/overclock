const Base = require('./base');
const is = require('./is');
const { ParameterError } = require('./errors');
const { DEFAULT_REACTOR_TIMEOUT } = require('./constants');

class Reactor extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const { reactorTimeoutMillis } = options;

    if (!is.nullishOrFiniteNonNegativeNumber(reactorTimeoutMillis)) {
      const message =
        'Task reactor timeout must be a finite non-negative number';
      throw new ParameterError(message);
    }

    this._reactorTimeoutMillis =
      reactorTimeoutMillis ?? DEFAULT_REACTOR_TIMEOUT;
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

    this._timeout = setTimeout(() => {
      this._spawn();
    }, this._reactorTimeoutMillis);
  }
}

module.exports = Reactor;
