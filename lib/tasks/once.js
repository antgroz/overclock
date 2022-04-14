'use strict';

var Base = require('./base');

/**
 * Task that is only executed once
 *
 * @class
 * @param {object} options - Task parameters
 * @param {object} defaults - Default parameters
 */
function Once(options, defaults) {
  Base.call(this, options, defaults);
}

Once.prototype = Object.create(Base.prototype);
Once.prototype.constructor = Once;

Once.prototype._start = function () {
  Base.prototype._start.call(this);

  // that is all we really need here: to start one iteration of the task
  this._tick();
};

module.exports = Once;
