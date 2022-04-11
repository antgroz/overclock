'use strict';

var Racer = require('./lib/racer');

/**
 * Initialize a new instance
 *
 * @param {object} params - Taskracer parameters
 * @returns {Racer} - New instance
 */
function taskracer(params) {
  return new Racer(params);
}

module.exports = taskracer;
module.exports.taskracer = taskracer;
module.exports.default = taskracer;
