'use strict';

var Racer = require('./lib/principe');

/**
 * Initialize a new instance
 *
 * @param {object} options - Racer options
 * @returns {Racer} - New instance
 */
function taskracer(options) {
  return new Racer(options);
}

module.exports = taskracer;
module.exports.taskracer = taskracer;
module.exports.default = taskracer;
