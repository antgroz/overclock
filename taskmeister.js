'use strict';

var Meister = require('./lib/meister');

/**
 * Initialize a new instance
 *
 * @param {object} params - Taskmeister parameters
 * @returns {Meister} - New instance
 */
function taskmeister(params) {
  return new Meister(params);
}

module.exports = taskmeister;
module.exports.taskmeister = taskmeister;
module.exports.default = taskmeister;
