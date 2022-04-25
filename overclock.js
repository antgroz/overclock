'use strict';

const Principe = require('./lib/principe');

/**
 * Initialize a new instance
 *
 * @param {object} options - Racer options
 * @returns {Principe} - New instance
 */
function popolo(options) {
  return new Principe(options);
}

module.exports = popolo;
module.exports.popolo = popolo;
module.exports.default = popolo;
