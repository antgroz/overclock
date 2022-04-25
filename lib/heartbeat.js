'use strict';

const Base = require('./base');

class Heartbeat extends Base {
  /**
   * @param {object} options - Task options
   */
  constructor(options) {
    super(options);

    const { heartbeatIntervalMillis } = options;

    this._heartbeatIntervalMillis = heartbeatIntervalMillis;
  }

  get heartbeatIntervalMillis() {
    return this._heartbeatIntervalMillis;
  }

  _start() {
    this._interval = setInterval(() => {
      this._spawn();
    }, this.heartbeatIntervalMillis);

    this._spawn();

    super._start();
  }

  async _stop() {
    clearInterval(this._interval);
    this._interval = null;

    return super._stop();
  }
}

module.exports = Heartbeat;
