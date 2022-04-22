const is = require('./util/is');
const { ParameterError } = require('./util/errors');
const Heartbeat = require('./tasks/heartbeat');
const Reactor = require('./tasks/reactor');

/**
 * Create a new task from options
 *
 * @param {object} options - Task options
 * @returns {Heartbeat | Reactor} - Task object
 */
exports.createTask = function(options) {
  if (!is.object(options)) {
    const message = 'Task options must be an object';
    throw new ParameterError(message);
  }

  const { type } = options;
  if (type === 'heartbeat') return new Heartbeat(options);
  if (type === 'reactor') return new Reactor(options);

  const message = `Task type '${type}' is invalid`;
  throw new ParameterError(message);
};
