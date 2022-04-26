const Manager = require('./lib/manager');

/**
 * Initialize a new instance
 *
 * @param {object} [options] - Manager options
 * @returns {Manager} - New instance
 */
function overclock(options) {
  return new Manager(options);
}

module.exports = overclock;
module.exports.overclock = overclock;
module.exports.default = overclock;
