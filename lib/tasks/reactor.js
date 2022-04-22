'use strict';

const Base = require('./base');
const is = require('../util/is');

class Reactor extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const { reactorTimeoutMillis } = options;

    this._reactorTimeoutMillis = reactorTimeoutMillis;
  }

  get reactorTimeoutMillis() {
    return this._reactorTimeoutMillis;
  }

  _start() {
    this._spawn();

    super._start();
  }

  _tock(data) {
    super._tock(data);

    if (this._isStopping || this._isStopped) {
      return;
    }

    const callback = () => this._spawn();

    if (!is.nullish(this._reactorTimeoutMillis) && this._reactorTimeoutMillis > 0) {
      this._timeout = setTimeout(callback, this._reactorTimeoutMillis);
    } else {
      this._immediate = setImmediate(callback);
    }
  }
}

module.exports = Reactor;
